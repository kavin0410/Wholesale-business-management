const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables if not already loaded by the main server
dotenv.config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

/**
 * Generate an access token using PayPal OAuth 2.0.
 */
async function generateAccessToken() {
    try {
        if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
            throw new Error("Missing PayPal credentials in .env");
        }

        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
        const response = await axios({
            url: `${PAYPAL_BASE_URL}/v1/oauth2/token`,
            method: 'post',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: 'grant_type=client_credentials'
        });

        console.log("DEBUG: Access Token successfully generated.");
        return response.data.access_token;
    } catch (error) {
        console.error("PayPal Auth Error:", error.response?.data || error.message);
        throw new Error("Failed to generate access token.");
    }
}

/**
 * Create a PayPal order with the specified amount.
 */
async function createOrder(amount) {
    try {
        const accessToken = await generateAccessToken();
        const response = await axios({
            url: `${PAYPAL_BASE_URL}/v2/checkout/orders`,
            method: 'post',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value: Number(amount).toFixed(2)
                        }
                    }
                ]
            }
        });

        console.log("DEBUG: PayPal Order Created:", response.data.id);
        return response.data.id;
    } catch (error) {
        console.error("PayPal Create Order Error:", error.response?.data || error.message);
        throw new Error("Failed to create PayPal order.");
    }
}

/**
 * Capture the payment for a PayPal order.
 */
async function captureOrder(orderId) {
    try {
        const accessToken = await generateAccessToken();
        const response = await axios({
            url: `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
            method: 'post',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("DEBUG: PayPal Order Captured:", response.data.status);
        return response.data;
    } catch (error) {
        console.error("PayPal Capture Order Error:", error.response?.data || error.message);
        throw new Error("Failed to capture PayPal order.");
    }
}

module.exports = {
    generateAccessToken,
    createOrder,
    captureOrder
};
