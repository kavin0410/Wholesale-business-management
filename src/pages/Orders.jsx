import { useState, useMemo, useEffect, useRef } from 'react'
import { fetchOrders, createOrderApi, updateOrderStatusApi, deleteOrderApi, fetchProducts, fetchCustomers, createPaymentApi, addNotification, hasPermission } from '../store'
import { generateInvoice } from '../utils/exportUtils'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { PAYPAL_BASE_URL } from '../utils/api'

export default function Orders({ showToast, formatCurrency, refresh, auth }) {
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([])
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ customerId: '', productId: '', quantity: '', discount: '0', seasonal: false, paymentMethod: 'Cash' })
    const pendingOrderId = useRef(null)

    // RBAC checks
    const canCreate = hasPermission('orders:create')
    const canEdit = hasPermission('orders:edit')
    const canDelete = hasPermission('orders:delete')

    const loadPageData = async () => {
        setLoading(true)
        try {
            const [ordersRes, prodsRes, custsRes] = await Promise.all([
                fetchOrders(),
                fetchProducts(),
                fetchCustomers()
            ])
            if (ordersRes) setOrders(ordersRes.data)
            if (prodsRes) setProducts(prodsRes.data)
            if (custsRes) setCustomers(custsRes.data)
        } catch (err) {
            console.error('Failed to load page data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadPageData()
    }, [])

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



    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!canCreate) return showToast('⛔ You do not have permission to create orders', 'error')

        const prod = products.find(p => p.id === Number(form.productId))
        const cust = customers.find(c => c.id === Number(form.customerId))
        if (!prod || !cust) return showToast('Select customer and product', 'error')
        const qty = Number(form.quantity)
        if (qty > prod.stock) return showToast('Not enough stock!', 'error')



        // Cash payment
        setSubmitting(true)
        try {
            const result = await createOrderApi(form)
            if (result.success) {
                const orderId = result.data.id
                
                // If Cash, auto-record the payment immediately
                if (form.paymentMethod === 'Cash') {
                    await createPaymentApi({
                        orderId: orderId,
                        amount: calcResult.total,
                        method: 'Cash'
                    })
                }

                showToast('Order placed successfully!', 'success')
                addNotification(`Order #${orderId}: ${cust.name} ordered ${prod.name} ×${qty}`, 'order')
                
                const orderDataForInvoice = {
                    id: orderId,
                    ...form,
                    total: calcResult.total,
                    discountAmt: calcResult.discountAmt,
                    date: new Date().toLocaleDateString(),
                    staffName: auth?.username || '—'
                }
                generateInvoice(orderDataForInvoice, cust, prod)
                
                setForm({ customerId: '', productId: '', quantity: '', discount: '0', seasonal: false, paymentMethod: 'Cash' })
                loadPageData()
            } else {
                showToast(result.message || 'Failed to place order', 'error')
            }
        } catch (error) {
            showToast('API Connection Error', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleStatus = async (id, status) => {
        if (!canEdit) return showToast('⛔ You do not have permission to change order status', 'error')
        const success = await updateOrderStatusApi(id, status)
        if (success) {
            showToast(`Order #${id} marked ${status}`, 'info')
            loadPageData()
        } else {
            showToast('Failed to update status', 'error')
        }
    }

    const handleDelete = async (id) => {
        if (!canDelete) return showToast('⛔ You do not have permission to delete orders', 'error')
        if (!confirm('Delete this order?')) return
        const success = await deleteOrderApi(id)
        if (success) {
            showToast('Order deleted', 'error')
            loadPageData()
        } else {
            showToast('Failed to delete order', 'error')
        }
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
                                    <option value="Cash">Cash (Direct Offline)</option>
                                    <option value="PayPal">PayPal (Online)</option>
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
                        {form.paymentMethod === 'PayPal' ? (
                            <div style={{ marginTop: '20px', maxWidth: '400px' }}>
                                <PayPalScriptProvider options={{ "client-id": "AdTxu8LGaZsrg-u6u9wPgAHLs-H8jkqJ9dFQcAXAM6tKkKU2Ds6HSpp2Gqe379kQ2sRC3hD4_SOBdV5z", currency: "USD" }}>
                                    <PayPalButtons
                                        disabled={!form.customerId || !form.productId || Number(form.quantity) <= 0 || !calcResult.total}
                                        createOrder={async () => {
                                            const prod = products.find(p => p.id === Number(form.productId))
                                            const qty = Number(form.quantity)
                                            if (qty > (prod?.stock || 0)) {
                                                showToast('Not enough stock!', 'error')
                                                throw new Error('Insufficient stock')
                                            }

                                            // 1. Create DB Order First (Python Backend)
                                            const result = await createOrderApi(form)
                                            if (!result.success) {
                                                showToast(result.message || 'Failed to place order in DB', 'error')
                                                throw new Error('DB Order Creation Failed')
                                            }
                                            pendingOrderId.current = result.data.id

                                            // 2. Create PayPal Order (Node Backend at :5000)
                                            console.log("DEBUG: Calling PayPal backend for order creation...");
                                            const res = await fetch(`${PAYPAL_BASE_URL}/create-order`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ amount: calcResult.total })
                                            });
                                            const data = await res.json();
                                            if (data.error) {
                                                showToast(data.error, "error")
                                                throw new Error(data.error)
                                            }
                                            return data.id;
                                        }}
                                        onApprove={async (data, actions) => {
                                            console.log("DEBUG: Calling PayPal backend for payment capture...");
                                            try {
                                                const res = await fetch(`${PAYPAL_BASE_URL}/capture-order`, {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ 
                                                        orderId: data.orderID,
                                                        dbOrderId: pendingOrderId.current 
                                                    })
                                                });
                                                const captureData = await res.json();
                                                
                                                if (captureData.success || captureData.status === "COMPLETED") {
                                                    showToast("Payment Successful!", "success");
                                                    setForm({ customerId: '', productId: '', quantity: '', discount: '0', seasonal: false, paymentMethod: 'Cash' });
                                                    
                                                    addNotification(`Order #${pendingOrderId.current}: Paid online via PayPal`, 'order');
                                                    alert("Payment Successful!");
                                                    location.reload();
                                                } else {
                                                    console.error("Capture Failed Response:", captureData);
                                                    showToast(captureData.error || "Payment capture failed on server", "error");
                                                }
                                            } catch (catchErr) {
                                                console.error("Capture Logic Error:", catchErr);
                                                showToast("Connection to Payment Backend failed", "error");
                                            }
                                        }}
                                        onError={(err) => {
                                            console.error("PayPal Script/SDK Error:", err);
                                            alert("PayPal Payment Failed. Please check console for details or ensure backend is running.");
                                            showToast("PayPal Payment Failed", "error");
                                        }}
                                    />
                                </PayPalScriptProvider>
                            </div>
                        ) : (
                            <button type="submit" className="btn btn-primary">🛒 Place Order</button>
                        )}
                    </form>
                </div>
            )}

            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Order History</div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Product</th><th>Placed By</th><th>Qty</th><th>Discount</th><th>Total</th><th>Profit</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan={11}><div className="empty-state"><div className="empty-icon">🛒</div><p>No orders placed yet.</p></div></td></tr>
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
                                        <td>{o.staffName || '—'}</td>
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
