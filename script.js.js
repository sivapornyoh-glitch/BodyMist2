/* ==========================================================================
   Body Scent — Shared Application Script (product.html / order.html / admin.html)
   ========================================================================== */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxh6Bw57FjryLmdZUR0AgyVpP0k7oQoVF8rjm_8_5hsVSDjvoD8M_Jk6Ik2orLRyKQ0/exec';

const ORDERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPTEq6h7wmkBH6GKpiGTTN-GQrqvgAs8vb4cG2Fn3TrUE60xU06I7Y-hKipxz5jWDaktHFYIewMkXL/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});

/* ==========================================================================
   1. Product Catalog & Mood Filter (product.html)
   ========================================================================== */
function initProductPage() {
  const productListEl = document.getElementById('product-list');
  const filterBarEl = document.getElementById('filter-bar');

  if (!productListEl) return;

  const MOOD_OPTIONS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  const TYPE_LABELS = {
    spray: 'Body Spray',
    rollon: 'Roll-on'
  };

  let allProducts = [];

  // Read ?mood=xxx from URL parameter
  const params = new URLSearchParams(window.location.search);
  const rawMood = (params.get('mood') || 'all').toLowerCase().trim();
  const validMoods = MOOD_OPTIONS.map(m => m.key);
  let activeMood = validMoods.includes(rawMood) ? rawMood : 'all';

  // Render filter buttons inside #filter-bar
  function renderFilterButtons() {
    if (!filterBarEl) return;

    filterBarEl.innerHTML = MOOD_OPTIONS.map(mood => {
      const isActive = mood.key === activeMood ? 'active' : '';
      const dotHtml =
        mood.key !== 'all'
          ? `<span class="mood-dot ${mood.key}"></span>`
          : '';
      return `
        <button type="button" class="filter-btn ${isActive}" data-mood="${mood.key}">
          ${dotHtml}${mood.label}
        </button>
      `;
    }).join('');

    filterBarEl.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeMood = btn.dataset.mood;
        renderFilterButtons();
        renderProducts();
      });
    });
  }

  // Render filtered product cards inside #product-list
  function renderProducts() {
    const filtered =
      activeMood === 'all'
        ? allProducts
        : allProducts.filter(p => (p.mood || '').toLowerCase() === activeMood);

    if (filtered.length === 0) {
      productListEl.innerHTML =
        '<p style="grid-column: 1 / -1; text-align: center;">ไม่พบสินค้าในหมวดหมู่นี้</p>';
      return;
    }

    productListEl.innerHTML = filtered
      .map(product => {
        const moodKey = (product.mood || '').toLowerCase();
        const moodLabel =
          moodKey.charAt(0).toUpperCase() + moodKey.slice(1);
        const typeLabel = TYPE_LABELS[product.type] || product.type || '';
        const orderUrl = `order.html?item=${encodeURIComponent(
          product.name
        )}&price=${encodeURIComponent(product.price)}`;

        return `
          <article class="product-card">
            <div class="product-image-wrap">
              <span class="product-badge">
                <span class="mood-dot ${escapeHtml(moodKey)}"></span>${escapeHtml(moodLabel)}
              </span>
              <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
            </div>
            <div class="product-body">
              <div class="product-meta">
                <span>${escapeHtml(typeLabel)}</span>
                <span>ขนาด ${escapeHtml(product.size)}</span>
              </div>
              <h3 class="product-title">${escapeHtml(product.name)}</h3>
              <p class="product-desc">${escapeHtml(product.description || '')}</p>
              <div class="product-footer">
                <span class="product-price">${Number(product.price).toLocaleString()} บาท</span>
                <a href="${orderUrl}" class="btn btn-sm">สั่งซื้อ</a>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  renderFilterButtons();

  fetch('products.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลสินค้าได้');
      }
      return response.json();
    })
    .then(data => {
      allProducts = Array.isArray(data) ? data : [];
      renderProducts();
    })
    .catch(error => {
      console.error(error);
      productListEl.innerHTML =
        '<p style="grid-column: 1 / -1; text-align: center;">เกิดข้อผิดพลาดในการโหลดรายการสินค้า กรุณารีเฟรชหน้าใหม่อีกครั้ง</p>';
    });
}

/* ==========================================================================
   2. Order Form Prefill & Submission (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // Auto-fill item & price from URL parameters immediately on load
  const params = new URLSearchParams(window.location.search);
  const itemParam = params.get('item');
  const priceParam = params.get('price');

  if (itemsInput && itemParam !== null) {
    itemsInput.value = itemParam;
  }

  if (totalInput && priceParam !== null) {
    totalInput.value = priceParam;
  }

  if (!orderForm) return;

  orderForm.addEventListener('submit', e => {
    e.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังส่งคำสั่งซื้อ...';
    }

    const payload = {
      customerName: (document.getElementById('customerName')?.value || '').trim(),
      contact: (document.getElementById('contact')?.value || '').trim(),
      items: (document.getElementById('items')?.value || '').trim(),
      total: (document.getElementById('total')?.value || '').trim(),
      note: (document.getElementById('note')?.value || '').trim()
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
  });
}

/* ==========================================================================
   3. Admin Orders Table from Google Sheets CSV (admin.html)
   ========================================================================== */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align: center; padding: 2rem;">กำลังโหลดข้อมูลคำสั่งซื้อ...</td></tr>';

  fetch(ORDERS_CSV_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูล CSV ได้');
      }
      return response.text();
    })
    .then(csvText => {
      const rows = parseCSV(csvText);

      // Remove header row (index 0) and empty rows, then reverse to show latest first
      const dataRows = rows
        .slice(1)
        .filter(row => row.some(cell => cell.trim() !== ''))
        .reverse();

      if (dataRows.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="text-align: center; padding: 2rem;">ยังไม่มีรายการสั่งซื้อ</td></tr>';
        return;
      }

      tbody.innerHTML = '';

      dataRows.forEach(row => {
        const tr = document.createElement('tr');

        // Columns: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
        for (let i = 0; i < 6; i++) {
          const td = document.createElement('td');
          let cellValue = (row[i] || '').trim();

          // Format total amount (index 4) if numeric
          if (i === 4 && cellValue !== '' && !isNaN(Number(cellValue))) {
            cellValue = `${Number(cellValue).toLocaleString()} บาท`;
          }

          td.textContent = cellValue || '-';
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });
    })
    .catch(error => {
      console.error(error);
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; padding: 2rem;">เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ</td></tr>';
    });
}

/* ==========================================================================
   Custom CSV Parser (Supports quotes, escaped quotes "", commas & newlines)
   ========================================================================== */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++; // Skip \n
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/* ==========================================================================
   Helper: Escape HTML
   ========================================================================== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}