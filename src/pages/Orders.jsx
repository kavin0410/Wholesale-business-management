import { useState, useEffect, useMemo } from 'react'
import { fetchOrders, fetchProducts, fetchCustomers, createOrder, deleteOrder } from '../api'

export default function Orders({ showToast, formatCurrency, refresh }) {
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([])
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ customerId: '', productId: '', quantity: '' })

    const loadData = () => {
        setLoading(true)
        Promise.all([fetchOrders(), fetchProducts(), fetchCustomers()])
            .then(([o, p, c]) => { setOrders(o); setProducts(p); setCustomers(c) })
            .catch(err => { console.error(err); showToast('Failed to load data', 'error') })
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadData() }, [])

    // Auto calc
    const calcResult = useMemo(() => {
        const prod = products.find(p => p.id === Number(form.productId))
        if (!prod || !form.quantity || Number(form.quantity) <= 0) return { subtotal: 0, total: 0 }
        const qty = Number(form.quantity)
        const subtotal = prod.price * qty
        return { subtotal, total: subtotal }
    }, [form, products])

    const handleSubmit = async (e) => {
        e.preventDefault()
        const prod = products.find(p => p.id === Number(form.productId))
        if (!form.customerId || !prod) return showToast('Select customer and product', 'error')
        const qty = Number(form.quantity)
        if (qty > prod.stock) return showToast('Not enough stock!', 'error')

        try {
            await createOrder({
                customer_id: Number(form.customerId),
                items: [{ product_id: prod.id, quantity: qty }]
            })
            showToast('Order placed successfully!', 'success')
            setForm({ customerId: '', productId: '', quantity: '' })
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error placing order', 'error')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this order?')) return
        try {
            await deleteOrder(id)
            showToast('Order deleted', 'error')
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error deleting order', 'error')
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Orders</h1>
                <p>Create and track customer orders</p>
            </div>

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
                            <label>Subtotal <small style={{ color: 'var(--text-secondary)' }}>auto</small></label>
                            <input type="text" value={calcResult.subtotal ? formatCurrency(calcResult.subtotal) : '—'} readOnly />
                        </div>
                        <div className="form-group">
                            <label>Final Payable <small style={{ color: 'var(--text-secondary)' }}>auto</small></label>
                            <input type="text" value={calcResult.total ? formatCurrency(calcResult.total) : '—'} readOnly style={{ fontWeight: 700, fontSize: 16 }} />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary">🛒 Place Order</button>
                </form>
            </div>

            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Order History</div>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🛒</div><p>No orders placed yet.</p></div></td></tr>
                                ) : orders.map(o => {
                                    const itemsSummary = (o.items || []).map(i => `${i.product_name || 'Item'} ×${i.quantity}`).join(', ')
                                    const statusClass = o.payment_status === 'Paid' ? 'status-delivered' : o.payment_status === 'Partial' ? 'status-pending' : 'status-cancelled'
                                    return (
                                        <tr key={o.id}>
                                            <td><strong>#{o.id}</strong></td>
                                            <td>{o.order_date}</td>
                                            <td>{o.customer_name || '—'}</td>
                                            <td>{itemsSummary || '—'}</td>
                                            <td className="text-success"><strong>{formatCurrency(o.total_amount)}</strong></td>
                                            <td><span className={`status-badge ${statusClass}`}>{o.payment_status || 'Pending'}</span></td>
                                            <td>
                                                <div className="btn-group">
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(o.id)}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
