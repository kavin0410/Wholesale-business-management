/* Storage keys */
import { api } from './utils/api'
const STORE_KEYS = {
    products: 'wbms_products',
    suppliers: 'wbms_suppliers',
    customers: 'wbms_customers',
    orders: 'wbms_orders',
    payments: 'wbms_payments',
    notifications: 'wbms_notifications',
    auth: 'wbms_auth',
    currency: 'wbms_currency',
    staff: 'wbms_staff',
}

export function getData(key) {
    try { return JSON.parse(localStorage.getItem(key)) || [] }
    catch { return [] }
}

export function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
}

export function nextId(arr) {
    return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1
}

/* Currency */
const CURRENCY_RATES = { INR: 1, USD: 0.012, EUR: 0.011 }
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€' }

export function getCurrencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || '₹'
}

export function convertCurrency(amountINR, currency) {
    return amountINR * (CURRENCY_RATES[currency] || 1)
}

export function formatCurrency(amountINR, currency) {
    const converted = convertCurrency(amountINR, currency)
    const sym = getCurrencySymbol(currency)
    return sym + converted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getAuth() {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.auth)) }
    catch { return null }
}

// Permission definitions (mirrors backend auth_middleware.py)
const ROLE_PERMISSIONS = {
    admin: new Set([
        'products:view', 'products:create', 'products:edit', 'products:delete',
        'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
        'customers:view', 'customers:create', 'customers:edit', 'customers:delete',
        'orders:view', 'orders:create', 'orders:edit', 'orders:delete',
        'payments:view', 'payments:create',
        'reports:view', 'dashboard:view',
        'delivery:view', 'delivery:edit',
        'settings:view', 'settings:edit',
        'users:manage',
        'export:data',
        'staff:view', 'staff:create', 'staff:edit', 'staff:delete',
        'performance:view',
        'ai:view',
    ]),
    staff: new Set([
        'products:view',
        'suppliers:view',
        'customers:view',
        'orders:view', 'orders:create',
        'payments:view',
        'dashboard:view',
        'delivery:view', 'delivery:edit',
        'performance:view',
        'ai:view',
    ]),
}

// Pages that each role can access
const ROLE_PAGES = {
    admin: ['dashboard', 'products', 'customers', 'suppliers', 'orders', 'reports', 'payments', 'delivery', 'settings'],
    staff:  ['dashboard', 'products', 'customers', 'orders', 'delivery'],
}



export async function login(username, password) {
    try {
        const result = await api.post('/auth/login', { username, password })
        if (!result.success) return null

        const { id, role, permissions } = result.data
        const allowedPages = ROLE_PAGES[role] || []
        
        const auth = { 
            id,
            username: username.toLowerCase(), 
            role, 
            permissions, 
            allowedPages 
        }
        
        localStorage.removeItem(STORE_KEYS.auth)
        setData(STORE_KEYS.auth, auth)
        return auth
    } catch (error) {
        console.error('Login failed:', error)
        return null
    }
}


export function logout() {
    localStorage.removeItem(STORE_KEYS.auth)
}

/**
 * Check if the current user has a specific permission.
 * @param {string} permission — e.g. 'products:delete'
 * @returns {boolean}
 */
export function hasPermission(permission) {
    const auth = getAuth()
    if (!auth) return false
    const perms = ROLE_PERMISSIONS[auth.role]
    return perms ? perms.has(permission) : false
}

/**
 * Check if the current user can access a specific page.
 * @param {string} page — e.g. 'reports'
 * @returns {boolean}
 */
export function canAccessPage(page) {
    const auth = getAuth()
    if (!auth) return false
    const pages = ROLE_PAGES[auth.role]
    return pages ? pages.includes(page) : false
}

/**
 * Check if the current user has admin role.
 * @returns {boolean}
 */
export function isAdmin() {
    const auth = getAuth()
    return auth?.role === 'admin'
}

/**
 * Get the list of allowed nav pages for the current user.
 * @returns {string[]}
 */
export function getAllowedPages() {
    const auth = getAuth()
    if (!auth) return []
    return ROLE_PAGES[auth.role] || []
}

/* Notifications */
export function getNotifications() {
    return getData(STORE_KEYS.notifications)
}

