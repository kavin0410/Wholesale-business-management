import { useState, useRef, useEffect, useCallback } from 'react'
import { canAccessPage } from '../store'

const NOTIF_ICONS = {
    order: '🛒',
    payment: '💳',
    stock: '📦',
    info: 'ℹ️',
}

export default function DynamicIsland({
    activePage,
    onNavigate,
    notifications,
    onClearNotifications,
    onMarkRead,
    currency,
    onCurrencyChange,
    auth,
    onLogout,
}) {
    const [notifOpen, setNotifOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [hidden, setHidden] = useState(false)
    const notifRef = useRef(null)
    const profileRef = useRef(null)
    const lastScrollY = useRef(0)

    // All nav items — filtered by role
    const allNavItems = [
        { id: 'dashboard', emoji: '📊', label: 'Dashboard' },
        { id: 'products', emoji: '📦', label: 'Products' },
        { id: 'customers', emoji: '👥', label: 'Customers' },
        { id: 'suppliers', emoji: '🏭', label: 'Suppliers' },
        { id: 'orders', emoji: '🛒', label: 'Orders' },
        { id: 'reports', emoji: '📈', label: 'Reports' },
        { id: 'payments', emoji: '💳', label: 'Payments' },
        { id: 'delivery', emoji: '🚚', label: 'Delivery' },
    ]

    // Only show nav items that the current user role can access
    const navItems = allNavItems.filter(item => canAccessPage(item.id))

    const unreadCount = notifications.filter(n => !n.read).length

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Scroll direction detection: hide on scroll down, show on scroll up
    const handleScroll = useCallback(() => {
        const currentY = window.scrollY
        const threshold = 10
        if (currentY > lastScrollY.current + threshold && currentY > 80) {
            setHidden(true)
            setNotifOpen(false)
            setProfileOpen(false)
        } else if (currentY < lastScrollY.current - threshold) {
            setHidden(false)
        }
        lastScrollY.current = currentY
    }, [])

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

    // Only show Settings in profile dropdown if user can access it
    const canSettings = canAccessPage('settings')

    return (
        <nav className={`dynamic-island${hidden ? ' di-hidden' : ''}`}>
            {/* Brand */}
            <div className="di-brand" onClick={() => onNavigate('dashboard')}>
                <div className="di-brand-logo" role="img" aria-label="SupplyNest Logo" />
                <span className="di-brand-text">SupplyNest</span>
            </div>

            {/* Nav Items — role-filtered */}
            <div className="di-nav">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        className={`di-nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <span className="nav-emoji">{item.emoji}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div className="di-actions">
                {/* Currency */}
                <select
                    className="di-currency-select"
                    value={currency}
                    onChange={(e) => onCurrencyChange(e.target.value)}
                >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                </select>

                {/* Notifications */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button
                        className="di-action-btn"
                        onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                    >
                        🔔
                        {unreadCount > 0 && (
                            <span className="di-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="di-notif-dropdown">
                            <div className="notif-header">
                                <h4>Notifications</h4>
                                <button className="notif-clear-btn" onClick={() => { onClearNotifications(); setNotifOpen(false) }}>
                                    Clear all
                                </button>
                            </div>
                            <div className="notif-list">
                                {notifications.length === 0 ? (
                                    <div className="notif-empty">No new notifications</div>
                                ) : (
                                    notifications.slice(0, 20).map(n => (
                                        <div
                                            key={n.id}
                                            className={`notif-item ${n.read ? '' : 'unread'}`}
                                            onClick={() => onMarkRead(n.id)}
                                        >
                                            <span className="notif-item-icon">
                                                {NOTIF_ICONS[n.type] || NOTIF_ICONS.info}
                                            </span>
                                            <div className="notif-item-body">
                                                <p>{n.message}</p>
                                                <small>{n.time}</small>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <div
                        className="di-avatar"
                        onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                    >
                        {auth?.username ? auth.username[0].toUpperCase() : 'U'}
                    </div>

                    {profileOpen && (
                        <div className="di-profile-dropdown">
                            <div className="profile-info">
                                <div className="profile-name">{auth?.username || 'User'}</div>
                                <div className="profile-role">{auth?.role || 'Staff'}</div>
                            </div>
                            {canSettings && (
                                <button className="profile-menu-item" onClick={() => { onNavigate('settings'); setProfileOpen(false) }}>
                                    ⚙️ Settings
                                </button>
                            )}
                            <button className="profile-menu-item danger" onClick={onLogout}>
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    )
}
