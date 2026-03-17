import { useState, useMemo } from 'react'
import { getOrders, saveOrders, getProducts, saveProducts, getCustomers, nextId, addNotification, savePayments, getPayments, hasPermission } from '../store'
import { generateInvoice } from '../utils/exportUtils'

export default function Orders({ showToast, formatCurrency, refresh, auth }) {
    const [orders, setOrders] = useState(getOrders())
    const products = getProducts()
    const customers = getCustomers()
    const [form, setForm] = useState({ customerId: '', productId: '', quantity: '', discount: '0', seasonal: false, paymentMethod: 'Cash' })

    // RBAC checks
    const canCreate = hasPermission('orders:create')
    const canEdit = hasPermission('orders:edit')
    const canDelete = hasPermission('orders:delete')

    const reload = () => { setOrders(getOrders()); refresh() }

    // Auto calc
    const calcResult = useMemo(() => {
        const prod = products.find(p => p.id === Number(form.productId))
        if (!prod || !form.quantity || Number(form.quantity) <= 0) return { subtotal: 0, discountAmt: 0, total: 0 }
        const qty = Number(form.quantity)
        const subtotal = prod.price * qty
        let discountPct = Number(form.discount) || 0
        if (form.seasonal) discountPct += 10
        discountPct = Math.min(discountPct, 100)
        const discountAmt = subtotal * (discountPct / 100)
        const total = subtotal - discountAmt
        return { subtotal, discountAmt, total, discountPct }
    }, [form, products])

    const handleRazorpay = (orderData, prod, cust) => {
        const options = {
            key: "rzp_test_dummykey", // In production, move to env
            amount: Math.round(orderData.total * 100),
            currency: "INR",
            name: "SupplyNest Wholesale",
            description: `Order #${orderData.id}`,
            handler: function (response) {
                // Payment success
                const orders = getOrders()
                orderData.razorpayId = response.razorpay_payment_id
                orderData.status = 'Paid'
                orders.push(orderData)
                saveOrders(orders)

                // Record payment
                const payments = getPayments()
                payments.push({
                    id: Date.now(),
                    orderId: orderData.id,
                    customerId: cust.id,
                    amount: orderData.total,
                    method: orderData.paymentMethod,
                    date: new Date().toLocaleDateString(),
                    transactionId: response.razorpay_payment_id
                })
                savePayments(payments)

                // Update stock
                const allProds = getProducts()
                const pi = allProds.findIndex(p => p.id === prod.id)
                if (pi >= 0) { allProds[pi].stock -= orderData.quantity; saveProducts(allProds) }

                showToast('Payment Successful! Order Placed.', 'success')
                addNotification(`Order #${orderData.id} Paid via Razorpay`, 'order')
                generateInvoice(orderData, cust, prod)
                setForm({ customerId: '', productId: '', quantity: '', discount: '0', seasonal: false, paymentMethod: 'Cash' })
                reload()
            },
            prefill: {
                name: cust.name,
                email: cust.email,
                contact: cust.phone
            },
            theme: { color: "#3f51b5" }
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!canCreate) return showToast('⛔ You do not have permission to create orders', 'error')

        const prod = products.find(p => p.id === Number(form.productId))
        const cust = customers.find(c => c.id === Number(form.customerId))
        if (!prod || !cust) return showToast('Select customer and product', 'error')
        const qty = Number(form.quantity)
        if (qty > prod.stock) return showToast('Not enough stock!', 'error')

        const data = getOrders()
        const order = {
            id: nextId(data),
            customerId: cust.id,
            productId: prod.id,
            quantity: qty,
            discount: calcResult.discountPct,
            discountAmt: calcResult.discountAmt,
            total: calcResult.total,
            profit: (prod.price - prod.costPrice) * qty - calcResult.discountAmt,
            status: 'Pending',
            paymentMethod: form.paymentMethod,
            date: new Date().toLocaleDateString(),
        }

        if (['UPI', 'QR Code', 'Debit Card', 'Credit Card'].includes(form.paymentMethod)) {
            handleRazorpay(order, prod, cust)
            return
        }

        // Cash payment
        data.push(order)
        saveOrders(data)

        // Record payment for cash too (as partial or full)
        const payments = getPayments()
        payments.push({
            id: Date.now(),
            orderId: order.id,
            customerId: cust.id,
            amount: order.total,
            method: 'Cash',
            date: new Date().toLocaleDateString()
        })
        savePayments(payments)

        // Update stock
        const allProds = getProducts()
        const pi = allProds.findIndex(p => p.id === prod.id)
        if (pi >= 0) { allProds[pi].stock -= qty; saveProducts(allProds) }

        showToast('Order placed successfully!', 'success')
        addNotification(`Order #${order.id}: ${cust.name} ordered ${prod.name} ×${qty}`, 'order')
        
        // Auto generate PDF for Cash too
        generateInvoice(order, cust, prod)
        
        setForm({ customerId: '', productId: '', quantity: '', discount: '0', seasonal: false, paymentMethod: 'Cash' })
        reload()
    }

    const handleStatus = (id, status) => {
        if (!canEdit) return showToast('⛔ You do not have permission to change order status', 'error')
        const data = getOrders()
        const o = data.find(x => x.id === id)
        if (o) { o.status = status; saveOrders(data); showToast(`Order #${id} marked ${status}`, 'info'); reload() }
    }

    const handleDelete = (id) => {
        if (!canDelete) return showToast('⛔ You do not have permission to delete orders', 'error')
        if (!confirm('Delete this order?')) return
        saveOrders(getOrders().filter(o => o.id !== id))
        showToast('Order deleted', 'error')
        reload()
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Orders</h1>
                <p>Create and track customer orders</p>
            </div>

            {/* Create Order form — staff and admin can both create */}
            {canCreate && (
                <div className="card">
                    <div className="card-title"><span className="icon">➕</span> Create New Order</div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Customer</label>
                                <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required>
                                    <option value="">Select Customer</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Product</label>
                                <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} required>
                                    <option value="">Select Product</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quantity</label>
                                <input type="number" placeholder="0" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Discount (%)</label>
                                <input type="number" placeholder="0" min="0" max="100" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} required>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="QR Code">QR Code</option>
                                    <option value="Debit Card">Debit Card</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>
                                    <input type="checkbox" checked={form.seasonal} onChange={e => setForm({ ...form, seasonal: e.target.checked })} />
                                    Apply Seasonal Offer (10% extra)
                                </label>
                            </div>
                            <div className="form-group">
                                <label>Subtotal <small style={{ color: 'var(--text-secondary)' }}>auto</small></label>
                                <input type="text" value={calcResult.subtotal ? formatCurrency(calcResult.subtotal) : '—'} readOnly />
                            </div>
                            <div className="form-group">
                                <label>Discount Amount <small style={{ color: 'var(--text-secondary)' }}>auto</small></label>
                                <input type="text" value={calcResult.discountAmt ? formatCurrency(calcResult.discountAmt) : '—'} readOnly />
                            </div>
                            <div className="form-group">
                                <label>Final Payable <small style={{ color: 'var(--text-secondary)' }}>auto</small></label>
                                <input type="text" value={calcResult.total ? formatCurrency(calcResult.total) : '—'} readOnly style={{ fontWeight: 700, fontSize: 16 }} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">
                            {['Cash'].includes(form.paymentMethod) ? '🛒 Place Order' : '💳 Proceed to Pay'}
                        </button>
                    </form>
                </div>
            )}

            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Order History</div>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Product</th><th>Qty</th><th>Discount</th><th>Total</th><th>Profit</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">🛒</div><p>No orders placed yet.</p></div></td></tr>
                            ) : [...orders].reverse().map(o => {
                                const prod = products.find(p => p.id === o.productId)
                                const cust = customers.find(c => c.id === o.customerId)
                                const statusClass = o.status === 'Delivered' ? 'status-delivered' : o.status === 'Cancelled' ? 'status-cancelled' : 'status-pending'
                                return (
                                    <tr key={o.id}>
                                        <td><strong>#{o.id}</strong></td>
                                        <td>{o.date}</td>
                                        <td>{cust?.name || '—'}</td>
                                        <td>{prod?.name || '—'}</td>
                                        <td>{o.quantity}</td>
                                        <td>{o.discount ? o.discount + '%' : '—'}</td>
                                        <td className="text-success"><strong>{formatCurrency(o.total)}</strong></td>
                                        <td className={o.profit >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(o.profit || 0)}</td>
                                        <td><span className={`status-badge ${statusClass}`}>{o.status}</span></td>
                                        <td>
                                            <div className="btn-group">
                                                 <button className="btn btn-info btn-sm" title="Download Invoice" onClick={() => generateInvoice(o, cust, prod)}>📄</button>
                                                 {canEdit && o.status === 'Pending' && <button className="btn btn-success btn-sm" onClick={() => handleStatus(o.id, 'Delivered')}>✅</button>}
                                                 {canEdit && o.status === 'Pending' && <button className="btn btn-danger btn-sm" onClick={() => handleStatus(o.id, 'Cancelled')}>❌</button>}
                                                 {canDelete && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(o.id)}>🗑️</button>}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
