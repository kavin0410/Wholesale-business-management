import { useState, useEffect, useMemo } from 'react'
import { fetchProducts, fetchCustomers, fetchOrders, fetchPayments, fetchDashboardStats } from '../api'

export default function Dashboard({ currency, formatCurrency }) {
    const [products, setProducts] = useState([])
    const [customers, setCustomers] = useState([])
    const [orders, setOrders] = useState([])
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([fetchProducts(), fetchCustomers(), fetchOrders(), fetchPayments()])
            .then(([p, c, o, pay]) => {
                setProducts(p)
                setCustomers(c)
                setOrders(o)
                setPayments(pay)
            })
            .catch(err => console.error('Dashboard fetch error:', err))
            .finally(() => setLoading(false))
    }, [])

    const totalSales = orders.reduce((s, o) => s + (o.total_amount || 0), 0)
    const totalCost = orders.reduce((s, o) => {
        // Approximate cost from items
        return s + (o.items || []).reduce((is, item) => {
            const prod = products.find(p => p.id === item.product_id)
            return is + (prod ? prod.cost_price * item.quantity : 0)
        }, 0)
    }, 0)
    const totalProfit = totalSales - totalCost
    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0.0'
    const totalPaid = payments.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0)
    const pendingAmt = totalSales - totalPaid

    // Recent orders (last 5)
    const recentOrders = useMemo(() => {
        return orders.slice(0, 5)
    }, [orders])

    // Low stock alerts
    const lowStock = useMemo(() => {
        return products.filter(p => p.stock <= 10)
    }, [products])

    // Smart suggestions
    const freqOrdered = useMemo(() => {
        const counts = {}
        orders.forEach(o => {
            (o.items || []).forEach(item => {
                const name = item.product_name || 'Unknown'
                counts[name] = (counts[name] || 0) + item.quantity
            })
        })
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    }, [orders])

    const restockItems = useMemo(() => {
        return products.filter(p => p.stock <= 5).slice(0, 5)
    }, [products])

    if (loading) {
        return <div className="page-enter"><div className="card"><p style={{ textAlign: 'center', padding: 40 }}>Loading dashboard...</p></div></div>
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Overview of your wholesale business at a glance</p>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">📦</div>
                    <div className="stat-info">
                        <h3>{products.length}</h3>
                        <p>Total Products</p>
                        <span className="stat-growth up">↑ Active</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">👥</div>
                    <div className="stat-info">
                        <h3>{customers.length}</h3>
                        <p>Total Customers</p>
                        <span className="stat-growth up">↑ Growing</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">🛒</div>
                    <div className="stat-info">
                        <h3>{orders.length}</h3>
                        <p>Total Orders</p>
                        <span className="stat-growth up">↑ {orders.length > 0 ? '+' + orders.length : '0'}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">💰</div>
                    <div className="stat-info">
                        <h3>{formatCurrency(totalSales)}</h3>
                        <p>Total Sales</p>
                        <span className="stat-growth up">↑ Revenue</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teal">📊</div>
                    <div className="stat-info">
                        <h3>{formatCurrency(totalProfit)}</h3>
                        <p>Net Profit</p>
                        <span className={`stat-growth ${totalProfit >= 0 ? 'up' : 'down'}`}>
                            {totalProfit >= 0 ? '↑' : '↓'} {profitMargin}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Profit Summary */}
            <div className="card">
                <div className="card-title"><span className="icon">💹</span> Profit Summary</div>
                <div className="profit-summary-grid">
                    <div className="profit-metric">
                        <h4>Total Revenue</h4>
                        <div className="profit-value">{formatCurrency(totalSales)}</div>
                    </div>
                    <div className="profit-metric">
                        <h4>Total Cost</h4>
                        <div className="profit-value text-warning">{formatCurrency(totalCost)}</div>
                    </div>
                    <div className="profit-metric">
                        <h4>Net Profit</h4>
                        <div className="profit-value text-success">{formatCurrency(totalProfit)}</div>
                    </div>
                    <div className="profit-metric">
                        <h4>Profit Margin</h4>
                        <div className="profit-value text-info">{profitMargin}%</div>
                    </div>
                </div>
            </div>

            {/* Quick Info */}
            <div className="quick-info-grid">
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-title"><span className="icon">🕐</span> Recent Orders</div>
                    <ul className="recent-list">
                        {recentOrders.length === 0 ? (
                            <li className="empty-state">
                                <div className="empty-icon">📋</div>
                                <p>No orders yet. Create your first order!</p>
                            </li>
                        ) : (
                            recentOrders.map(o => {
                                const itemNames = (o.items || []).map(i => i.product_name).join(', ') || 'Items'
                                return (
                                    <li key={o.id}>
                                        <strong>#{o.id}</strong> — {o.customer_name || 'Unknown'} ordered {itemNames}
                                        <span style={{ float: 'right', fontWeight: 700, color: 'var(--success)' }}>
                                            {formatCurrency(o.total_amount)}
                                        </span>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-title"><span className="icon">⭐</span> Low Stock Alerts</div>
                    <ul className="recent-list">
                        {lowStock.length === 0 ? (
                            <li className="empty-state">
                                <div className="empty-icon">✅</div>
                                <p>All products are well stocked.</p>
                            </li>
                        ) : (
                            lowStock.map(p => (
                                <li key={p.id}>
                                    📦 <strong>{p.name}</strong>
                                    <span style={{ float: 'right', color: p.stock <= 5 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                                        {p.stock} left
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Smart Suggestions */}
            <div className="card" style={{ marginTop: 28 }}>
                <div className="card-title"><span className="icon">🧠</span> Smart Suggestions</div>
                <div className="suggestions-grid">
                    <div className="suggestion-box">
                        <h4>🔥 Frequently Ordered</h4>
                        <ul>
                            {freqOrdered.length === 0 ? (
                                <li className="muted">No data yet</li>
                            ) : (
                                freqOrdered.map(([name, qty], i) => (
                                    <li key={i}>{name} — <strong>{qty} units</strong></li>
                                ))
                            )}
                        </ul>
                    </div>
                    <div className="suggestion-box">
                        <h4>📦 Restock Recommendations</h4>
                        <ul>
                            {restockItems.length === 0 ? (
                                <li className="muted">No data yet</li>
                            ) : (
                                restockItems.map(p => (
                                    <li key={p.id}>{p.name} — <strong style={{ color: 'var(--danger)' }}>{p.stock} left</strong></li>
                                ))
                            )}
                        </ul>
                    </div>
                    <div className="suggestion-box">
                        <h4>💳 Payment Status</h4>
                        <ul>
                            <li>Received: <strong className="text-success">{formatCurrency(totalPaid)}</strong></li>
                            <li>Pending: <strong className="text-warning">{formatCurrency(pendingAmt)}</strong></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
