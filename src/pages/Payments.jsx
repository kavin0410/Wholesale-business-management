import { useState, useEffect } from 'react'
import { fetchPayments, fetchOrders, fetchCustomers, updatePayment } from '../api'

export default function Payments({ showToast, formatCurrency, refresh }) {
    const [payments, setPayments] = useState([])
    const [orders, setOrders] = useState([])
    // eslint-disable-next-line no-unused-vars
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingPayment, setEditingPayment] = useState(null)

    const loadData = () => {
        setLoading(true)
        Promise.all([fetchPayments(), fetchOrders(), fetchCustomers()])
            .then(([pay, ord, cust]) => { setPayments(pay); setOrders(ord); setCustomers(cust) })
            .catch(err => { console.error(err); showToast('Failed to load payments', 'error') })
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadData() }, [])

    const handleEditClick = (payment) => {
        setEditingPayment({ ...payment })
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        if (!editingPayment) return

        try {
            await updatePayment(editingPayment.id, {
                amount: parseFloat(editingPayment.amount),
                payment_status: editingPayment.payment_status,
                payment_date: editingPayment.payment_date
            })
            showToast('Payment updated successfully', 'success')
            setEditingPayment(null)
            loadData()
            refresh() // Refresh global stats if needed
        } catch (err) {
            console.error(err)
            showToast('Failed to update payment', 'error')
        }
    }

    const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0)
    const totalPaid = payments.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0)
    const pending = totalRevenue - totalPaid

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
                <div className="card-title"><span className="icon">📋</span> Payment Records</div>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>#</th><th>Date</th><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">💳</div><p>No payments recorded yet.</p></div></td></tr>
                                ) : payments.map((p, i) => {
                                    const statusClass = p.payment_status === 'Paid' ? 'status-delivered' : p.payment_status === 'Partial' ? 'status-pending' : 'status-cancelled'
                                    return (
                                        <tr key={p.id}>
                                            <td>{i + 1}</td>
                                            <td>{p.payment_date}</td>
                                            <td><strong>#{p.order_id}</strong></td>
                                            <td>{p.customer_name || '—'}</td>
                                            <td className="text-success"><strong>{formatCurrency(p.amount)}</strong></td>
                                            <td><span className={`status-badge ${statusClass}`}>{p.payment_status}</span></td>
                                            <td>
                                                <button className="btn-small" onClick={() => handleEditClick(p)}>Edit</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingPayment && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Update Payment #{editingPayment.id}</h3>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label>Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingPayment.amount}
                                    onChange={e => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={editingPayment.payment_status}
                                    onChange={e => setEditingPayment({ ...editingPayment, payment_status: e.target.value })}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Paid">Paid</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={editingPayment.payment_date}
                                    onChange={e => setEditingPayment({ ...editingPayment, payment_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setEditingPayment(null)}>Cancel</button>
                                <button type="submit" className="btn-primary">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
