/**
 * API Helper — communicates with FastAPI backend via Vite proxy
 */
const API_BASE = '/api'

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || err.message || 'API Error')
    }
    return res.json()
}

// ── Products ──────────────────────────────────────
export async function fetchProducts() {
    const res = await apiFetch('/products?limit=100')
    return res.data || []
}

export async function createProduct(body) {
    return apiFetch('/products', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateProduct(id, body) {
    return apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteProduct(id) {
    return apiFetch(`/products/${id}`, { method: 'DELETE' })
}

// ── Suppliers ─────────────────────────────────────
export async function fetchSuppliers() {
    const res = await apiFetch('/suppliers?limit=100')
    return res.data || []
}

export async function createSupplier(body) {
    return apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateSupplier(id, body) {
    return apiFetch(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteSupplier(id) {
    return apiFetch(`/suppliers/${id}`, { method: 'DELETE' })
}

// ── Customers ─────────────────────────────────────
export async function fetchCustomers() {
    const res = await apiFetch('/customers?limit=100')
    return res.data || []
}

export async function createCustomer(body) {
    return apiFetch('/customers', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateCustomer(id, body) {
    return apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteCustomer(id) {
    return apiFetch(`/customers/${id}`, { method: 'DELETE' })
}

// ── Orders ────────────────────────────────────────
export async function fetchOrders() {
    const res = await apiFetch('/orders?limit=100')
    return res.data || []
}

export async function createOrder(body) {
    return apiFetch('/orders', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteOrder(id) {
    return apiFetch(`/orders/${id}`, { method: 'DELETE' })
}

// ── Payments ──────────────────────────────────────
export async function fetchPayments() {
    const res = await apiFetch('/payments?limit=100')
    return res.data || []
}

// ── Dashboard ─────────────────────────────────────
export async function fetchDashboardSummary() {
    const res = await apiFetch('/dashboard-summary')
    return res.data || {}
}

export async function fetchDashboardStats() {
    const res = await apiFetch('/dashboard/stats')
    return res.data || {}
}


export async function updatePayment(id, body) {
    return apiFetch(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

// ── Auth ──────────────────────────────────────────
export async function apiLogin(username, password) {
    const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    })
    return res.data || null
}
