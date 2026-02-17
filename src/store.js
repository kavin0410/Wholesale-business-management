/* Storage keys */
const STORE_KEYS = {
    products: 'wbms_products',
    suppliers: 'wbms_suppliers',
    customers: 'wbms_customers',
    orders: 'wbms_orders',
    payments: 'wbms_payments',
    notifications: 'wbms_notifications',
    auth: 'wbms_auth',
    currency: 'wbms_currency',
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

/* Auth */
const USERS = {
    admin: { password: 'admin123', role: 'admin' },
    staff: { password: 'staff123', role: 'staff' },
}

export function getAuth() {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.auth)) }
    catch { return null }
}

export function login(username, password) {
    const u = USERS[username.toLowerCase()]
    if (!u || u.password !== password) return null
    const auth = { username: username.toLowerCase(), role: u.role }
    localStorage.setItem(STORE_KEYS.auth, JSON.stringify(auth))
    return auth
}

export function logout() {
    localStorage.removeItem(STORE_KEYS.auth)
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

/* Products */
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

export { STORE_KEYS }
