/* ============================================
   Wholesale Business Management System
   Application Logic (localStorage-based)
   ============================================ */

// ─── Data Store ──────────────────────────────────
const STORE_KEYS = {
  products:  'wbms_products',
  suppliers: 'wbms_suppliers',
  customers: 'wbms_customers',
  orders:    'wbms_orders',
  payments:  'wbms_payments',
};

function getData(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function nextId(arr) {
  return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1;
}

// ─── Toasts ──────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = (icons[type] || '') + ' ' + message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2800);
}

// ─── Navigation ──────────────────────────────────
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileToggle = document.getElementById('mobileToggle');

function navigateTo(page) {
  navLinks.forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-page="${page}"]`).classList.add('active');
  pageSections.forEach(s => s.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  // close mobile sidebar
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  // refresh relevant data
  refreshAll();
}

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

mobileToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('show');
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

// ─── Refresh All ─────────────────────────────────
function refreshAll() {
  refreshDashboard();
  refreshProductTable();
  refreshSupplierCards();
  refreshCustomerTable();
  refreshOrderTable();
  refreshPaymentTable();
  populateDropdowns();
}

// ─── Dashboard ───────────────────────────────────
function refreshDashboard() {
  const products  = getData(STORE_KEYS.products);
  const customers = getData(STORE_KEYS.customers);
  const orders    = getData(STORE_KEYS.orders);

  document.getElementById('totalProducts').textContent   = products.length;
  document.getElementById('totalCustomers').textContent  = customers.length;
  document.getElementById('totalOrders').textContent     = orders.length;

  const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('totalSales').textContent = '₹' + totalSales.toLocaleString('en-IN');

  // Recent orders
  const recentEl = document.getElementById('recentOrdersList');
  if (orders.length === 0) {
    recentEl.innerHTML = '<li class="empty-state"><div class="empty-icon">📋</div><p>No orders yet. Create your first order!</p></li>';
  } else {
    const recent = orders.slice(-5).reverse();
    recentEl.innerHTML = recent.map(o =>
      `<li><span class="item-name">#${o.id} — ${o.customerName}</span><span class="item-meta">₹${o.total.toLocaleString('en-IN')}</span></li>`
    ).join('');
  }

  // Low stock
  const lowStockEl = document.getElementById('lowStockList');
  const lowStock = products.filter(p => p.stock <= 10);
  if (lowStock.length === 0) {
    lowStockEl.innerHTML = '<li class="empty-state"><div class="empty-icon">✅</div><p>All products are well stocked.</p></li>';
  } else {
    lowStockEl.innerHTML = lowStock.map(p =>
      `<li><span class="item-name">${p.name}</span><span class="badge badge-warning">${p.stock} left</span></li>`
    ).join('');
  }
}

// ─── Dropdowns ───────────────────────────────────
function populateDropdowns() {
  const suppliers  = getData(STORE_KEYS.suppliers);
  const customers  = getData(STORE_KEYS.customers);
  const products   = getData(STORE_KEYS.products);
  const orders     = getData(STORE_KEYS.orders);

  // Product supplier dropdown
  const supSelect = document.getElementById('productSupplier');
  const currentSup = supSelect.value;
  supSelect.innerHTML = '<option value="">Select Supplier</option>' +
    suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  supSelect.value = currentSup;

  // Order customer dropdown
  const custSelect = document.getElementById('orderCustomer');
  const currentCust = custSelect.value;
  custSelect.innerHTML = '<option value="">Select Customer</option>' +
    customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  custSelect.value = currentCust;

  // Order product dropdown
  const prodSelect = document.getElementById('orderProduct');
  const currentProd = prodSelect.value;
  prodSelect.innerHTML = '<option value="">Select Product</option>' +
    products.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} (Stock: ${p.stock})</option>`).join('');
  prodSelect.value = currentProd;

  // Payment order dropdown
  const payOrderSelect = document.getElementById('paymentOrder');
  const currentPayOrder = payOrderSelect.value;
  const unpaid = orders.filter(o => o.status !== 'Paid');
  payOrderSelect.innerHTML = '<option value="">Select Order</option>' +
    unpaid.map(o => `<option value="${o.id}">#${o.id} — ${o.customerName} (₹${o.total.toLocaleString('en-IN')})</option>`).join('');
  payOrderSelect.value = currentPayOrder;
}

// ─── Auto-calc order total ───────────────────────
document.getElementById('orderProduct').addEventListener('change', calcOrderTotal);
document.getElementById('orderQuantity').addEventListener('input', calcOrderTotal);

