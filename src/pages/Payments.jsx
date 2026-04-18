import { useState, useEffect } from 'react'
import { fetchPayments, createPaymentApi, fetchPaymentSummaryApi, fetchOrders, fetchCustomers, addNotification, hasPermission, updateOrderStatusApi } from '../store'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { PAYPAL_BASE_URL } from '../utils/api'

export default function Payments({ showToast, formatCurrency, refresh, auth }) {
    const [payments, setPayments] = useState([])
    const [orders, setOrders] = useState([])
    const [customers, setCustomers] = useState([])
    const [summary, setSummary] = useState({ total_revenue: 0, total_paid: 0, pending: 0 })
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ orderId: '', amount: '', method: '' })

    // RBAC checks
    const canCreate = hasPermission('payments:create')

    const loadData = async () => {
        setLoading(true)
        try {
            const [payRes, ordRes, custRes, summRes] = await Promise.all([
                fetchPayments(),
                fetchOrders(),
                fetchCustomers(),
                fetchPaymentSummaryApi()
            ])
            setPayments(payRes.data)
            setOrders(ordRes.data)
            setCustomers(custRes.data)
            if (summRes) setSummary(summRes)
        } catch (err) {
            showToast('Failed to load payment data', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!canCreate) return showToast('⛔ You do not have permission to record payments', 'error')

        const order = orders.find(o => o.id === Number(form.orderId))
        if (!order) return showToast('Select a valid order', 'error')
        const cust = customers.find(c => c.id === order.customerId)

        setSubmitting(true)
        try {
            const success = await createPaymentApi({
                orderId: order.id,
                amount: form.amount,
                method: form.method
            })

            if (success) {
                showToast('Payment recorded!', 'success')
                addNotification(`Payment of ₹${form.amount} received from ${cust?.name || 'customer'}`, 'payment')
                setForm({ orderId: '', amount: '', method: '' })
                loadData()
            } else {
                showToast('Failed to record payment', 'error')
            }
        } catch (err) {
            showToast('API Connection Error', 'error')
        } finally {
            setSubmitting(false)
        }
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
                    <div className="amount text-success">{formatCurrency(summary.total_revenue || 0)}</div>
                </div>
                <div className="payment-summary-card">
                    <h4>Payments Received</h4>
                    <div className="amount text-success">{formatCurrency(summary.total_paid || 0)}</div>
                </div>
                <div className="payment-summary-card">
                    <h4>Pending Amount</h4>
                    <div className="amount text-warning">{formatCurrency(summary.pending || 0)}</div>
                </div>
            </div>

            {/* Record Payment form — admin only */}
            {canCreate && (
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
                                    <option value="PayPal">PayPal (Online)</option>
                                </select>
                            </div>
                        </div>

                        {form.method === 'PayPal' ? (
                            <div style={{ marginTop: '20px', maxWidth: '400px' }}>
                                <PayPalScriptProvider options={{ "client-id": "AdTxu8LGaZsrg-u6u9wPgAHLs-H8jkqJ9dFQcAXAM6tKkKU2Ds6HSpp2Gqe379kQ2sRC3hD4_SOBdV5z", currency: "USD" }}>
                                    <PayPalButtons
                                        disabled={!form.orderId || !form.amount || Number(form.amount) <= 0}
                                        createOrder={async () => {
                                            const res = await fetch(`${PAYPAL_BASE_URL}/create-order`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ amount: form.amount })
                                            });
                                            const data = await res.json();
                                            if (data.error) {
                                              showToast(data.error, "error");
                                              throw new Error(data.error);
                                            }
                                            return data.id;
                                        }}
                                        onApprove={async (data, actions) => {
                                             try {
                                                 const res = await fetch(`${PAYPAL_BASE_URL}/capture-order`, {
                                                     method: "POST",
                                                     headers: { "Content-Type": "application/json" },
                                                     body: JSON.stringify({ 
                                                         orderId: data.orderID,
                                                         dbOrderId: Number(form.orderId)
                                                     })
                                                 });
                                                 const captureData = await res.json();
                                                 if (captureData.success || captureData.status === "COMPLETED") {
                                                     showToast("Payment Successful", "success");
                                                     setForm({ orderId: '', amount: '', method: '' });
                                                     loadData();
                                                     alert("Payment Successful!");
                                                 } else {
                                                     console.error("Payment capture failed:", captureData);
                                                     showToast(captureData.error || "Payment failed", "error");
                                                 }
                                             } catch (err) {
                                                 console.error("Capture Error:", err);
                                                 showToast("Connection to Payment Backend failed", "error");
                                             }
                                         }}
                                         onError={(err) => {
                                             console.error("PayPal Script/SDK Error:", err);
                                             alert("PayPal Payment Failed. Check console.");
                                             showToast("PayPal Error. Is the backend running?", "error");
                                         }}
                                    />
                                </PayPalScriptProvider>
                            </div>
                        ) : (
                            <button type="submit" className="btn btn-success">💳 Record Payment</button>
                        )}
                    </form>
                </div>
            )}

            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Payment History</div>
                <div className="table-responsive">
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
