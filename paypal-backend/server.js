require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const paypalRoutes = require('./routes/paypal');

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors());
app.use(express.json()); // Essential for parsing JSON bodies

// ── LOGGING MIDDLEWARE ──────────────────────────────────────
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ── PAYPAL ROUTES ───────────────────────────────────────────
app.use('/api/paypal', paypalRoutes);

// ── GLOBAL ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR HANDLER:", err.stack);
    res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: err.message
    });
});

// ── STARTUP ─────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 PayPal Backend running at http://localhost:${PORT}`);
    console.log(`- Create Order: POST http://localhost:${PORT}/api/paypal/create-order`);
    console.log(`- Capture Order: POST http://localhost:${PORT}/api/paypal/capture-order`);
});