export function addNotification(message, type = 'info') {
    const notifs = getNotifications()
    notifs.unshift({ id: Date.now(), message, type, read: false, time: new Date().toLocaleString() })
    if (notifs.length > 50) notifs.length = 50
    setData(STORE_KEYS.notifications, notifs)
}

export function markNotifRead(id) {
    const notifs = getNotifications()
    const n = notifs.find(x => x.id === id)
    if (n) n.read = true
    setData(STORE_KEYS.notifications, notifs)
}

export function clearNotifications() {
    setData(STORE_KEYS.notifications, [])
}

/* Products — Async API helpers */
export async function fetchProducts(page = 1, limit = 100) {
    try {
        const result = await api.get(`/products?page=${page}&limit=${limit}`)
        if (result.success) {
            // Map snake_case from DB to camelCase for the frontend
            const mapped = result.data.map(p => ({
                ...p,
                costPrice: p.costPrice ?? p.cost_price,
                supplierId: p.supplierId ?? p.supplier_id,
                supplierName: p.supplierName ?? p.supplier_name
            }))
            setData(STORE_KEYS.products, mapped)
            return { data: mapped, total: result.total }
        }
        return { data: [], total: 0 }
    } catch (error) {
        console.error('Failed to fetch products:', error)
        return { data: [], total: 0 }
    }
}

export async function createProduct(productData) {
    try {
        const result = await api.post('/products', productData)
        return result.success
    } catch (error) {
        console.error('Failed to create product:', error)
        return false
    }
}

export async function updateProductApi(id, productData) {
    try {
        const result = await api.put(`/products/${id}`, productData)
        return result.success
    } catch (error) {
        console.error('Failed to update product:', error)
        return false
    }
}

export async function deleteProductApi(id) {
    try {
        const result = await api.delete(`/products/${id}`)
        return result.success
    } catch (error) {
        console.error('Failed to delete product:', error)
        return false
    }
}

/* Staff Management — Async API helpers */
export async function fetchStaffs(page = 1, limit = 20) {
    try {
        const result = await api.get(`/admin/staff?page=${page}&limit=${limit}`)
        if (result.success) {
            setData(STORE_KEYS.staff, result.data)
            return { data: result.data, total: result.total }
        }
        return { data: [], total: 0 }
    } catch (error) {
        console.error('Failed to fetch staff:', error)
        return { data: [], total: 0 }
    }
}

export async function createStaff(staffData) {
    try {
        const result = await api.post('/admin/staff', staffData)
        return result.success
    } catch (error) {
        console.error('Failed to create staff:', error)
        return false
    }
}

export async function updateStaff(id, staffData) {
    try {
        const result = await api.put(`/admin/staff/${id}`, staffData)
        return result.success
    } catch (error) {
        console.error('Failed to update staff:', error)
        return false
    }
}

export async function deleteStaff(id) {
    try {
        const result = await api.delete(`/admin/staff/${id}`)
        return result.success
    } catch (error) {
        console.error('Failed to delete staff:', error)
        return false
    }
}

/* Staff Performance — Async API helpers */
export async function fetchAllPerformance() {
    try {
        const result = await api.get('/admin/performance')
        return result.success ? result.data : []
    } catch (error) {
        console.error('Failed to fetch performance:', error)
        return []
    }
}

export async function fetchStaffPerformance(id) {
    try {
        const result = await api.get(`/admin/performance/${id}`)
        return result.success ? result.data : null
    } catch (error) {
        console.error('Failed to fetch staff performance:', error)
        return null
    }
}

/* Customers — Async API helpers */
export async function fetchCustomers(page = 1, limit = 100) {
    try {
        const result = await api.get(`/customers?page=${page}&limit=${limit}`)
        if (result.success) {
            setData(STORE_KEYS.customers, result.data)
            return { data: result.data, total: result.total }
        }
        return { data: [], total: 0 }
    } catch (error) {
        console.error('Failed to fetch customers:', error)
        return { data: [], total: 0 }
    }
}

export async function createCustomer(customerData) {
    try {
        const result = await api.post('/customers', customerData)
        return result.success
    } catch (error) {
        console.error('Failed to create customer:', error)
        return false
    }
}

export async function updateCustomerApi(id, customerData) {
    try {
        const result = await api.put(`/customers/${id}`, customerData)
        return result.success
    } catch (error) {
        console.error('Failed to update customer:', error)
        return false
    }
}

