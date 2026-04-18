const express = require('express');
const app = express();
const cors = require('cors');
const paypalRoutes = require('../paypal-backend/routes/paypal');

app.use(cors());
app.use(express.json());

// The root is already /api/paypal due to vercel.json rewrites or file naming
app.use('/', paypalRoutes);

module.exports = app;