function calcOrderTotal() {
  const sel = document.getElementById('orderProduct');
  const qty = parseInt(document.getElementById('orderQuantity').value) || 0;
  const opt = sel.options[sel.selectedIndex];
  const price = opt ? parseFloat(opt.dataset.price) || 0 : 0;
  document.getElementById('orderTotal').value = qty > 0 && price > 0 ? '₹' + (price * qty).toLocaleString('en-IN') : '—';
}

// ═══════════════════════════════════════════════
//  SUPPLIERS
// ═══════════════════════════════════════════════
document.getElementById('supplierForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const suppliers = getData(STORE_KEYS.suppliers);
  const editId = document.getElementById('supplierEditId').value;

  const entry = {
    name:    document.getElementById('supplierName').value.trim(),
    contact: document.getElementById('supplierContact').value.trim(),
    phone:   document.getElementById('supplierPhone').value.trim(),
    email:   document.getElementById('supplierEmail').value.trim(),
  };

  if (editId) {
    const idx = suppliers.findIndex(s => s.id === parseInt(editId));
    if (idx !== -1) { entry.id = parseInt(editId); suppliers[idx] = entry; }
    showToast('Supplier updated successfully');
    cancelSupplierEdit();
  } else {
    entry.id = nextId(suppliers);
    suppliers.push(entry);
    showToast('Supplier added successfully');
  }

  setData(STORE_KEYS.suppliers, suppliers);
  this.reset();
  refreshAll();
});

