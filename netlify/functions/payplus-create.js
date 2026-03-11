/**
 * PayPlus — Generate Payment Link
 * Called from the order form when client chooses credit card payment.
 * Returns a PayPlus payment page URL to redirect the client to.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    const data = JSON.parse(event.body);
    const amount = data.amount; // deposit amount in NIS (50%)
    const orderId = data.order_id;

    const payloadBody = {
      payment_page_uid: process.env.PAYPLUS_PAYMENT_PAGE_UID,
      refURL_success: `https://getmizra.com/?payment=success&order=${orderId}`,
      refURL_failure: `https://getmizra.com/?payment=failed&order=${orderId}`,
      refURL_cancel: `https://getmizra.com/?payment=cancelled&order=${orderId}`,
      refURL_callback: "https://getmizra.com/.netlify/functions/payplus-webhook",
      create_token: false,
      currency_code: "ILS",
      charge_method: 1,
      send_failure_callback: true,
      more_info: orderId || "",
      customer: {
        customer_name: data.payer_name || "",
        email: data.email || "",
        phone: data.phone || "",
      },
      amount: amount,
      items: [
        {
          name: `Mizra ${data.package_name || "Website"} — Deposit 50%`,
          quantity: 1,
          price: amount,
          vat_type: 0,
        },
      ],
    };

    const res = await fetch(
      "https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: JSON.stringify({
            api_key: process.env.PAYPLUS_API_KEY,
            secret_key: process.env.PAYPLUS_SECRET_KEY,
          }),
        },
        body: JSON.stringify(payloadBody),
      }
    );

    const result = await res.json();

    if (!res.ok || !result.data?.payment_page_link) {
      console.error("PayPlus error:", JSON.stringify(result));
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Payment page generation failed",
          details: result.results?.description || "Unknown error",
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        payment_url: result.data.payment_page_link,
        page_request_uid: result.data.page_request_uid,
      }),
    };
  } catch (err) {
    console.error("PayPlus create error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
