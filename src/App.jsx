import { useState, useCallback } from 'react'
import DynamicIsland from './components/DynamicIsland'
import Toast from './components/Toast'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import DeliveryTracking from './pages/DeliveryTracking'
import Suppliers from './pages/Suppliers'
import StaffManagement from './pages/StaffManagement'
import PaymentSuccess from './pages/PaymentSuccess'
import { TwentyFirstToolbar } from '@21st-extension/toolbar-react'
import { ReactPlugin } from '@21st-extension/react'
import {
    login as loginFn,
    logout as logoutFn,
    getAuth,
    getNotifications,
    markNotifRead,
    clearNotifications,
    getSavedCurrency,
    saveCurrency,
    formatCurrency as formatCurrencyFn,
    canAccessPage,
    hasPermission,
} from './store'
import { useToast } from './hooks/useToast'

export default function App() {
    const [auth, setAuth] = useState(getAuth())
    const [activePage, setActivePage] = useState(() => {
        if (window.location.pathname.includes('/payment-success')) return 'payment-success';
        return 'dashboard';
    })
    const [currency, setCurrency] = useState(getSavedCurrency())
    const [notifications, setNotifications] = useState(getNotifications())
    const [refreshKey, setRefreshKey] = useState(0)
    const { toasts, showToast } = useToast()

    const refresh = useCallback(() => {
        setRefreshKey(k => k + 1)
        setNotifications(getNotifications())
    }, [])

    const handleLogin = async (username, password) => {
        const result = await loginFn(username, password)
        if (result) {
            setAuth(result)
            showToast(`Welcome back, ${result.username}!`, 'success')
            return result
        }
        return null
    }

    const handleLogout = () => {
        logoutFn()
        setAuth(null)
        setActivePage('dashboard')
        showToast('Logged out successfully', 'info')
    }

    const handleCurrencyChange = (c) => {
        setCurrency(c)
        saveCurrency(c)
        refresh()
    }

    const handleClearNotifs = () => {
        clearNotifications()
        setNotifications([])
        showToast('Notifications cleared', 'info')
    }

    const handleMarkRead = (id) => {
        markNotifRead(id)
        setNotifications(getNotifications())
    }

    const fmtCurrency = useCallback((amount) => {
        return formatCurrencyFn(amount, currency)
    }, [currency])
    const toolbarConfig = { plugins: [ReactPlugin] }

    // Page navigation with access control
    const handleNavigate = (page) => {
        if (canAccessPage(page)) {
            setActivePage(page)
        } else {
            showToast('⛔ Access denied. You do not have permission to view this page.', 'error')
        }
    }

    // Not logged in
    if (!auth) {
        return (
            <>
                <TwentyFirstToolbar config={toolbarConfig} />
                <LoginPage onLogin={handleLogin} />
                <Toast toasts={toasts} />
            </>
        )
    }

    // Render active page (with permission check)
    const renderPage = () => {
        const commonProps = { showToast, formatCurrency: fmtCurrency, refresh, currency, auth }

        // If user somehow lands on a page they can't access, redirect to dashboard
        if (!canAccessPage(activePage)) {
            return <Dashboard key={refreshKey} {...commonProps} />
        }

        switch (activePage) {
            case 'dashboard': return <Dashboard key={refreshKey} {...commonProps} />
            case 'products': return <Products key={refreshKey} {...commonProps} />
            case 'customers': return <Customers key={refreshKey} {...commonProps} />
            case 'orders': return <Orders key={refreshKey} {...commonProps} />
            case 'payments': return <Payments key={refreshKey} {...commonProps} />
            case 'reports': return <Reports key={refreshKey} {...commonProps} />
            case 'settings': return <Settings key={refreshKey} {...commonProps} />
            case 'delivery': return <DeliveryTracking key={refreshKey} {...commonProps} />
            case 'suppliers': return <Suppliers key={refreshKey} {...commonProps} />
            case 'staff': return <StaffManagement key={refreshKey} {...commonProps} />
            case 'payment-success': return <PaymentSuccess key={refreshKey} {...commonProps} />
            default: return <Dashboard key={refreshKey} {...commonProps} />
        }
    }

    return (
        <>
            <TwentyFirstToolbar config={toolbarConfig} />
            <DynamicIsland
                activePage={activePage}
                onNavigate={handleNavigate}
                notifications={notifications}
                onClearNotifications={handleClearNotifs}
                onMarkRead={handleMarkRead}
                currency={currency}
                onCurrencyChange={handleCurrencyChange}
                auth={auth}
                onLogout={handleLogout}
            />
            <main className="main-layout">
                {renderPage()}
            </main>
            <Toast toasts={toasts} />
        </>
    )
}
