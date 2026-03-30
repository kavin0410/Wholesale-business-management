import React, { useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Premium PayPal Integration Component
 * @param {number} amount - The amount to charge
 * @param {string} currency - The currency code (USD, EUR, etc.)
 * @param {function} onSuccess - Callback for successful payment
 * @param {function} onError - Callback for errors
 */
export default function PayPalPayment({ amount, currency = "USD", onSuccess, onError }) {
    const [{ isPending }] = usePayPalScriptReducer();
    const [paymentStatus, setPaymentStatus] = useState('idle'); // idle | processing | success | error

    const handleCreateOrder = (data, actions) => {
        return actions.order.create({
            purchase_units: [
                {
                    amount: {
                        value: amount.toFixed(2),
                        currency_code: currency
                    },
                },
            ],
        });
    };

    const handleOnApprove = async (data, actions) => {
        setPaymentStatus('processing');
        try {
            const details = await actions.order.capture();
            setPaymentStatus('success');
            if (onSuccess) onSuccess(details);
        } catch (err) {
            setPaymentStatus('error');
            if (onError) onError(err);
        }
    };

    return (
        <div className="paypal-container">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card paypal-card"
            >
                <div className="paypal-header">
                    <div className="shield-icon">
                        <ShieldCheck size={24} color="#0070ba" />
                    </div>
                    <div className="header-text">
                        <h3>Secure Payment</h3>
                        <p>Pay safely with PayPal</p>
                    </div>
                </div>

                <div className="amount-display">
                    <span className="label">Total Amount</span>
                    <span className="value">{currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="paypal-button-wrapper">
                    <AnimatePresence mode="wait">
                        {isPending ? (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="paypal-loading"
                            >
                                <Loader2 className="animate-spin" size={32} />
                                <p>Loading Secure Gateway...</p>
                            </motion.div>
                        ) : paymentStatus === 'success' ? (
                            <motion.div 
                                key="success"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="payment-status success"
                            >
                                <CheckCircle2 size={48} />
                                <h4>Payment Successful!</h4>
                                <p>Transaction completed</p>
                            </motion.div>
                        ) : paymentStatus === 'error' ? (
                            <motion.div 
                                key="error"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="payment-status error"
                            >
                                <AlertCircle size={48} />
                                <h4>Payment Failed</h4>
                                <p>Please try again</p>
                                <button className="btn btn-primary btn-sm" onClick={() => setPaymentStatus('idle')}>Retry</button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="buttons"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <PayPalButtons 
                                    style={{ 
                                        layout: "vertical",
                                        color: "gold",
                                        shape: "rect",
                                        label: "pay"
                                    }}
                                    createOrder={handleCreateOrder}
                                    onApprove={handleOnApprove}
                                    onError={(err) => {
                                        setPaymentStatus('error');
                                        if (onError) onError(err);
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="paypal-footer">
                    <p>Protected by industry-standard encryption</p>
                </div>
            </motion.div>

            <style dangerouslySetInnerHTML={{ __html: `
                .paypal-container {
                    display: flex;
                    justify-content: center;
                    margin: 20px 0;
                    width: 100%;
                }
                .paypal-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 24px;
                    width: 100%;
                    max-width: 450px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                .paypal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .shield-icon {
                    background: rgba(0, 112, 186, 0.1);
                    padding: 8px;
                    border-radius: 12px;
                }
                .header-text h3 { margin: 0; font-size: 1.1rem; color: var(--text-primary); }
                .header-text p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
                
                .amount-display {
                    background: rgba(0,0,0,0.2);
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .amount-display .label { color: var(--text-secondary); font-size: 0.9rem; }
                .amount-display .value { color: var(--brand-color, #00d4ff); font-size: 1.3rem; font-weight: 700; }
                
                .paypal-button-wrapper {
                    min-height: 150px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .paypal-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    color: var(--text-secondary);
                }
                .payment-status {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 8px;
                    padding: 20px;
                }
                .payment-status.success { color: #10b981; }
                .payment-status.error { color: #ef4444; }
                .payment-status h4 { margin: 10px 0 0; }
                
                .paypal-footer {
                    margin-top: 20px;
                    text-align: center;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    padding-top: 12px;
                }
                .paypal-footer p { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
                
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}
