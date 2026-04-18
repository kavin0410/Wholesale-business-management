require("dotenv").config({ path: "./paypal-backend/.env" });
const axios = require("axios");

async function testCreateOrder() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  const baseUrl = process.env.PAYPAL_BASE_URL;

  console.log("Using Client ID:", clientId);
  console.log("Using Base URL:", baseUrl);

  try {
    // 1. Get Access Token
    console.log("Generating access token...");
    const tokenRes = await axios({
      url: `${baseUrl}/v1/oauth2/token`,
      method: "post",
      auth: { username: clientId, password: secret },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "grant_type=client_credentials",
    });
    const accessToken = tokenRes.data.access_token;
    console.log("Token generated successfully.");

    // 2. Create Order
    console.log("Creating test order for $20.00...");
    const orderRes = await axios({
      url: `${baseUrl}/v2/checkout/orders`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: "20.00" },
          },
        ],
      },
    });
    console.log("Order created successfully! ID:", orderRes.data.id);
    console.log("Try opening this URL in browser: https://www.sandbox.paypal.com/checkoutnow?token=" + orderRes.data.id);
  } catch (error) {
    console.error("Test failed!");
    if (error.response) {
      console.error("Error Status:", error.response.status);
      console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Message:", error.message);
    }
  }
}

testCreateOrder();
