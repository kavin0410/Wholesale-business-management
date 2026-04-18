const express = require('express');
const router = express.Router();
const paypal = require('../services/paypalService');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Direct path to the SQLite database — point back to backend/supplynest.db
const DB_PATH = path.resolve(__dirname, '../../backend/supplynest.db');
const db = new Database(DB_PATH);

// Helper for logging errors to a file for easier debugging
const logError = (msg, error) => {
    const logMsg = `[${new Date().toISOString()}] ${msg}: ${error.message}\n${error.stack}\n`;
    fs.appendFileSync(path.join(__dirname, '../error.log'), logMsg);
    console.error(msg, error.message);
};

/**
 * 1. POST /api/paypal/create-order
 * Returns a new PayPal order ID.
 */
router.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) {
            return res.status(400).json({ error: "Missing amount" });
        }

        console.log(`DEBUG: Creating PayPal order for amount: ${amount}`);
        const orderId = await paypal.createOrder(amount);
        res.status(200).json({ id: orderId });
    } catch (error) {
        logError("Route Create Order Error", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 2. POST /api/paypal/capture-order
 * Captures the payment and updates the database.
 */
router.post('/capture-order', async (req, res) => {
    try {
        const { orderId, dbOrderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: "Missing PayPal order ID" });
        }
        if (!dbOrderId) {
            return res.status(400).json({ error: "Missing Database order ID" });
        }

        console.log(`DEBUG: Capturing PayPal order ${orderId} for DB Order ${dbOrderId}`);
        const result = await paypal.captureOrder(orderId);

        if (result.status === "COMPLETED") {
            const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
            if (!capture) {
                throw new Error("Capture data missing in PayPal response");
            }

            const transactionId = capture.id;
            const amount = capture.amount.value;

            // Fetch order info to get customer_id and staff_id
            const orderInfo = db.prepare("SELECT customer_id, staff_id FROM orders WHERE id = ?").get(Number(dbOrderId));
            
            if (!orderInfo) {
                throw new Error(`Order #${dbOrderId} not found in database.`);
            }

            const { customer_id, staff_id } = orderInfo;

            // DATABASE UPDATE TRANSACTION
            const dbUpdate = db.transaction(() => {
                // 1. Insert into payments table
                db.prepare(`
                    INSERT INTO payments (order_id, customer_id, staff_id, amount, method, transaction_id, status, date) 
                    VALUES (?, ?, ?, ?, 'PayPal', ?, 'PAID', datetime('now'))
                `).run(Number(dbOrderId), customer_id, staff_id, amount, transactionId);

                // 2. Update orders table status
                db.prepare(`UPDATE orders SET status = 'Paid' WHERE id = ?`).run(Number(dbOrderId));

                // 3. Sync staff performance (matching Python backend logic)
                if (staff_id) {
                    db.prepare(`
                        UPDATE staff_performance 
                        SET total_payments = total_payments + 1, 
                            last_updated = datetime('now')
                        WHERE staff_id = ?
                    `).run(staff_id);
                }
            });

            dbUpdate();
            console.log("✅ Database successfully updated for PayPal payment:", transactionId);
            
            res.status(200).json({ success: true, ...result });
        } else {
            console.warn("⚠️ PayPal payment not completed:", result.status);
            res.status(400).json({ success: false, error: "Payment not completed", details: result });
        }
    } catch (error) {
        logError("Route Capture Order Error", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

