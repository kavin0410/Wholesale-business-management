/* ============================================
   Wholesale Business Management System
   Application Logic (localStorage-based)
   All Features Integrated
   ============================================ */

// ─── Data Store ──────────────────────────────────
const STORE_KEYS = {
  products: 'wbms_products',
  suppliers: 'wbms_suppliers',
  customers: 'wbms_customers',
  orders: 'wbms_orders',
  payments: 'wbms_payments',
  notifications: 'wbms_notifications',
  auth: 'wbms_auth',
  currency: 'wbms_currency',
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

// ─── Currency ────────────────────────────────────
const CURRENCY_RATES = { INR: 1, USD: 0.012, EUR: 0.011 };
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€' };
let currentCurrency = localStorage.getItem(STORE_KEYS.currency) || 'INR';

function getCurrencySymbol() { return CURRENCY_SYMBOLS[currentCurrency]; }
function convertCurrency(amountINR) {
  return (amountINR * CURRENCY_RATES[currentCurrency]);
}
function formatCurrency(amountINR) {
  const converted = convertCurrency(amountINR);
  const sym = getCurrencySymbol();
  if (currentCurrency === 'INR') return sym + converted.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return sym + converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Auth / Login ────────────────────────────────
const USERS = {
  admin: { password: 'admin123', role: 'admin' },
  staff: { password: 'staff123', role: 'staff' },
};

function getAuth() {
  try { return JSON.parse(localStorage.getItem(STORE_KEYS.auth)); } catch { return null; }
}

function checkAuth() {
  const auth = getAuth();
  if (!auth) {
    showLogin();
    return false;
  }
  hideLogin();
  applyRole(auth.role);
  return true;
}

function showLogin() {
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('mainContent').style.display = 'none';
  document.getElementById('topBar').style.display = 'none';
  document.getElementById('mobileToggle').style.display = 'none';
}

function hideLogin() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('sidebar').style.display = '';
  document.getElementById('mainContent').style.display = '';
  document.getElementById('topBar').style.display = '';
  document.getElementById('mobileToggle').style.display = '';
}

function applyRole(role) {
  const auth = getAuth();
  const badge = document.getElementById('userRoleBadge');
  const greeting = document.getElementById('userGreeting');
  badge.textContent = role === 'admin' ? '🔑 Admin' : '👤 Staff';
  badge.className = 'user-role-badge ' + (role === 'admin' ? 'role-admin' : 'role-staff');
  greeting.textContent = `Welcome, ${auth ? auth.username : ''}`;

  // Admin nav items visible to all, but restrict actions per role
  const adminOnlyPages = ['products', 'suppliers', 'analytics'];
  const staffOnlyPages = ['orders'];

  document.querySelectorAll('.nav-link').forEach(link => {
    const page = link.dataset.page;
    // Staff cannot see products/suppliers add forms (can only view), cannot see analytics
    if (role === 'staff' && page === 'analytics') {
      link.closest('li').style.display = 'none';
    } else {
      link.closest('li').style.display = '';
    }
  });

  // Admin: show products form; Staff: hide products form
  const productForm = document.querySelector('#page-products .card:first-of-type');
  if (productForm) {
    if (role === 'staff') {
      productForm.style.display = 'none';
    } else {
      productForm.style.display = '';
    }
  }
}

document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const user = USERS[username];
  if (!user || user.password !== password) {
    showToast('Invalid credentials. Please try again.', 'error');
    return;
  }

  const role = user.role;
  const auth = { username, role };
  localStorage.setItem(STORE_KEYS.auth, JSON.stringify(auth));
  hideLogin();
  applyRole(role);
  showToast(`Welcome, ${username}! Logged in as ${role}.`, 'success');
  refreshAll();
});

document.getElementById('logoutBtn').addEventListener('click', function () {
  localStorage.removeItem(STORE_KEYS.auth);
  showLogin();
  showToast('Logged out successfully', 'info');
});

// ─── Notifications ───────────────────────────────
function addNotification(message, type = 'info') {
  const notifications = getData(STORE_KEYS.notifications);
  notifications.unshift({ id: Date.now(), message, type, time: new Date().toLocaleString('en-IN'), read: false });
  if (notifications.length > 50) notifications.pop();
  setData(STORE_KEYS.notifications, notifications);
  refreshNotifications();
}

