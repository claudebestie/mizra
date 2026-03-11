/**
 * PayPlus — Webhook Callback
 * Called by PayPlus after a payment is completed (success or failure).
 * Updates the order status in Supabase and sends notifications.
 */
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  try {
    const data = JSON.parse(event.body);

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.PAYPLUS_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = event.headers["payplus-signature"] || event.headers["Payplus-Signature"] || "";
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(event.body)
        .digest("hex");

      if (signature !== expectedSig) {
        console.error("PayPlus webhook: invalid signature");
        return { statusCode: 401, body: "Invalid signature" };
      }
    }

    const transactionData = data.transaction || data;
    const orderId = transactionData.more_info || data.more_info || "";
    const status = transactionData.status_code;
    const isApproved = status === "000" || transactionData.type === "Approval";

    console.log(`PayPlus webhook: order=${orderId}, status=${status}, approved=${isApproved}`);

    // Update order in Supabase
    if (orderId) {
      const supabaseUrl = process.env.SUPABASE_URL || "https://rofkgmwjggvxlgrdnsyt.supabase.co";
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

      if (supabaseKey) {
        const updateRes = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              payment_status: isApproved ? "paid" : "failed",
              payment_method: "Credit Card (PayPlus)",
              payplus_transaction_uid: transactionData.uid || transactionData.transaction_uid || "",
              payplus_number: transactionData.number || "",
            }),
          }
        );

        if (!updateRes.ok) {
          console.error("Supabase update error:", await updateRes.text());
        }
      }

      // Send admin notification on successful payment
      if (isApproved && process.env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Mizra Payments <hello@getmizra.com>",
            to: ["hello@getmizra.com"],
            subject: `💳 Paiement reçu — Commande #${orderId}`,
            html: `
              <h2>Paiement reçu via PayPlus!</h2>
              <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
                <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Order ID</td><td>${orderId}</td></tr>
                <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Montant</td><td>${transactionData.amount || "—"} NIS</td></tr>
                <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Transaction</td><td>${transactionData.uid || transactionData.transaction_uid || "—"}</td></tr>
                <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Status</td><td style="color:green;font-weight:bold">Approved ✓</td></tr>
              </table>
            `,
          }),
        });
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("PayPlus webhook error:", err);
    return { statusCode: 500, body: "Error processing webhook" };
  }
};
