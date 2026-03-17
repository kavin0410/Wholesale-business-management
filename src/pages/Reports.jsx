import { useEffect, useRef, useMemo } from 'react'
import { getProducts, getOrders, getCustomers } from '../store'
import { exportToExcel } from '../utils/exportUtils'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default function Reports({ formatCurrency }) {
    const products = getProducts()
    const orders = getOrders()
    const customers = getCustomers()
    const weeklyRef = useRef(null)
    const monthlyRef = useRef(null)
    const catRef = useRef(null)
    const chartsRef = useRef([])

    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)

    // Most profitable product
    const bestProduct = useMemo(() => {
        const profitMap = {}
        orders.forEach(o => {
            const p = products.find(pr => pr.id === o.productId)
            if (p) profitMap[p.name] = (profitMap[p.name] || 0) + (o.profit || 0)
        })
        const entries = Object.entries(profitMap)
        return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : '—'
    }, [orders, products])

    // Most active customer
    const bestCustomer = useMemo(() => {
        const countMap = {}
        orders.forEach(o => {
            const c = customers.find(cu => cu.id === o.customerId)
            if (c) countMap[c.name] = (countMap[c.name] || 0) + 1
        })
        const entries = Object.entries(countMap)
        return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : '—'
    }, [orders, customers])

    useEffect(() => {
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
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const weeklySales = new Array(7).fill(0)
        orders.forEach(o => {
            const d = new Date(o.date)
            const day = d.getDay()
            weeklySales[day === 0 ? 6 : day - 1] += o.total || 0
        })

        if (weeklyRef.current) {
            chartsRef.current.push(new Chart(weeklyRef.current, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Sales',
                        data: weeklySales,
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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlyRevenue = new Array(12).fill(0)
        orders.forEach(o => {
            const d = new Date(o.date)
            monthlyRevenue[d.getMonth()] += o.total || 0
        })

        if (monthlyRef.current) {
            chartsRef.current.push(new Chart(monthlyRef.current, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Revenue',
                        data: monthlyRevenue,
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
        const catSales = {}
        orders.forEach(o => {
            const p = products.find(pr => pr.id === o.productId)
            if (p) catSales[p.category] = (catSales[p.category] || 0) + (o.total || 0)
        })

        const catLabels = Object.keys(catSales)
        const catData = Object.values(catSales)
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
    }, [orders, products])

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Reports & Analytics</h1>
                <p>Insights and performance metrics for your business</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple">💰</div>
                    <div className="stat-info">
                        <h3>{formatCurrency(totalRevenue)}</h3>
                        <p>Total Revenue</p>
                        <span className="stat-growth up">↑ Lifetime</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">🛒</div>
                    <div className="stat-info">
                        <h3>{orders.length}</h3>
                        <p>Total Orders</p>
                        <span className="stat-growth up">↑ All time</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">🏆</div>
                    <div className="stat-info">
                        <h3>{bestProduct}</h3>
                        <p>Most Profitable Product</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">⭐</div>
                    <div className="stat-info">
                        <h3>{bestCustomer}</h3>
                        <p>Most Active Customer</p>
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

            <div className="card">
                <div className="card-title"><span className="icon">💾</span> Data Backup & Export</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Download your business data in Excel (.xlsx) format for backup or external analysis.</p>
                <div className="btn-group">
                    <button className="btn btn-success" onClick={() => exportToExcel(orders, 'Orders_Backup')}>
                        📊 Export Orders
                    </button>
                    <button className="btn btn-primary" onClick={() => exportToExcel(customers, 'Customers_Backup')}>
                        👥 Export Customers
                    </button>
                    <button className="btn btn-warning" onClick={() => exportToExcel(products, 'Inventory_Backup')}>
                        📦 Export Inventory
                    </button>
                </div>
            </div>
        </div>
    )
}