function refreshNotifications() {
  const notifications = getData(STORE_KEYS.notifications);
  const unread = notifications.filter(n => !n.read).length;
  const countEl = document.getElementById('notificationCount');
  countEl.textContent = unread > 9 ? '9+' : unread;
  countEl.style.display = unread > 0 ? 'flex' : 'none';

  const list = document.getElementById('notificationList');
  if (notifications.length === 0) {
    list.innerHTML = '<li class="empty-notif">No new notifications</li>';
    return;
  }
  list.innerHTML = notifications.slice(0, 15).map(n => {
    const icons = { order: '🛒', stock: '⚠️', payment: '💳', info: 'ℹ️' };
    return `<li class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
      <span class="notif-icon">${icons[n.type] || 'ℹ️'}</span>
      <div class="notif-body">
        <p>${n.message}</p>
        <small>${n.time}</small>
      </div>
    </li>`;
  }).join('');
}

function markNotifRead(id) {
  const notifications = getData(STORE_KEYS.notifications);
  const n = notifications.find(x => x.id === id);
  if (n) n.read = true;
  setData(STORE_KEYS.notifications, notifications);
  refreshNotifications();
}

document.getElementById('notificationBell').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('notificationDropdown').classList.toggle('open');
});

document.addEventListener('click', function () {
  document.getElementById('notificationDropdown').classList.remove('open');
});

document.getElementById('clearNotifications').addEventListener('click', function (e) {
  e.stopPropagation();
  setData(STORE_KEYS.notifications, []);
  refreshNotifications();
  showToast('Notifications cleared', 'info');
});

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
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileToggle = document.getElementById('mobileToggle');

function navigateTo(page) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (link) link.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  refreshAll();
  if (page === 'analytics') setTimeout(renderCharts, 100);
}

