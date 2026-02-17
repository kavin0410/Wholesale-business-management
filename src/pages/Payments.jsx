import { useState } from 'react'
import { getPayments, savePayments, getOrders, getCustomers, nextId, addNotification } from '../store'

export default function Payments({ showToast, formatCurrency, refresh }) {
    const [payments, setPayments] = useState(getPayments())
    const orders = getOrders()
    const customers = getCustomers()
    const [form, setForm] = useState({ orderId: '', amount: '', method: '' })

    const reload = () => { setPayments(getPayments()); refresh() }

    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)
    const pending = totalRevenue - totalPaid

    const handleSubmit = (e) => {
        e.preventDefault()
        const order = orders.find(o => o.id === Number(form.orderId))
        if (!order) return showToast('Select a valid order', 'error')
        const cust = customers.find(c => c.id === order.customerId)

        const data = getPayments()
        const payment = {
            id: nextId(data),
            orderId: order.id,
            customerId: order.customerId,
            amount: Number(form.amount),
            method: form.method,
            date: new Date().toLocaleDateString(),
        }
        data.push(payment)
        savePayments(data)
        showToast('Payment recorded!', 'success')
        addNotification(`Payment of ₹${form.amount} received from ${cust?.name || 'customer'}`, 'payment')
        setForm({ orderId: '', amount: '', method: '' })
        reload()
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Payments</h1>
                <p>Track order payments and outstanding balances</p>
            </div>

            <div className="payment-summary-grid">
                <div className="payment-summary-card">
                    <h4>Total Revenue</h4>
                    <div className="amount text-success">{formatCurrency(totalRevenue)}</div>
                </div>
                <div className="payment-summary-card">
                    <h4>Payments Received</h4>
                    <div className="amount text-success">{formatCurrency(totalPaid)}</div>
                </div>
                <div className="payment-summary-card">
                    <h4>Pending Amount</h4>
                    <div className="amount text-warning">{formatCurrency(pending)}</div>
                </div>
            </div>

            <div className="card">
                <div className="card-title"><span className="icon">💳</span> Record Payment</div>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Order</label>
                            <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} required>
                                <option value="">Select Order</option>
                                {orders.map(o => {
                                    const cust = customers.find(c => c.id === o.customerId)
                                    return <option key={o.id} value={o.id}>#{o.id} — {cust?.name || 'Unknown'} ({formatCurrency(o.total)})</option>
                                })}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Amount (₹)</label>
                            <input type="number" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Method</label>
                            <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} required>
                                <option value="">Select Method</option>
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="UPI">UPI</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Credit">Credit</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-success">💳 Record Payment</button>
                </form>
            </div>

            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Payment History</div>
                <div className="table-wrapper">
                    <table>
                        <thead><tr><th>#</th><th>Date</th><th>Order #</th><th>Customer</th><th>Amount</th><th>Method</th></tr></thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">💳</div><p>No payments recorded yet.</p></div></td></tr>
                            ) : [...payments].reverse().map((p, i) => {
                                const cust = customers.find(c => c.id === p.customerId)
                                return (
                                    <tr key={p.id}>
                                        <td>{i + 1}</td>
                                        <td>{p.date}</td>
                                        <td><strong>#{p.orderId}</strong></td>
                                        <td>{cust?.name || '—'}</td>
                                        <td className="text-success"><strong>{formatCurrency(p.amount)}</strong></td>
                                        <td><span className="status-badge status-delivered">{p.method}</span></td>
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
