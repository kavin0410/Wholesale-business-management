import { useState, useEffect, useMemo } from 'react'
import { fetchDeliveriesApi, updateDeliveryStatusApi, fetchDeliveryByIdApi, hasPermission } from '../store'

/* ── Delivery statuses ────────────────────────────────── */
const STATUS_FLOW = ['Packing Order', 'Order Packed', 'Delivery Travelling', 'Delivered']
const STATUS_COLORS = {
    'Packing Order': { bg: 'rgba(148,163,184,0.2)', color: '#94a3b8', label: 'Packing' },
    'Order Packed': { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: 'Packed' },
    'Delivery Travelling': { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', label: 'In Transit' },
    'Delivered': { bg: 'rgba(16,185,129,0.2)', color: '#10b981', label: 'Delivered' },
}

export default function DeliveryTracking({ formatCurrency, showToast, auth }) {
    const [deliveries, setDeliveries] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrderId, setSelectedOrderId] = useState(null)
    const [selectedBatch, setSelectedBatch] = useState(null) // Full detail from backend

    const canEdit = hasPermission('delivery:edit')

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchDeliveriesApi()
            setDeliveries(data)
        } catch (err) {
            showToast('Failed to load deliveries', 'error')
        } finally {
            setLoading(false)
        }
    }

    const loadDetail = async (orderId) => {
        setLoading(true)
        try {
            const data = await fetchDeliveryByIdApi(orderId)
            setSelectedBatch(data)
            setSelectedOrderId(orderId)
        } catch (err) {
            showToast('Failed to load delivery details', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleStatusUpdate = async (deliveryId, newStatus) => {
        if (!canEdit) return showToast('⛔ Permission denied', 'error')
        
        const currentIdx = STATUS_FLOW.indexOf(selectedBatch.status)
        const targetIdx = STATUS_FLOW.indexOf(newStatus)

        if (targetIdx <= currentIdx) {
            showToast('Cannot move backward', 'error')
            return
        }

        if (auth?.role === 'staff' && targetIdx !== currentIdx + 1) {
            showToast('Staff can only move to the next stage', 'error')
            return
        }

        const success = await updateDeliveryStatusApi(deliveryId, newStatus)
        if (success) {
            showToast(`Delivery updated to "${newStatus}"`, 'success')
            loadDetail(selectedOrderId) // Reload details
            loadData() // Reload main list
        } else {
            showToast('Failed to update status', 'error')
        }
    }

    if (loading && !deliveries.length && !selectedBatch) {
        return <div className="page-enter"><div className="loading-state">Loading Tracking Data...</div></div>
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>🚚 Delivery Tracking</h1>
                <p>Track and manage order deliveries in real time (Backend Powered)</p>
            </div>

            {/* Delivery List */}
            {!selectedOrderId && (
                <div className="card">
                    <div className="card-title"><span className="icon">📦</span> All Deliveries</div>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr><th>Order #</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Expected</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {deliveries.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🚚</div><p>No deliveries found.</p></div></td></tr>
                                ) : deliveries.map(d => {
                                    const sc = STATUS_COLORS[d.status] || STATUS_COLORS['Packing Order']
                                    return (
                                        <tr key={d.id}>
                                            <td><strong>#{d.order_id}</strong></td>
                                            <td>{d.customer_name}</td>
                                            <td>{d.product_name}</td>
                                            <td className="text-success"><strong>{formatCurrency(d.order_total)}</strong></td>
                                            <td>
                                                <span className="delivery-badge" style={{ background: sc.bg, color: sc.color }}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td>{new Date(d.expected_date).toLocaleDateString()}</td>
                                            <td>
                                                <button className="btn btn-primary btn-sm" onClick={() => loadDetail(d.order_id)}>📍 Track</button>
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
            {selectedOrderId && selectedBatch && (
                <div className="delivery-detail-view page-enter">
                    <button className="btn btn-danger" style={{ marginBottom: 24 }} onClick={() => { setSelectedOrderId(null); setSelectedBatch(null); }}>
                        ← Back to All Deliveries
                    </button>

                    {/* Timeline Progress */}
                    <div className="card">
                        <div className="card-title"><span className="icon">📍</span> Delivery Timeline</div>
                        <div className="delivery-timeline">
                            {STATUS_FLOW.map((step, i) => {
                                const currentIdx = STATUS_FLOW.indexOf(selectedBatch.status)
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
                        {canEdit && selectedBatch.status !== 'Delivered' && (
                            <div className="delivery-actions">
                                {STATUS_FLOW.map((step, i) => {
                                    const currentIdx = STATUS_FLOW.indexOf(selectedBatch.status)
                                    if (i <= currentIdx) return null
                                    if (auth?.role === 'staff' && i !== currentIdx + 1) return null
                                    const sc = STATUS_COLORS[step]
                                    return (
                                        <button key={step} className="btn btn-sm" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}` }}
                                            onClick={() => handleStatusUpdate(selectedBatch.id, step)}>
                                            Move to: {step}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Timeline History */}
                    {selectedBatch.timeline && selectedBatch.timeline.length > 0 && (
                        <div className="card">
                            <div className="card-title"><span className="icon">📜</span> Status History</div>
                            <div className="timeline-history">
                                {selectedBatch.timeline.map((entry, i) => {
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
