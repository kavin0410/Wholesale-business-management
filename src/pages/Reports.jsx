import { useState, useEffect, useRef } from 'react'
import { fetchReportSummaryApi, fetchReportTrendsApi, fetchReportCategoriesApi, hasPermission, fetchOrders, fetchCustomers, fetchProducts } from '../store'
import { exportToExcel, generateBusinessReport } from '../utils/exportUtils'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default function Reports({ formatCurrency, auth }) {
    const [summary, setSummary] = useState({ best_product: '—', best_customer: '—', total_revenue: 0, total_orders: 0, total_profit: 0 })
    const [trends, setTrends] = useState({ monthly: [], weekly: [] })
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    
    // For raw exports
    const [rawOrders, setRawOrders] = useState([])
    const [rawCustomers, setRawCustomers] = useState([])
    const [rawProducts, setRawProducts] = useState([])

    const canView = hasPermission('reports:view')
    const canExport = hasPermission('export:data')

    const weeklyRef = useRef(null)
    const monthlyRef = useRef(null)
    const catRef = useRef(null)
    const chartsRef = useRef([])

    const loadData = async () => {
        setLoading(true)
        try {
            const [summ, trend, cats, ords, custs, prods] = await Promise.all([
                fetchReportSummaryApi(),
                fetchReportTrendsApi(),
                fetchReportCategoriesApi(),
                fetchOrders(),
                fetchCustomers(),
                fetchProducts()
            ])
            if (summ) setSummary(summ)
            if (trend) setTrends(trend)
            setCategories(cats)
            setRawOrders(ords.data)
            setRawCustomers(custs.data)
            setRawProducts(prods.data)
        } catch (err) {
            console.error('Failed to load reports:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (canView) loadData()
    }, [])

    useEffect(() => {
        if (loading || !canView) return

        // Cleanup
        chartsRef.current.forEach(c => c?.destroy())
        chartsRef.current = []

        const chartOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } },
            },
            scales: {
                x: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            }
        }

        // Weekly sales
        if (weeklyRef.current && trends.weekly.length > 0) {
            chartsRef.current.push(new Chart(weeklyRef.current, {
                type: 'bar',
                data: {
                    labels: trends.weekly.map(w => w.date.split('-').slice(1).join('/')), // MM/DD
                    datasets: [{
                        label: 'Sales',
                        data: trends.weekly.map(w => w.revenue),
                        backgroundColor: 'rgba(99, 102, 241, 0.6)',
                        borderColor: '#6366f1',
                        borderWidth: 2,
                        borderRadius: 8,
                    }]
                },
                options: chartOpts,
            }))
        }

        // Monthly revenue
        if (monthlyRef.current && trends.monthly.length > 0) {
            chartsRef.current.push(new Chart(monthlyRef.current, {
                type: 'line',
                data: {
                    labels: trends.monthly.map(m => m.month),
                    datasets: [{
                        label: 'Revenue',
                        data: trends.monthly.map(m => m.revenue),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#10b981',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                    }]
                },
                options: chartOpts,
            }))
        }

        // Category pie
        const catLabels = categories.map(c => c.category)
        const catData = categories.map(c => c.sales)
        const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

        if (catRef.current && catLabels.length > 0) {
            chartsRef.current.push(new Chart(catRef.current, {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [{
                        data: catData,
                        backgroundColor: pieColors.slice(0, catLabels.length),
                        borderWidth: 0,
                        hoverOffset: 8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 16 } }
                    }
                }
            }))
        }

        return () => {
            chartsRef.current.forEach(c => c?.destroy())
        }
    }, [loading, trends, categories, canView])

    // Staff should never reach this page (blocked at nav level),
    // but just in case, show access denied
    if (!canView) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <h1>Reports & Analytics</h1>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view reports. Contact your administrator.</p>
                </div>
            </div>
        )
    }

    if (loading) return <div className="page-enter"><div className="loading-state">Loading Analytics...</div></div>

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Reports & Analytics</h1>
                <p>Insights and performance metrics for your business</p>
                {canExport && (
                    <button className="btn btn-primary" onClick={() => generateBusinessReport(summary, trends, categories)}>
                        📄 Download Full PDF Report
                    </button>
                )}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple">💰</div>
                    <div className="stat-info">
                        <h3>{formatCurrency(summary.total_revenue)}</h3>
                        <p>Total Revenue</p>
                        <span className="stat-growth up">↑ Lifetime</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">🛒</div>
                    <div className="stat-info">
                        <h3>{summary.total_orders}</h3>
                        <p>Total Orders</p>
                        <span className="stat-growth up">↑ All time</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">🏆</div>
                    <div className="stat-info">
                        <h3>{summary.best_product}</h3>
                        <p>Top Product (Profit)</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">⭐</div>
                    <div className="stat-info">
                        <h3>{summary.best_customer}</h3>
                        <p>Top Customer (Spend)</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="card chart-card">
                    <div className="card-title"><span className="icon">📊</span> Weekly Sales</div>
                    <div className="chart-container"><canvas ref={weeklyRef}></canvas></div>
                </div>
                <div className="card chart-card">
                    <div className="card-title"><span className="icon">📈</span> Monthly Revenue</div>
                    <div className="chart-container"><canvas ref={monthlyRef}></canvas></div>
                </div>
            </div>

            <div className="card chart-card" style={{ maxWidth: 560 }}>
                <div className="card-title"><span className="icon">🥧</span> Category-wise Sales</div>
                <div className="chart-container chart-container-pie"><canvas ref={catRef}></canvas></div>
            </div>

            {canExport && (
                <div className="card">
                    <div className="card-title"><span className="icon">💾</span> Data Backup & Raw Exports</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Download your business data in Excel (.xlsx) format for backup or external analysis.</p>
                    <div className="btn-group">
                        <button className="btn btn-success" onClick={() => exportToExcel(rawOrders, 'Orders_Detailed_Export')}>
                            📊 Export Orders
                        </button>
                        <button className="btn btn-primary" onClick={() => exportToExcel(rawCustomers, 'Customers_Detailed_Export')}>
                            👥 Export Customers
                        </button>
                        <button className="btn btn-warning" onClick={() => exportToExcel(rawProducts, 'Inventory_Detailed_Export')}>
                            📦 Export Inventory
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
