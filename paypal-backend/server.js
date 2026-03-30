require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Add Debug Print exactly as requested
console.log("DEBUG: PAYPAL_CLIENT_ID =", process.env.PAYPAL_CLIENT_ID);
console.log("DEBUG: PAYPAL_SECRET =", process.env.PAYPAL_SECRET ? "Loaded successfully" : "undefined");
console.log("DEBUG: PAYPAL_BASE_URL =", process.env.PAYPAL_BASE_URL);

/**
 * Generate an OAuth 2.0 access token exactly matching your requirements.
 */
async function generateAccessToken() {
  const response = await axios({
    url: `${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`,
    method: "post",
    auth: {
      username: process.env.PAYPAL_CLIENT_ID,
      password: process.env.PAYPAL_SECRET,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: "grant_type=client_credentials",
  });

  return response.data.access_token;
}

/**
 * 1. POST /api/paypal/create-order
 * Creates a PayPal order using the provided amount.
 */
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid valid amount provided" });
    }

    const accessToken = await generateAccessToken();

    // PayPal API request payload to create an order
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount.toString(), // e.g., "100.00"
          },
        },
      ],
    };

    const response = await axios({
      url: `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // Bearer is CORRECT here for actual API calls
      },
      data: payload,
    });

    // Return the generated PayPal Order ID to the client
    res.status(200).json({ orderID: response.data.id });
    
  } catch (error) {
    console.error("Error creating PayPal order:", error.message);
    res.status(500).json({ error: "Failed to create order. " + error.message });
  }
});

/**
 * 2. POST /api/paypal/capture-order
 * Captures a PayPal order payment using the order ID.
 */
app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: "Missing PayPal order ID" });
    }

    const accessToken = await generateAccessToken();

    const response = await axios({
      url: `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // Bearer is CORRECT here as well
      },
      data: {}, // Some Axios versions require empty data for POST
    });

    // Return the payment status and transaction details
    res.status(200).json({
      status: response.data.status,
      transactionDetails: response.data,
    });
    
  } catch (error) {
    console.error("Error capturing PayPal payment:", error.message);
    res.status(500).json({ error: "Failed to capture order. " + error.message });
  }
});

// Start the Express server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 PayPal Node Express Server running on port ${PORT}`);
});
