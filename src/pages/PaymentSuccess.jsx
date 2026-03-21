import { useEffect, useState } from 'react'
import { verifyCashfreeOrderApi, fetchOrders, fetchCustomers, fetchProducts, addNotification } from '../store'
import { generateInvoice } from '../utils/exportUtils'

export default function PaymentSuccess({ auth, showToast, formatCurrency }) {
    const [status, setStatus] = useState('processing')
    const [orderId, setOrderId] = useState(null)
    const [orderData, setOrderData] = useState(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const oid = params.get('order_id')
        
        if (!oid) {
            setStatus('failed')
            return
        }
        
        setOrderId(oid)
        
        const verifyFlow = async () => {
            try {
                // 1. Verify Payment on Backend
                const verified = await verifyCashfreeOrderApi(oid)
                if (verified) {
                    setStatus('success')
                    showToast('Payment Verified Successfully!', 'success')
                    addNotification(`Order #${oid} Paid via Cashfree`, 'order')
                    
                    // Fetch data to auto-generate invoice
                    const [ordersRes, prodsRes, custsRes] = await Promise.all([
                        fetchOrders(),
                        fetchProducts(),
                        fetchCustomers()
                    ])
                    
                    if (ordersRes.data) {
                        const order = ordersRes.data.find(o => String(o.id) === String(oid))
                        if (order) {
                            const p = prodsRes.data?.find(x => x.id === order.productId)
                            const c = custsRes.data?.find(x => x.id === order.customerId)
                            const fullOrder = { ...order, staffName: auth?.username || '—' }
                            setOrderData({ order: fullOrder, cust: c, prod: p })
                            // Automatically download
                            generateInvoice(fullOrder, c, p)
                        }
                    }
                } else {
                    setStatus('failed')
                    showToast('Payment Verification Failed.', 'error')
                }
            } catch(e) {
                setStatus('failed')
            }
        }
        
        verifyFlow()
    }, [])

    return (
        <div className="page-enter" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px', width: '100%' }}>
                {status === 'processing' && (
                    <>
                        <h2>⏳ Verifying Payment...</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Please wait while we confirm your transaction with Cashfree.</p>
                    </>
                )}
                
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                        <h2>Payment Successful!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                            Your Order <strong>#{orderId}</strong> is confirmed and marked as Paid. <br/><br/>
                            Your invoice has been generated.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                            {orderData && (
                                <button className="btn btn-secondary" onClick={() => generateInvoice(orderData.order, orderData.cust, orderData.prod)}>
                                    📄 Re-download Invoice
                                </button>
                            )}
                            <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                                Return to Dashboard
                            </button>
                        </div>
                    </>
                )}
                
                {status === 'failed' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2>Payment Failed or Error</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                            We couldn't verify this payment. If the amount was deducted, please refer to the support.
                        </p>
                        <div style={{ marginTop: '2rem' }}>
                            <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                                Return to Dashboard
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
