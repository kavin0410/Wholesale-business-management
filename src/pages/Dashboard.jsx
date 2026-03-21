import { useMemo, useState, useEffect } from 'react'
import { isAdmin, fetchAllPerformance } from '../store'
import { api } from '../utils/api'

export default function Dashboard({ currency, formatCurrency, auth, refresh, showToast }) {
    const userIsAdmin = isAdmin()
    const [performance, setPerformance] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await api.get('/dashboard/stats')
            if (res.success) setStats(res.data)
            
            if (userIsAdmin) {
                const perf = await fetchAllPerformance()
                setPerformance(perf)
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [userIsAdmin])

    if (loading) return <div className="page-enter"><div className="loading-state">Loading Store Insights...</div></div>
    if (!stats) return <div className="page-enter">Failed to load stats.</div>

    return (
        <div className="page-enter">
            <div className="page-header">
                <div style={{ flex: 1 }}>
                    <h1>Dashboard</h1>
                    <p>{userIsAdmin ? 'Overview of your wholesale business' : `Welcome back, ${auth?.username}!`}</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">📦</div>
                    <div className="stat-info">
                        <h3>{stats.total_products}</h3>
                        <p>Total Products</p>
                        <span className="stat-growth up">↑ Live</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">👥</div>
                    <div className="stat-info">
                        <h3>{stats.total_customers}</h3>
                        <p>Total Customers</p>
                        <span className="stat-growth up">↑ Database</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">🛒</div>
                    <div className="stat-info">
                        <h3>{stats.total_orders}</h3>
                        <p>Total Orders</p>
                        <span className="stat-growth up">↑ Volume</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">💰</div>
                    <div className="stat-info">
                        <h3>{formatCurrency(stats.total_sales)}</h3>
                        <p>Total Sales</p>
                        <span className="stat-growth up">↑ Revenue</span>
                    </div>
                </div>
                {userIsAdmin && (
                    <div className="stat-card">
                        <div className="stat-icon teal">📊</div>
                        <div className="stat-info">
                            <h3>{formatCurrency(stats.total_profit)}</h3>
                            <p>Net Profit</p>
                            <span className="stat-growth up">↑ {stats.profit_margin}% Margin</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Info */}
            <div className="quick-info-grid">
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-title"><span className="icon">🕐</span> Recent Orders</div>
                    <ul className="recent-list">
                        {!stats.recent_orders?.length ? (
                            <li className="empty-state">
                                <div className="empty-icon">📋</div>
                                <p>No orders yet. Create your first order!</p>
                            </li>
                        ) : (
                            stats.recent_orders.map(o => (
                                <li key={o.id}>
                                    <strong>#{o.id}</strong> — {o.customer_name} ordered {o.product_name} × {o.quantity}
                                    <span style={{ float: 'right', fontWeight: 700, color: 'var(--success)' }}>
                                        {formatCurrency(o.total)}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-title"><span className="icon">⭐</span> Low Stock Alerts</div>
                    <ul className="recent-list">
                        {!stats.low_stock?.length ? (
                            <li className="empty-state">
                                <div className="empty-icon">✅</div>
                                <p>All products are well stocked.</p>
                            </li>
                        ) : (
                            stats.low_stock.map(p => (
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

            {/* Financial Summary — admin only */}
            {userIsAdmin && (
                <div className="card" style={{ marginTop: 28 }}>
                    <div className="card-title"><span className="icon">💹</span> Financial Overview</div>
                    <div className="profit-summary-grid">
                        <div className="profit-metric">
                            <h4>Total Revenue</h4>
                            <div className="profit-value">{formatCurrency(stats.total_sales)}</div>
                        </div>
                        <div className="profit-metric">
                            <h4>Total Cost</h4>
                            <div className="profit-value text-warning">{formatCurrency(stats.total_cost || 0)}</div>
                        </div>
                        <div className="profit-metric">
                            <h4>Total Paid</h4>
                            <div className="profit-value text-success">{formatCurrency(stats.total_paid || 0)}</div>
                        </div>
                        <div className="profit-metric">
                            <h4>Pending Amount</h4>
                            <div className="profit-value text-danger">{formatCurrency(stats.pending_amount || 0)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Performance — admin only */}
            {userIsAdmin && performance.length > 0 && (
                <div className="card" style={{ marginTop: 28 }}>
                    <div className="card-title"><span className="icon">🏆</span> Staff Performance Leaderboard</div>
                    <div className="performance-grid">
                        {[...performance].sort((a,b) => b.total_sales_amount - a.total_sales_amount).map((p, i) => (
                            <div key={p.staff_id} className="perf-item">
                                <div className="perf-rank">#{i+1}</div>
                                <div className="perf-info">
                                    <div className="perf-name">{p.name || p.username}</div>
                                    <div className="perf-stats">
                                        <span>📦 {p.total_orders} Orders</span>
                                        <span>💳 {p.total_payments} Pays</span>
                                    </div>
                                </div>
                                <div className="perf-value">{formatCurrency(p.total_sales_amount)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
