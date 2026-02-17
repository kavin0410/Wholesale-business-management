import { useState, useEffect, useMemo } from 'react'
import { getOrders, getProducts, getCustomers, getSuppliers } from '../store'

/* ── Delivery statuses ────────────────────────────────── */
const STATUS_FLOW = ['Packing Order', 'Order Packed', 'Delivery Travelling', 'Delivered']
const STATUS_COLORS = {
    'Packing Order': { bg: 'rgba(148,163,184,0.2)', color: '#94a3b8', label: 'Packing' },
    'Order Packed': { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: 'Packed' },
    'Delivery Travelling': { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', label: 'In Transit' },
    'Delivered': { bg: 'rgba(16,185,129,0.2)', color: '#10b981', label: 'Delivered' },
}

/* ── localStorage helpers for delivery data ─────────── */
const DELIVERY_KEY = 'wbms_deliveries'
function getDeliveries() {
    try { return JSON.parse(localStorage.getItem(DELIVERY_KEY)) || [] }
    catch { return [] }
}
function saveDeliveries(d) { localStorage.setItem(DELIVERY_KEY, JSON.stringify(d)) }

/* Ensure every order has a delivery record */
function syncDeliveries(orders) {
    const existing = getDeliveries()
    const existingOrderIds = new Set(existing.map(d => d.orderId))
    let changed = false
    orders.forEach(o => {
        if (!existingOrderIds.has(o.id)) {
            existing.push({
                id: Date.now() + Math.random(),
                orderId: o.id,
                status: 'Packing Order',
                assignedStaff: null,
                expectedDate: new Date(Date.now() + 3 * 86400000).toLocaleDateString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                timeline: [{ status: 'Packing Order', timestamp: new Date().toISOString(), note: 'Order created, packing started' }],
            })
            changed = true
        }
    })
    if (changed) saveDeliveries(existing)
    return existing
}


export default function DeliveryTracking({ formatCurrency, showToast, auth }) {
    const orders = getOrders()
    const products = getProducts()
    const customers = getCustomers()
    const suppliers = getSuppliers()
    const [deliveries, setDeliveries] = useState([])
    const [selectedOrderId, setSelectedOrderId] = useState(null)

    useEffect(() => {
        setDeliveries(syncDeliveries(orders))
    }, [])

    const handleStatusUpdate = (deliveryId, newStatus) => {
        const all = getDeliveries()
        const d = all.find(x => x.id === deliveryId)
        if (!d) return

        const currentIdx = STATUS_FLOW.indexOf(d.status)
        const targetIdx = STATUS_FLOW.indexOf(newStatus)

        if (targetIdx <= currentIdx) {
            showToast('Cannot move backward', 'error')
            return
        }

        if (auth?.role === 'staff' && targetIdx !== currentIdx + 1) {
            showToast('Staff can only move to the next stage', 'error')
            return
        }

        d.status = newStatus
        d.updatedAt = new Date().toISOString()
        d.timeline.push({ status: newStatus, timestamp: new Date().toISOString(), note: `Status changed to ${newStatus}` })
        saveDeliveries(all)
        setDeliveries([...all])
        showToast(`Delivery updated to "${newStatus}"`, 'success')
    }

    // Detail view
    const selected = useMemo(() => {
        if (!selectedOrderId) return null
        const order = orders.find(o => o.id === selectedOrderId)
        if (!order) return null
        const delivery = deliveries.find(d => d.orderId === selectedOrderId)
        const product = products.find(p => p.id === order.productId)
        const customer = customers.find(c => c.id === order.customerId)
        const supplier = product ? suppliers.find(s => s.id === product.supplierId) : null
        return { order, delivery, product, customer, supplier }
    }, [selectedOrderId, deliveries, orders, products, customers, suppliers])

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>🚚 Delivery Tracking</h1>
                <p>Track and manage order deliveries in real time</p>
            </div>

            {/* Delivery List */}
            {!selectedOrderId && (
                <div className="card">
                    <div className="card-title"><span className="icon">📦</span> All Deliveries</div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>Order #</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Expected</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {deliveries.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🚚</div><p>No deliveries yet. Place an order first!</p></div></td></tr>
                                ) : deliveries.map(d => {
                                    const order = orders.find(o => o.id === d.orderId)
                                    if (!order) return null
                                    const product = products.find(p => p.id === order.productId)
                                    const customer = customers.find(c => c.id === order.customerId)
                                    const sc = STATUS_COLORS[d.status] || STATUS_COLORS['Packing Order']
                                    return (
                                        <tr key={d.id}>
                                            <td><strong>#{order.id}</strong></td>
                                            <td>{customer?.name || '—'}</td>
                                            <td>{product?.name || '—'}</td>
                                            <td className="text-success"><strong>{formatCurrency(order.total)}</strong></td>
                                            <td>
                                                <span className="delivery-badge" style={{ background: sc.bg, color: sc.color }}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td>{d.expectedDate}</td>
                                            <td>
                                                <button className="btn btn-primary btn-sm" onClick={() => setSelectedOrderId(order.id)}>📍 Track</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delivery Detail View */}
            {selected && (
                <div className="delivery-detail-view page-enter">
                    <button className="btn btn-danger" style={{ marginBottom: 24 }} onClick={() => setSelectedOrderId(null)}>
                        ← Back to All Deliveries
                    </button>

                    {/* Timeline Progress */}
                    <div className="card">
                        <div className="card-title"><span className="icon">📍</span> Delivery Timeline</div>
                        <div className="delivery-timeline">
                            {STATUS_FLOW.map((step, i) => {
                                const currentIdx = STATUS_FLOW.indexOf(selected.delivery?.status || 'Packing Order')
                                const isComplete = i <= currentIdx
                                const isCurrent = i === currentIdx
                                const sc = STATUS_COLORS[step]
                                return (
                                    <div key={step} className={`timeline-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                                        <div className="timeline-dot" style={{ background: isComplete ? sc.color : 'rgba(255,255,255,0.1)', boxShadow: isCurrent ? `0 0 16px ${sc.color}` : 'none' }}>
                                            {isComplete ? '✓' : i + 1}
                                        </div>
                                        <div className="timeline-label">{step}</div>
                                        {i < STATUS_FLOW.length - 1 && (
                                            <div className="timeline-connector" style={{ background: i < currentIdx ? sc.color : 'rgba(255,255,255,0.1)' }} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Status buttons (admin/staff) */}
                        {selected.delivery && selected.delivery.status !== 'Delivered' && (
                            <div className="delivery-actions">
                                {STATUS_FLOW.map((step, i) => {
                                    const currentIdx = STATUS_FLOW.indexOf(selected.delivery.status)
                                    if (i <= currentIdx) return null
                                    if (auth?.role === 'staff' && i !== currentIdx + 1) return null
                                    const sc = STATUS_COLORS[step]
                                    return (
                                        <button key={step} className="btn btn-sm" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}` }}
                                            onClick={() => handleStatusUpdate(selected.delivery.id, step)}>
                                            Move to: {step}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Detail Cards */}
                    <div className="delivery-detail-grid">
                        {/* Order Details */}
                        <div className="card">
                            <div className="card-title"><span className="icon">🛒</span> Order Details</div>
                            <div className="detail-rows">
                                <div className="detail-row"><span>Order ID</span><strong>#{selected.order.id}</strong></div>
                                <div className="detail-row"><span>Date</span><strong>{selected.order.date}</strong></div>
                                <div className="detail-row"><span>Product</span><strong>{selected.product?.name || '—'}</strong></div>
                                <div className="detail-row"><span>Quantity</span><strong>{selected.order.quantity}</strong></div>
                                <div className="detail-row"><span>Total</span><strong className="text-success">{formatCurrency(selected.order.total)}</strong></div>
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div className="card">
                            <div className="card-title"><span className="icon">👤</span> Customer Details</div>
                            <div className="detail-rows">
                                <div className="detail-row"><span>Name</span><strong>{selected.customer?.name || '—'}</strong></div>
                                <div className="detail-row"><span>Phone</span><strong>{selected.customer?.phone || '—'}</strong></div>
                                <div className="detail-row"><span>Address</span><strong>{selected.customer?.address || '—'}</strong></div>
                            </div>
                        </div>

                        {/* Supplier Details */}
                        <div className="card">
                            <div className="card-title"><span className="icon">🏭</span> Supplier Details</div>
                            <div className="detail-rows">
                                <div className="detail-row"><span>Supplier</span><strong>{selected.supplier?.name || '—'}</strong></div>
                                <div className="detail-row"><span>Contact</span><strong>{selected.supplier?.phone || '—'}</strong></div>
                            </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="card">
                            <div className="card-title"><span className="icon">🚚</span> Delivery Details</div>
                            <div className="detail-rows">
                                <div className="detail-row"><span>Staff</span><strong>{selected.delivery?.assignedStaff || 'Unassigned'}</strong></div>
                                <div className="detail-row"><span>Expected</span><strong>{selected.delivery?.expectedDate || '—'}</strong></div>
                                <div className="detail-row"><span>Status</span>
                                    <span className="delivery-badge" style={{
                                        background: STATUS_COLORS[selected.delivery?.status]?.bg,
                                        color: STATUS_COLORS[selected.delivery?.status]?.color
                                    }}>
                                        {STATUS_COLORS[selected.delivery?.status]?.label || selected.delivery?.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline History */}
                    {selected.delivery?.timeline && selected.delivery.timeline.length > 0 && (
                        <div className="card">
                            <div className="card-title"><span className="icon">📜</span> Status History</div>
                            <div className="timeline-history">
                                {selected.delivery.timeline.map((entry, i) => {
                                    const sc = STATUS_COLORS[entry.status] || STATUS_COLORS['Packing Order']
                                    return (
                                        <div key={i} className="timeline-history-item">
                                            <div className="th-dot" style={{ background: sc.color }} />
                                            <div className="th-content">
                                                <strong style={{ color: sc.color }}>{entry.status}</strong>
                                                <small>{new Date(entry.timestamp).toLocaleString()}</small>
                                                {entry.note && <p>{entry.note}</p>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