function refreshSupplierCards() {
  const suppliers = getData(STORE_KEYS.suppliers);
  const container = document.getElementById('supplierCardContainer');

  if (suppliers.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏭</div><p>No suppliers added yet.</p></div>';
    return;
  }

  container.innerHTML = suppliers.map(s => `
    <div class="supplier-card-item">
      <h4>${s.name}</h4>
      <div class="sup-detail">👤 ${s.contact}</div>
      <div class="sup-detail">📞 ${s.phone}</div>
      ${s.email ? `<div class="sup-detail">✉️ ${s.email}</div>` : ''}
      <div class="sup-actions">
        <button class="btn btn-primary btn-sm" onclick="editSupplier(${s.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

function editSupplier(id) {
  const suppliers = getData(STORE_KEYS.suppliers);
  const s = suppliers.find(x => x.id === id);
  if (!s) return;
  document.getElementById('supplierEditId').value = s.id;
  document.getElementById('supplierName').value = s.name;
  document.getElementById('supplierContact').value = s.contact;
  document.getElementById('supplierPhone').value = s.phone;
  document.getElementById('supplierEmail').value = s.email || '';
  document.getElementById('supplierFormTitle').textContent = 'Edit Supplier';
  document.getElementById('supplierSubmitBtn').textContent = '💾 Update Supplier';
  document.getElementById('supplierCancelBtn').style.display = '';
  document.getElementById('page-suppliers').scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelSupplierEdit() {
  document.getElementById('supplierForm').reset();
  document.getElementById('supplierEditId').value = '';
  document.getElementById('supplierFormTitle').textContent = 'Add New Supplier';
  document.getElementById('supplierSubmitBtn').textContent = '➕ Add Supplier';
  document.getElementById('supplierCancelBtn').style.display = 'none';
}

function deleteSupplier(id) {
  if (!confirm('Delete this supplier?')) return;
  let suppliers = getData(STORE_KEYS.suppliers);
  suppliers = suppliers.filter(s => s.id !== id);
  setData(STORE_KEYS.suppliers, suppliers);
  showToast('Supplier deleted', 'error');
  refreshAll();
}

// ═══════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════
document.getElementById('productForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const products = getData(STORE_KEYS.products);
  const editId = document.getElementById('productEditId').value;

  const entry = {
    name:     document.getElementById('productName').value.trim(),
    category: document.getElementById('productCategory').value,
    price:    parseFloat(document.getElementById('productPrice').value),
    stock:    parseInt(document.getElementById('productStock').value),
    supplier: document.getElementById('productSupplier').value,
  };

  if (editId) {
    const idx = products.findIndex(p => p.id === parseInt(editId));
    if (idx !== -1) { entry.id = parseInt(editId); products[idx] = entry; }
    showToast('Product updated successfully');
    cancelProductEdit();
  } else {
    entry.id = nextId(products);
    products.push(entry);
    showToast('Product added successfully');
  }

  setData(STORE_KEYS.products, products);
  this.reset();
  refreshAll();
});

function refreshProductTable() {
  const products = getData(STORE_KEYS.products);
  const tbody = document.getElementById('productTableBody');

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><p>No products added yet.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = products.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td><span class="badge badge-info">${p.category}</span></td>
      <td>₹${p.price.toLocaleString('en-IN')}</td>
      <td>${p.stock <= 10 ? '<span class="badge badge-warning">' + p.stock + '</span>' : p.stock}</td>
      <td>${p.supplier || '—'}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="editProduct(${p.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function editProduct(id) {
  const products = getData(STORE_KEYS.products);
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('productEditId').value = p.id;
  document.getElementById('productName').value = p.name;
  document.getElementById('productCategory').value = p.category;
  document.getElementById('productPrice').value = p.price;
  document.getElementById('productStock').value = p.stock;
  // Need to make sure supplier dropdown is populated first
  populateDropdowns();
  document.getElementById('productSupplier').value = p.supplier;
  document.getElementById('productFormTitle').textContent = 'Edit Product';
  document.getElementById('productSubmitBtn').textContent = '💾 Update Product';
  document.getElementById('productCancelBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelProductEdit() {
  document.getElementById('productForm').reset();
  document.getElementById('productEditId').value = '';
  document.getElementById('productFormTitle').textContent = 'Add New Product';
  document.getElementById('productSubmitBtn').textContent = '➕ Add Product';
  document.getElementById('productCancelBtn').style.display = 'none';
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  let products = getData(STORE_KEYS.products);
  products = products.filter(p => p.id !== id);
  setData(STORE_KEYS.products, products);
  showToast('Product deleted', 'error');
  refreshAll();
}

// ═══════════════════════════════════════════════
//  CUSTOMERS
// ═══════════════════════════════════════════════
document.getElementById('customerForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const customers = getData(STORE_KEYS.customers);
  const editId = document.getElementById('customerEditId').value;

  const entry = {
    name:    document.getElementById('customerName').value.trim(),
    phone:   document.getElementById('customerPhone').value.trim(),
    email:   document.getElementById('customerEmail').value.trim(),
    address: document.getElementById('customerAddress').value.trim(),
  };

  if (editId) {
    const idx = customers.findIndex(c => c.id === parseInt(editId));
    if (idx !== -1) { entry.id = parseInt(editId); customers[idx] = entry; }
    showToast('Customer updated successfully');
    cancelCustomerEdit();
  } else {
    entry.id = nextId(customers);
    customers.push(entry);
    showToast('Customer added successfully');
  }

  setData(STORE_KEYS.customers, customers);
  this.reset();
  refreshAll();
});

function refreshCustomerTable() {
  const customers = getData(STORE_KEYS.customers);
  const tbody = document.getElementById('customerTableBody');

  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><p>No customers added yet.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = customers.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.email || '—'}</td>
      <td>${c.address || '—'}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="editCustomer(${c.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function editCustomer(id) {
  const customers = getData(STORE_KEYS.customers);
  const c = customers.find(x => x.id === id);
  if (!c) return;
  document.getElementById('customerEditId').value = c.id;
  document.getElementById('customerName').value = c.name;
  document.getElementById('customerPhone').value = c.phone;
  document.getElementById('customerEmail').value = c.email || '';
  document.getElementById('customerAddress').value = c.address || '';
  document.getElementById('customerFormTitle').textContent = 'Edit Customer';
  document.getElementById('customerSubmitBtn').textContent = '💾 Update Customer';
  document.getElementById('customerCancelBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelCustomerEdit() {
  document.getElementById('customerForm').reset();
  document.getElementById('customerEditId').value = '';
  document.getElementById('customerFormTitle').textContent = 'Add New Customer';
  document.getElementById('customerSubmitBtn').textContent = '➕ Add Customer';
  document.getElementById('customerCancelBtn').style.display = 'none';
}

function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  let customers = getData(STORE_KEYS.customers);
  customers = customers.filter(c => c.id !== id);
  setData(STORE_KEYS.customers, customers);
  showToast('Customer deleted', 'error');
  refreshAll();
}

// ═══════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════
document.getElementById('orderForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const orders   = getData(STORE_KEYS.orders);
  const products = getData(STORE_KEYS.products);
  const customers = getData(STORE_KEYS.customers);

  const custId  = parseInt(document.getElementById('orderCustomer').value);
  const prodId  = parseInt(document.getElementById('orderProduct').value);
  const qty     = parseInt(document.getElementById('orderQuantity').value);

  const customer = customers.find(c => c.id === custId);
  const product  = products.find(p => p.id === prodId);

  if (!customer || !product) { showToast('Please select a valid customer and product.', 'error'); return; }
  if (qty > product.stock) { showToast('Not enough stock! Available: ' + product.stock, 'error'); return; }

  const total = product.price * qty;

  const order = {
    id:           nextId(orders),
    date:         new Date().toLocaleDateString('en-IN'),
    customerId:   customer.id,
    customerName: customer.name,
    productId:    product.id,
    productName:  product.name,
    quantity:     qty,
    price:        product.price,
    total:        total,
    status:       'Pending',
    paid:         0,
  };

  orders.push(order);
  setData(STORE_KEYS.orders, orders);

  // Reduce stock
  const pIdx = products.findIndex(p => p.id === prodId);
  products[pIdx].stock -= qty;
  setData(STORE_KEYS.products, products);

  showToast('Order #' + order.id + ' placed successfully!');
  this.reset();
  document.getElementById('orderTotal').value = '—';
  refreshAll();
});

function refreshOrderTable() {
  const orders = getData(STORE_KEYS.orders);
  const tbody = document.getElementById('orderTableBody');

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🛒</div><p>No orders placed yet.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = orders.slice().reverse().map(o => {
    const statusClass = o.status === 'Paid' ? 'badge-success' : 'badge-warning';
    return `
    <tr>
      <td>#${o.id}</td>
      <td>${o.date}</td>
      <td>${o.customerName}</td>
      <td>${o.productName}</td>
      <td>${o.quantity}</td>
      <td>₹${o.total.toLocaleString('en-IN')}</td>
      <td><span class="badge ${statusClass}">${o.status}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteOrder(${o.id})">🗑️ Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function deleteOrder(id) {
  if (!confirm('Delete this order? Stock will NOT be restored.')) return;
  let orders = getData(STORE_KEYS.orders);
  orders = orders.filter(o => o.id !== id);
  setData(STORE_KEYS.orders, orders);
  showToast('Order deleted', 'error');
  refreshAll();
}

// ═══════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════
document.getElementById('paymentForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const payments = getData(STORE_KEYS.payments);
  const orders   = getData(STORE_KEYS.orders);

  const orderId = parseInt(document.getElementById('paymentOrder').value);
  const amount  = parseFloat(document.getElementById('paymentAmount').value);
  const method  = document.getElementById('paymentMethod').value;

  const order = orders.find(o => o.id === orderId);
  if (!order) { showToast('Select a valid order', 'error'); return; }

  const remaining = order.total - (order.paid || 0);
  if (amount > remaining) { showToast('Amount exceeds remaining balance of ₹' + remaining.toLocaleString('en-IN'), 'error'); return; }

  const payment = {
    id:           nextId(payments),
    date:         new Date().toLocaleDateString('en-IN'),
    orderId:      order.id,
    customerName: order.customerName,
    amount:       amount,
    method:       method,
  };

  payments.push(payment);
  setData(STORE_KEYS.payments, payments);

  // Update order paid amount and status
  const oIdx = orders.findIndex(o => o.id === orderId);
  orders[oIdx].paid = (orders[oIdx].paid || 0) + amount;
  if (orders[oIdx].paid >= orders[oIdx].total) {
    orders[oIdx].status = 'Paid';
  }
  setData(STORE_KEYS.orders, orders);

  showToast('Payment of ₹' + amount.toLocaleString('en-IN') + ' recorded!');
  this.reset();
  refreshAll();
});

function refreshPaymentTable() {
  const payments = getData(STORE_KEYS.payments);
  const orders   = getData(STORE_KEYS.orders);
  const tbody    = document.getElementById('paymentTableBody');

  // Summary
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalPaid    = payments.reduce((s, p) => s + p.amount, 0);
  const pending      = totalRevenue - totalPaid;

  document.getElementById('payTotalRevenue').textContent = '₹' + totalRevenue.toLocaleString('en-IN');
  document.getElementById('payReceived').textContent     = '₹' + totalPaid.toLocaleString('en-IN');
  document.getElementById('payPending').textContent      = '₹' + pending.toLocaleString('en-IN');

  if (payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💳</div><p>No payments recorded yet.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = payments.slice().reverse().map((p, i) => `
    <tr>
      <td>${payments.length - i}</td>
      <td>${p.date}</td>
      <td>#${p.orderId}</td>
      <td>${p.customerName}</td>
      <td>₹${p.amount.toLocaleString('en-IN')}</td>
      <td><span class="badge badge-success">${p.method}</span></td>
    </tr>
  `).join('');
}

// ─── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', refreshAll);