export async function deleteCustomerApi(id) {
    try {
        const result = await api.delete(`/customers/${id}`)
        return result.success
    } catch (error) {
        console.error('Failed to delete customer:', error)
        return false
    }
}

/* Suppliers — Async API helpers */
export async function fetchSuppliers(page = 1, limit = 100) {
    try {
        const result = await api.get(`/suppliers?page=${page}&limit=${limit}`)
        if (result.success) {
            setData(STORE_KEYS.suppliers, result.data)
            return { data: result.data, total: result.total }
        }
        return { data: [], total: 0 }
    } catch (error) {
        console.error('Failed to fetch suppliers:', error)
        return { data: [], total: 0 }
    }
}

export async function createSupplier(supplierData) {
    try {
        const result = await api.post('/suppliers', supplierData)
        return result.success
    } catch (error) {
        console.error('Failed to create supplier:', error)
        return false
    }
}

export async function updateSupplierApi(id, supplierData) {
    try {
        const result = await api.put(`/suppliers/${id}`, supplierData)
        return result.success
    } catch (error) {
        console.error('Failed to update supplier:', error)
        return false
    }
}

/* Orders — Async API helpers */
export async function fetchOrders(page = 1, limit = 100) {
    try {
        const result = await api.get(`/orders?page=${page}&limit=${limit}`)
        if (result.success) {
            // Map snake_case to camelCase where needed for UI compatibility
            const mapped = result.data.map(o => ({
                ...o,
                customerName: o.customer_name,
                productName: o.product_name,
                staffName: o.staff_name,
                discountAmt: o.discount_amt,
                paymentMethod: o.payment_method,
                razorpayId: o.razorpay_id
            }))
            setData(STORE_KEYS.orders, mapped)
            return { data: mapped, total: result.total }
        }
        return { data: [], total: 0 }
    } catch (error) {
        console.error('Failed to fetch orders:', error)
        return { data: [], total: 0 }
    }
}

export async function createOrderApi(orderData) {
    try {
        // Map camelCase to snake_case for backend
        const body = {
            customer_id: Number(orderData.customerId),
            product_id: Number(orderData.productId),
            quantity: Number(orderData.quantity),
            discount: Number(orderData.discount),
            seasonal: !!orderData.seasonal,
            payment_method: orderData.paymentMethod,
            razorpay_id: orderData.razorpayId || null
        }
        const result = await api.post('/orders', body)
        return result
    } catch (error) {
        console.error('Failed to create order:', error)
        throw error
    }
}

export async function updateOrderStatusApi(id, status) {
    try {
        const result = await api.put(`/orders/${id}/status?status=${status}`)
        return result.success
    } catch (error) {
        console.error('Failed to update order status:', error)
        return false
    }
}

export async function deleteOrderApi(id) {
    try {
        const result = await api.delete(`/orders/${id}`)
        return result.success
    } catch (error) {
        console.error('Failed to delete order:', error)
        return false
    }
}

/* Payments — Async API helpers */
export async function fetchPayments(page = 1, limit = 100) {
    try {
        const result = await api.get(`/payments?page=${page}&limit=${limit}`)
        if (result.success) {
            const mapped = result.data.map(p => ({
                ...p,
                customerName: p.customer_name,
                transactionId: p.transaction_id
            }))
            setData(STORE_KEYS.payments, mapped)
            return { data: mapped, total: result.total }
        }
        return { data: [], total: 0 }
    } catch (error) {
        console.error('Failed to fetch payments:', error)
        return { data: [], total: 0 }
    }
}

export async function fetchPaymentSummaryApi() {
    try {
        const result = await api.get('/payments/summary')
        return result.success ? result.data : null
    } catch (error) {
        console.error('Failed to fetch payment summary:', error)
        return null
    }
}

export async function createPaymentApi(paymentData) {
    try {
        const body = {
            order_id: Number(paymentData.orderId),
            amount: Number(paymentData.amount),
            method: paymentData.method,
            transaction_id: paymentData.transactionId || null
        }
        const result = await api.post('/payments', body)
        return result.success
    } catch (error) {
        console.error('Failed to record payment:', error)
        return false
    }
}

export async function deleteSupplierApi(id) {
    try {
        const result = await api.delete(`/suppliers/${id}`)
        return result.success
    } catch (error) {
        console.error('Failed to delete supplier:', error)
        return false
    }
}