document.querySelectorAll('.nav-link').forEach(link => {
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

// ─── Multi-Currency ──────────────────────────────
document.getElementById('currencySelect').addEventListener('change', function () {
  currentCurrency = this.value;
  localStorage.setItem(STORE_KEYS.currency, currentCurrency);
  refreshAll();
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
  refreshNotifications();
  refreshSmartSuggestions();
}

// ─── Dashboard ───────────────────────────────────
function refreshDashboard() {
  const products = getData(STORE_KEYS.products);
  const customers = getData(STORE_KEYS.customers);
  const orders = getData(STORE_KEYS.orders);

  document.getElementById('totalProducts').textContent = products.length;
  document.getElementById('totalCustomers').textContent = customers.length;
  document.getElementById('totalOrders').textContent = orders.length;

  const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('totalSales').textContent = formatCurrency(totalSales);

  // Profit calculation
  let totalRevenue = 0, totalCost = 0;
  orders.forEach(o => {
    totalRevenue += o.total || 0;
    totalCost += (o.costPrice || 0) * (o.quantity || 0);
  });
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  document.getElementById('totalProfit').textContent = formatCurrency(netProfit);
  document.getElementById('profitRevenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('profitCost').textContent = formatCurrency(totalCost);
  document.getElementById('profitNet').textContent = formatCurrency(netProfit);
  document.getElementById('profitMargin').textContent = profitMargin + '%';

  // Recent orders
  const recentEl = document.getElementById('recentOrdersList');
  if (orders.length === 0) {
    recentEl.innerHTML = '<li class="empty-state"><div class="empty-icon">📋</div><p>No orders yet. Create your first order!</p></li>';
  } else {
    const recent = orders.slice(-5).reverse();
    recentEl.innerHTML = recent.map(o =>
      `<li><span class="item-name">#${o.id} — ${o.customerName}</span><span class="item-meta">${formatCurrency(o.total)}</span></li>`
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

  // Check for low stock notifications
  lowStock.forEach(p => {
    const notifications = getData(STORE_KEYS.notifications);
    const existing = notifications.find(n => n.message.includes(p.name) && n.message.includes('low stock'));
    if (!existing) {
      addNotification(`⚠️ ${p.name} is running low — only ${p.stock} left!`, 'stock');
    }
  });
}

// ─── Smart Suggestions ──────────────────────────
function refreshSmartSuggestions() {
  const orders = getData(STORE_KEYS.orders);
  const products = getData(STORE_KEYS.products);

  // Frequently Ordered Products
  const prodCount = {};
  orders.forEach(o => { prodCount[o.productName] = (prodCount[o.productName] || 0) + o.quantity; });
  const freqOrdered = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const freqList = document.getElementById('freqOrderedList');
  freqList.innerHTML = freqOrdered.length
    ? freqOrdered.map(([name, qty]) => `<li><span>${name}</span><span class="badge badge-info">${qty} units</span></li>`).join('')
    : '<li class="muted">No data yet</li>';

  // Customers Also Buy (co-purchase analysis)
  const custProducts = {};
  orders.forEach(o => {
    if (!custProducts[o.customerId]) custProducts[o.customerId] = new Set();
    custProducts[o.customerId].add(o.productName);
  });
  const coProducts = {};
  Object.values(custProducts).forEach(set => {
    const arr = [...set];
    arr.forEach((p, i) => {
      arr.forEach((q, j) => {
        if (i !== j) {
          if (!coProducts[p]) coProducts[p] = {};
          coProducts[p][q] = (coProducts[p][q] || 0) + 1;
        }
      });
    });
  });
  const alsoByList = document.getElementById('alsoByList');
  const topPairs = [];
  Object.entries(coProducts).forEach(([prod, others]) => {
    Object.entries(others).forEach(([other, count]) => {
      topPairs.push({ from: prod, to: other, count });
    });
  });
  topPairs.sort((a, b) => b.count - a.count);
  const seen = new Set();
  const uniquePairs = topPairs.filter(p => {
    const key = [p.from, p.to].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
  alsoByList.innerHTML = uniquePairs.length
    ? uniquePairs.map(p => `<li>${p.from} ↔ ${p.to}</li>`).join('')
    : '<li class="muted">No data yet</li>';

  // Restock Recommendations
  const avgSales = {};
  orders.forEach(o => {
    if (!avgSales[o.productId]) avgSales[o.productId] = { name: o.productName, total: 0, count: 0 };
    avgSales[o.productId].total += o.quantity;
    avgSales[o.productId].count += 1;
  });
  const restockList = document.getElementById('restockList');
  const restockItems = products.map(p => {
    const sales = avgSales[p.id];
    if (!sales) return null;
    const avgPerOrder = Math.ceil(sales.total / sales.count);
    const recommended = Math.max(avgPerOrder * 3 - p.stock, 0);
    if (recommended <= 0) return null;
    return { name: p.name, recommended, stock: p.stock };
  }).filter(Boolean).sort((a, b) => b.recommended - a.recommended).slice(0, 5);
  restockList.innerHTML = restockItems.length
    ? restockItems.map(r => `<li><span>${r.name}</span><span class="badge badge-warning">Restock ${r.recommended}</span></li>`).join('')
    : '<li class="muted">No data yet</li>';
}

// ─── Dropdowns ───────────────────────────────────
function populateDropdowns() {
  const suppliers = getData(STORE_KEYS.suppliers);
  const customers = getData(STORE_KEYS.customers);
  const products = getData(STORE_KEYS.products);
  const orders = getData(STORE_KEYS.orders);

  const supSelect = document.getElementById('productSupplier');
  const currentSup = supSelect.value;
  supSelect.innerHTML = '<option value="">Select Supplier</option>' +
    suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  supSelect.value = currentSup;

  const custSelect = document.getElementById('orderCustomer');
  const currentCust = custSelect.value;
  custSelect.innerHTML = '<option value="">Select Customer</option>' +
    customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  custSelect.value = currentCust;

  const prodSelect = document.getElementById('orderProduct');
  const currentProd = prodSelect.value;
  prodSelect.innerHTML = '<option value="">Select Product</option>' +
    products.map(p => `<option value="${p.id}" data-price="${p.price}" data-costprice="${p.costPrice || 0}">${p.name} (Stock: ${p.stock})</option>`).join('');
  prodSelect.value = currentProd;

  const payOrderSelect = document.getElementById('paymentOrder');
  const currentPayOrder = payOrderSelect.value;
  const unpaid = orders.filter(o => o.status !== 'Paid');
  payOrderSelect.innerHTML = '<option value="">Select Order</option>' +
    unpaid.map(o => `<option value="${o.id}">#${o.id} — ${o.customerName} (${formatCurrency(o.total)})</option>`).join('');
  payOrderSelect.value = currentPayOrder;
}

// ─── Auto-calc order total (with discount) ───────
document.getElementById('orderProduct').addEventListener('change', calcOrderTotal);
document.getElementById('orderQuantity').addEventListener('input', calcOrderTotal);
document.getElementById('orderDiscount').addEventListener('input', calcOrderTotal);
document.getElementById('orderSeasonalOffer').addEventListener('change', calcOrderTotal);

function calcOrderTotal() {
  const sel = document.getElementById('orderProduct');
  const qty = parseInt(document.getElementById('orderQuantity').value) || 0;
  const opt = sel.options[sel.selectedIndex];
  const price = opt ? parseFloat(opt.dataset.price) || 0 : 0;
  const subtotal = price * qty;

  let discountPct = parseFloat(document.getElementById('orderDiscount').value) || 0;
  const seasonal = document.getElementById('orderSeasonalOffer').checked;
  if (seasonal) discountPct += 10;
  discountPct = Math.min(discountPct, 100);

  const discountAmt = subtotal * (discountPct / 100);
  const finalTotal = subtotal - discountAmt;

  document.getElementById('orderSubtotal').value = qty > 0 && price > 0 ? formatCurrency(subtotal) : '—';
  document.getElementById('orderDiscountAmt').value = discountAmt > 0 ? formatCurrency(discountAmt) + ` (${discountPct}%)` : '—';
  document.getElementById('orderTotal').value = qty > 0 && price > 0 ? formatCurrency(finalTotal) : '—';
}

// ═══════════════════════════════════════════════
//  SUPPLIERS
// ═══════════════════════════════════════════════
document.getElementById('supplierForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const suppliers = getData(STORE_KEYS.suppliers);
  const editId = document.getElementById('supplierEditId').value;

  const entry = {
    name: document.getElementById('supplierName').value.trim(),
    contact: document.getElementById('supplierContact').value.trim(),
    phone: document.getElementById('supplierPhone').value.trim(),
    email: document.getElementById('supplierEmail').value.trim(),
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
//  PRODUCTS (with Cost Price)
// ═══════════════════════════════════════════════
document.getElementById('productForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const products = getData(STORE_KEYS.products);
  const editId = document.getElementById('productEditId').value;

  const entry = {
    name: document.getElementById('productName').value.trim(),
    category: document.getElementById('productCategory').value,
    costPrice: parseFloat(document.getElementById('productCostPrice').value) || 0,
    price: parseFloat(document.getElementById('productPrice').value),
    stock: parseInt(document.getElementById('productStock').value),
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
  const auth = getAuth();
  const isAdmin = auth && auth.role === 'admin';

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📦</div><p>No products added yet.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = products.map((p, i) => {
    const profitPerUnit = (p.price || 0) - (p.costPrice || 0);
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td><span class="badge badge-info">${p.category}</span></td>
      <td>${formatCurrency(p.costPrice || 0)}</td>
      <td>${formatCurrency(p.price)}</td>
      <td><span class="badge ${profitPerUnit >= 0 ? 'badge-success' : 'badge-warning'}">${formatCurrency(profitPerUnit)}</span></td>
      <td>${p.stock <= 10 ? '<span class="badge badge-warning">' + p.stock + '</span>' : p.stock}</td>
      <td>${p.supplier || '—'}</td>
      <td>
        ${isAdmin ? `<div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="editProduct(${p.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑️ Delete</button>
        </div>` : '<span class="muted">View only</span>'}
      </td>
    </tr>`;
  }).join('');
}

function editProduct(id) {
  const products = getData(STORE_KEYS.products);
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('productEditId').value = p.id;
  document.getElementById('productName').value = p.name;
  document.getElementById('productCategory').value = p.category;
  document.getElementById('productCostPrice').value = p.costPrice || 0;
  document.getElementById('productPrice').value = p.price;
  document.getElementById('productStock').value = p.stock;
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
document.getElementById('customerForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const customers = getData(STORE_KEYS.customers);
  const editId = document.getElementById('customerEditId').value;

  const entry = {
    name: document.getElementById('customerName').value.trim(),
    phone: document.getElementById('customerPhone').value.trim(),
    email: document.getElementById('customerEmail').value.trim(),
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
//  ORDERS (with discount, profit, status tracking)
// ═══════════════════════════════════════════════
document.getElementById('orderForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const orders = getData(STORE_KEYS.orders);
  const products = getData(STORE_KEYS.products);
  const customers = getData(STORE_KEYS.customers);

  const custId = parseInt(document.getElementById('orderCustomer').value);
  const prodId = parseInt(document.getElementById('orderProduct').value);
  const qty = parseInt(document.getElementById('orderQuantity').value);

  const customer = customers.find(c => c.id === custId);
  const product = products.find(p => p.id === prodId);

  if (!customer || !product) { showToast('Please select a valid customer and product.', 'error'); return; }
  if (qty > product.stock) { showToast('Not enough stock! Available: ' + product.stock, 'error'); return; }

  const subtotal = product.price * qty;
  let discountPct = parseFloat(document.getElementById('orderDiscount').value) || 0;
  const seasonal = document.getElementById('orderSeasonalOffer').checked;
  if (seasonal) discountPct += 10;
  discountPct = Math.min(discountPct, 100);
  const discountAmt = subtotal * (discountPct / 100);
  const total = subtotal - discountAmt;

  const order = {
    id: nextId(orders),
    date: new Date().toLocaleDateString('en-IN'),
    dateISO: new Date().toISOString(),
    customerId: customer.id,
    customerName: customer.name,
    productId: product.id,
    productName: product.name,
    quantity: qty,
    price: product.price,
    costPrice: product.costPrice || 0,
    subtotal: subtotal,
    discountPct: discountPct,
    discountAmt: discountAmt,
    seasonal: seasonal,
    total: total,
    profit: total - ((product.costPrice || 0) * qty),
    status: 'Pending',
    paid: 0,
  };

  orders.push(order);
  setData(STORE_KEYS.orders, orders);

  // Reduce stock
  const pIdx = products.findIndex(p => p.id === prodId);
  products[pIdx].stock -= qty;
  setData(STORE_KEYS.products, products);

  // Notification
  addNotification(`New order #${order.id} placed by ${customer.name} for ${formatCurrency(total)}`, 'order');

  showToast('Order #' + order.id + ' placed successfully!');
  this.reset();
  document.getElementById('orderTotal').value = '—';
  document.getElementById('orderSubtotal').value = '—';
  document.getElementById('orderDiscountAmt').value = '—';
  refreshAll();
});

function refreshOrderTable() {
  const orders = getData(STORE_KEYS.orders);
  const tbody = document.getElementById('orderTableBody');

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">🛒</div><p>No orders placed yet.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = orders.slice().reverse().map(o => {
    const statusColors = {
      'Pending': 'badge-warning',
      'Packed': 'badge-info',
      'Shipped': 'badge-primary',
      'Delivered': 'badge-success',
      'Paid': 'badge-success',
    };
    const statusClass = statusColors[o.status] || 'badge-warning';
    const profit = o.profit != null ? o.profit : (o.total - ((o.costPrice || 0) * o.quantity));
    const discLabel = o.discountPct > 0
      ? `<span class="badge badge-info">${o.discountPct}%${o.seasonal ? ' 🎁' : ''}</span>`
      : '<span class="muted">—</span>';

    return `
    <tr>
      <td>#${o.id}</td>
      <td>${o.date}</td>
      <td>${o.customerName}</td>
      <td>${o.productName}</td>
      <td>${o.quantity}</td>
      <td>${discLabel}</td>
      <td>${formatCurrency(o.total)}</td>
      <td><span class="badge ${profit >= 0 ? 'badge-success' : 'badge-warning'}">${formatCurrency(profit)}</span></td>
      <td>
        <select class="status-select status-${o.status.toLowerCase()}" onchange="updateOrderStatus(${o.id}, this.value)">
          <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="Packed" ${o.status === 'Packed' ? 'selected' : ''}>📦 Packed</option>
          <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
          <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
        </select>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteOrder(${o.id})">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function updateOrderStatus(id, status) {
  const orders = getData(STORE_KEYS.orders);
  const idx = orders.findIndex(o => o.id === id);
  if (idx !== -1) {
    orders[idx].status = status;
    setData(STORE_KEYS.orders, orders);
    showToast(`Order #${id} status updated to ${status}`, 'info');
    refreshAll();
  }
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
document.getElementById('paymentForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const payments = getData(STORE_KEYS.payments);
  const orders = getData(STORE_KEYS.orders);

  const orderId = parseInt(document.getElementById('paymentOrder').value);
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const method = document.getElementById('paymentMethod').value;

  const order = orders.find(o => o.id === orderId);
  if (!order) { showToast('Select a valid order', 'error'); return; }

  const remaining = order.total - (order.paid || 0);
  if (amount > remaining) { showToast('Amount exceeds remaining balance of ' + formatCurrency(remaining), 'error'); return; }

  const payment = {
    id: nextId(payments),
    date: new Date().toLocaleDateString('en-IN'),
    orderId: order.id,
    customerName: order.customerName,
    amount: amount,
    method: method,
  };

  payments.push(payment);
  setData(STORE_KEYS.payments, payments);

  const oIdx = orders.findIndex(o => o.id === orderId);
  orders[oIdx].paid = (orders[oIdx].paid || 0) + amount;
  if (orders[oIdx].paid >= orders[oIdx].total) {
    orders[oIdx].status = 'Paid';
  }
  setData(STORE_KEYS.orders, orders);

  // Notification
  addNotification(`Payment of ${formatCurrency(amount)} received for Order #${order.id}`, 'payment');

  showToast('Payment of ' + formatCurrency(amount) + ' recorded!');
  this.reset();
  refreshAll();
});

function refreshPaymentTable() {
  const payments = getData(STORE_KEYS.payments);
  const orders = getData(STORE_KEYS.orders);
  const tbody = document.getElementById('paymentTableBody');

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const pending = totalRevenue - totalPaid;

  document.getElementById('payTotalRevenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('payReceived').textContent = formatCurrency(totalPaid);
  document.getElementById('payPending').textContent = formatCurrency(pending);

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
      <td>${formatCurrency(p.amount)}</td>
      <td><span class="badge badge-success">${p.method}</span></td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════
//  ANALYTICS (Chart.js)
// ═══════════════════════════════════════════════
let weeklySalesChartInstance = null;
let monthlyRevenueChartInstance = null;
let categorySalesChartInstance = null;

function renderCharts() {
  const orders = getData(STORE_KEYS.orders);

  // Animated counters
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  animateCounter('animRevenue', totalRevenue, true);
  animateCounter('animOrders', orders.length, false);

  // Most profitable product
  const profitByProduct = {};
  orders.forEach(o => {
    const profit = o.profit != null ? o.profit : (o.total - ((o.costPrice || 0) * o.quantity));
    profitByProduct[o.productName] = (profitByProduct[o.productName] || 0) + profit;
  });
  const bestProduct = Object.entries(profitByProduct).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('animBestProduct').textContent = bestProduct ? bestProduct[0] : '—';

  // Most active customer
  const ordersByCustomer = {};
  orders.forEach(o => { ordersByCustomer[o.customerName] = (ordersByCustomer[o.customerName] || 0) + 1; });
  const bestCustomer = Object.entries(ordersByCustomer).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('animBestCustomer').textContent = bestCustomer ? bestCustomer[0] : '—';

  // ─── Weekly Sales Chart ────────
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = new Array(7).fill(0);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  orders.forEach(o => {
    const orderDate = o.dateISO ? new Date(o.dateISO) : parseDateIN(o.date);
    if (orderDate >= startOfWeek) {
      weekData[orderDate.getDay()] += o.total;
    }
  });

  if (weeklySalesChartInstance) weeklySalesChartInstance.destroy();
  const ctx1 = document.getElementById('weeklySalesChart').getContext('2d');
  weeklySalesChartInstance = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: weekDays,
      datasets: [{
        label: 'Sales',
        data: weekData.map(v => convertCurrency(v)),
        backgroundColor: 'rgba(200, 160, 80, 0.5)',
        borderColor: '#c8a050',
        borderWidth: 2,
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#d4c8a8' } },
        x: { grid: { display: false }, ticks: { color: '#d4c8a8' } },
      }
    }
  });

  // ─── Monthly Revenue Chart ────────
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthData = new Array(12).fill(0);
  orders.forEach(o => {
    const orderDate = o.dateISO ? new Date(o.dateISO) : parseDateIN(o.date);
    if (orderDate.getFullYear() === now.getFullYear()) {
      monthData[orderDate.getMonth()] += o.total;
    }
  });

  if (monthlyRevenueChartInstance) monthlyRevenueChartInstance.destroy();
  const ctx2 = document.getElementById('monthlyRevenueChart').getContext('2d');
  monthlyRevenueChartInstance = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Revenue',
        data: monthData.map(v => convertCurrency(v)),
        borderColor: '#06d6a0',
        backgroundColor: 'rgba(6, 214, 160, 0.12)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#06d6a0',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#d4c8a8' } },
        x: { grid: { display: false }, ticks: { color: '#d4c8a8' } },
      }
    }
  });

  // ─── Category Pie Chart ────────
  const catData = {};
  orders.forEach(o => {
    const products = getData(STORE_KEYS.products);
    const product = products.find(p => p.id === o.productId);
    const cat = product ? product.category : 'Other';
    catData[cat] = (catData[cat] || 0) + o.total;
  });

  const catLabels = Object.keys(catData);
  const catValues = catLabels.map(k => convertCurrency(catData[k]));
  const catColors = [
    '#c8a050', '#06d6a0', '#ef476f', '#4cc9f0', '#ffd166',
    '#9b7a3d', '#ff6b6b', '#48bfe3', '#7b2d8e', '#20f0b8', '#ff9f1c'
  ];

  if (categorySalesChartInstance) categorySalesChartInstance.destroy();
  const ctx3 = document.getElementById('categorySalesChart').getContext('2d');
  categorySalesChartInstance = new Chart(ctx3, {
    type: 'doughnut',
    data: {
      labels: catLabels.length ? catLabels : ['No Data'],
      datasets: [{
        data: catValues.length ? catValues : [1],
        backgroundColor: catLabels.length ? catColors.slice(0, catLabels.length) : ['rgba(255,255,255,0.1)'],
        borderColor: 'rgba(10, 8, 4, 0.9)',
        borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#d4c8a8', padding: 16, font: { size: 12 } } }
      }
    }
  });
}

function parseDateIN(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('/');
  if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
  return new Date(dateStr);
}

function animateCounter(elementId, target, isCurrency) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = isCurrency ? formatCurrency(current) : current;
  }, 25);
}

// ═══════════════════════════════════════════════
//  BACKUP & RESTORE
// ═══════════════════════════════════════════════
document.getElementById('backupBtn').addEventListener('click', function () {
  const backup = {};
  Object.entries(STORE_KEYS).forEach(([key, storeKey]) => {
    if (key === 'auth' || key === 'currency') return;
    backup[storeKey] = getData(storeKey);
  });
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wbms_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded successfully! 💾', 'success');
});

document.getElementById('restoreBtn').addEventListener('click', function () {
  document.getElementById('restoreFile').click();
});

document.getElementById('restoreFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const backup = JSON.parse(ev.target.result);
      Object.entries(backup).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      showToast('Data restored successfully! 🎉', 'success');
      refreshAll();
    } catch (err) {
      showToast('Invalid backup file. Please check the file format.', 'error');
    }
  };
  reader.readAsText(file);
  this.value = '';
});

// ─── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // Set currency dropdown
  const savedCurrency = localStorage.getItem(STORE_KEYS.currency);
  if (savedCurrency) {
    document.getElementById('currencySelect').value = savedCurrency;
    currentCurrency = savedCurrency;
  }

  if (checkAuth()) {
    refreshAll();
  }
});