/* Reports — Async API helpers */
export async function fetchReportSummaryApi() {
    try {
        const result = await api.get('/reports/summary')
        return result.success ? result.data : null
    } catch (error) {
        console.error('Failed to fetch report summary:', error)
        return null
    }
}

export async function fetchReportTrendsApi() {
    try {
        const result = await api.get('/reports/trends')
        return result.success ? result.data : null
    } catch (error) {
        console.error('Failed to fetch report trends:', error)
        return null
    }
}

export async function fetchReportCategoriesApi() {
    try {
        const result = await api.get('/reports/categories')
        return result.success ? result.data : []
    } catch (error) {
        console.error('Failed to fetch category report:', error)
        return []
    }
}

/* Delivery Tracking — Async API helpers */
export async function fetchDeliveriesApi() {
    try {
        const result = await api.get('/delivery')
        return result.success ? result.data : []
    } catch (error) {
        console.error('Failed to fetch deliveries:', error)
        return []
    }
}

export async function fetchDeliveryByIdApi(orderId) {
    try {
        const result = await api.get(`/delivery/${orderId}`)
        return result.success ? result.data : null
    } catch (error) {
        console.error('Failed to fetch delivery detail:', error)
        return null
    }
}

export async function updateDeliveryStatusApi(deliveryId, status, note = '') {
    try {
        const result = await api.put(`/delivery/${deliveryId}/status`, { status, note })
        return result.success
    } catch (error) {
        console.error('Failed to update delivery status:', error)
        return false
    }
}

/* Products — Local Storage (Legacy/Fallback) */
export function getProducts() { return getData(STORE_KEYS.products) }
export function saveProducts(data) { setData(STORE_KEYS.products, data) }

/* Suppliers */
export function getSuppliers() { return getData(STORE_KEYS.suppliers) }
export function saveSuppliers(data) { setData(STORE_KEYS.suppliers, data) }

/* Customers */
export function getCustomers() { return getData(STORE_KEYS.customers) }
export function saveCustomers(data) { setData(STORE_KEYS.customers, data) }

/* Orders */
export function getOrders() { return getData(STORE_KEYS.orders) }
export function saveOrders(data) { setData(STORE_KEYS.orders, data) }

/* Payments */
export function getPayments() { return getData(STORE_KEYS.payments) }
export function savePayments(data) { setData(STORE_KEYS.payments, data) }

/* Currency persistence */
export function getSavedCurrency() {
    return localStorage.getItem(STORE_KEYS.currency) || 'INR'
}

export function saveCurrency(c) {
    localStorage.setItem(STORE_KEYS.currency, c)
}

/* Migration Utility — Local Storage to Backend */
export async function migrateLocalDataToBackend() {
    try {
        const products = getProducts()
        const customers = getCustomers()
        const suppliers = getSuppliers()
        const orders = getOrders()

        // Very basic migration — in a real app we'd do this in one bulk request
        for (const p of products) {
            await createProduct({ ...p, supplier_id: null }) // supplier_id might be different
        }
        for (const c of customers) {
            await createCustomer(c)
        }
        for (const s of suppliers) {
            await createSupplier(s)
        }
        // Orders are complex due to foreign keys, skipping for basic migration or can be added later
        // if IDs match up.
        
        return true
    } catch (err) {
        console.error('Migration failed:', err)
        return false
    }
}

/* Backup/Restore */
export function exportBackup() {
    const data = {
        products: getProducts(),
        suppliers: getSuppliers(),
        customers: getCustomers(),
        orders: getOrders(),
        payments: getPayments(),
        notifications: getNotifications(),
        exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `supplynest-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
}

export function importBackup(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result)
                if (data.products) setData(STORE_KEYS.products, data.products)
                if (data.suppliers) setData(STORE_KEYS.suppliers, data.suppliers)
                if (data.customers) setData(STORE_KEYS.customers, data.customers)
                if (data.orders) setData(STORE_KEYS.orders, data.orders)
                if (data.payments) setData(STORE_KEYS.payments, data.payments)
                if (data.notifications) setData(STORE_KEYS.notifications, data.notifications)
                resolve()
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = reject
        reader.readAsText(file)
    })
}

export { STORE_KEYS, ROLE_PERMISSIONS, ROLE_PAGES }
