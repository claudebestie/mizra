const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  const webhookSecret = process.env.PAYPLUS_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!webhookSecret || !supabaseUrl || !supabaseKey || !resendKey) {
    console.error("Missing env vars");
    return { statusCode: 500 };
  }

  // ── Verify HMAC signature ──
  const receivedSig = event.headers["x-payplus-signature"] || event.headers["X-PayPlus-Signature"] || "";
  const expectedSig = crypto.createHmac("sha256", webhookSecret).update(event.body).digest("hex");

  if (receivedSig && receivedSig !== expectedSig) {
    console.error("Invalid webhook signature");
    return { statusCode: 401 };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400 };
  }

  const transactionUid = payload.transaction_uid || payload.transaction?.uid;
  const paymentStatus = payload.transaction?.status_code;
  const orderId = payload.more_info;

  if (!orderId) {
    console.error("No order ID in webhook payload");
    return { statusCode: 400 };
  }

  // ── Fetch order from Supabase ──
  let order;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=*`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const rows = await res.json();
    if (!rows || rows.length === 0) {
      console.error("Order not found:", orderId);
      return { statusCode: 404 };
    }
    order = rows[0];
  } catch (err) {
    console.error("Supabase fetch error:", err);
    return { statusCode: 500 };
  }

  // ── Idempotency: skip if already paid ──
  if (order.payment_status === "paid") {
    return { statusCode: 200, body: "Already processed" };
  }

  // ── Determine new status ──
  // PayPlus status codes: 000 = approved, others = failed/pending
  const isApproved = paymentStatus === "000" || payload.transaction?.status === "approved";
  const newStatus = isApproved ? "paid" : "failed";

  // ── Update order in Supabase ──
  try {
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        payment_status: newStatus,
        payplus_transaction_uid: transactionUid || null,
      }),
    });
  } catch (err) {
    console.error("Supabase update error:", err);
    return { statusCode: 500 };
  }

  // ── Send emails ──
  if (isApproved) {
    // Admin notification
    await sendEmail(resendKey, {
      from: "Mizra Orders <hello@getmizra.com>",
      to: ["hello@getmizra.com"],
      subject: `\uD83C\uDF89 Paiement recu — ${order.business_name} (${order.plan === "landing_page" ? "Landing Page" : "Custom"})`,
      html: buildAdminEmail(order),
    });

    // Client confirmation
    if (order.email) {
      await sendEmail(resendKey, {
        from: "Mizra <hello@getmizra.com>",
        to: [order.email],
        subject: "\u2713 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D5\u05E9\u05E8 \u2014 Payment Confirmed",
        html: buildClientEmail(order),
      });
    }
  } else {
    // Payment failed — notify admin
    await sendEmail(resendKey, {
      from: "Mizra Orders <hello@getmizra.com>",
      to: ["hello@getmizra.com"],
      subject: `\u274C Paiement echoue — ${order.business_name}`,
      html: `<h2>Paiement echoue</h2>
        <p><strong>Client:</strong> ${order.name} (${order.email})</p>
        <p><strong>Business:</strong> ${order.business_name}</p>
        <p><strong>Montant TTC:</strong> ${order.amount_ttc} NIS</p>
        <p><strong>Transaction UID:</strong> ${transactionUid || "N/A"}</p>
        <p><strong>Status code:</strong> ${paymentStatus || "N/A"}</p>`,
    });

    // Client failure notification
    if (order.email) {
      await sendEmail(resendKey, {
        from: "Mizra <hello@getmizra.com>",
        to: [order.email],
        subject: "\u05D1\u05E2\u05D9\u05D4 \u05D1\u05EA\u05E9\u05DC\u05D5\u05DD \u2014 Payment Issue",
        html: `<div style="font-family:sans-serif;direction:rtl;text-align:right">
          <h2>\u05D4\u05D9\u05D4 \u05D1\u05E2\u05D9\u05D4 \u05D1\u05EA\u05E9\u05DC\u05D5\u05DD</h2>
          <p>\u05E9\u05DC\u05D5\u05DD ${order.name},</p>
          <p>\u05DC\u05E6\u05E2\u05E8\u05E0\u05D5, \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05DC\u05D0 \u05E2\u05D1\u05E8. \u05D0\u05E0\u05D0 \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D0\u05D5 \u05E6\u05E8\u05D5 \u05E7\u05E9\u05E8 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4:</p>
          <p><a href="https://wa.me/972559640902">+972 55-964-0902</a></p>
          <br><p>\u2014 \u05E6\u05D5\u05D5\u05EA Mizra</p>
        </div>`,
      });
    }
  }

  return { statusCode: 200, body: "OK" };
};

// ── Helper: send email via Resend ──
async function sendEmail(apiKey, params) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.error("Resend error:", err);
  }
}

// ── Admin email template ──
function buildAdminEmail(order) {
  const invoiceBadge = order.invoice_requested
    ? '<span style="background:#c44;color:#fff;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:700">FACTURE REQUISE \uD83E\uDDFE</span>'
    : "";
  const invoiceInfo = order.invoice_requested && order.invoice_data
    ? `<tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Facture</td><td style="padding:6px 0">${order.invoice_data.legal_name || ""} — TVA: ${order.invoice_data.vat_number || ""}<br>${order.invoice_data.billing_address || ""}</td></tr>`
    : "";

  return `
    <h2>\uD83C\uDF89 Nouvelle commande payee ! ${invoiceBadge}</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Client</td><td style="padding:6px 0">${order.name}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${order.email}">${order.email}</a></td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Telephone</td><td style="padding:6px 0">${order.phone}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Business</td><td style="padding:6px 0">${order.business_name} (${order.business_type})</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Ville</td><td style="padding:6px 0">${order.city}</td></tr>
    </table>
    <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Plan</td><td style="padding:6px 0">${order.plan === "landing_page" ? "Landing Page" : "Custom"}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Montant HT</td><td style="padding:6px 0">\u20AA${order.amount_ht}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">TVA (18%)</td><td style="padding:6px 0">\u20AA${order.vat_amount}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666"><strong>Total TTC</strong></td><td style="padding:6px 0"><strong>\u20AA${order.amount_ttc}</strong></td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Paiement</td><td style="padding:6px 0">${order.installments}x</td></tr>
      <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Langue souhaitee</td><td style="padding:6px 0">${order.website_lang || "he"}</td></tr>
      ${invoiceInfo}
    </table>
    ${order.description ? `<hr style="margin:16px 0;border:none;border-top:1px solid #eee"><p><strong>Notes:</strong> ${order.description}</p>` : ""}
  `;
}

// ── Client confirmation email (bilingual) ──
function buildClientEmail(order) {
  const perInstallment = order.installments > 1 ? Math.round(order.amount_ttc / order.installments) : order.amount_ttc;
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <div style="direction:rtl;text-align:right;margin-bottom:32px">
      <h2 style="color:#0c1829">\u2705 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D5\u05E9\u05E8!</h2>
      <p>\u05E9\u05DC\u05D5\u05DD ${order.name},</p>
      <p>\u05EA\u05D5\u05D3\u05D4 \u05E2\u05DC \u05D4\u05D4\u05D6\u05DE\u05E0\u05D4! \u05D4\u05E0\u05D4 \u05E1\u05D9\u05DB\u05D5\u05DD:</p>
      <ul style="line-height:2">
        <li><strong>\u05D7\u05D1\u05D9\u05DC\u05D4:</strong> ${order.plan === "landing_page" ? "\u05D3\u05E3 \u05E0\u05D7\u05D9\u05EA\u05D4" : "\u05D0\u05EA\u05E8 \u05DE\u05D5\u05EA\u05D0\u05DD"}</li>
        <li><strong>\u05E1\u05DB\u05D5\u05DD:</strong> \u20AA${order.amount_ht} + \u05DE\u05E2"\u05DE 18% = <strong>\u20AA${order.amount_ttc}</strong></li>
        ${order.installments > 1 ? `<li><strong>\u05EA\u05E9\u05DC\u05D5\u05DD:</strong> ${order.installments} \u05E4\u05E2\u05D9\u05DE\u05D5\u05EA \u05E9\u05DC \u20AA${perInstallment}</li>` : ""}
      </ul>
      <p>\u05E0\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05DB\u05DD \u05EA\u05D5\u05DA 24 \u05E9\u05E2\u05D5\u05EA \u05DB\u05D3\u05D9 \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05DC\u05E2\u05D1\u05D5\u05D3 \u05E2\u05DC \u05D4\u05D0\u05EA\u05E8 \u05E9\u05DC\u05DB\u05DD.</p>
      <p>\u05E9\u05D0\u05DC\u05D5\u05EA? \u05E9\u05DC\u05D7\u05D5 \u05DC\u05E0\u05D5 \u05D4\u05D5\u05D3\u05E2\u05D4 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4: <a href="https://wa.me/972559640902">+972 55-964-0902</a></p>
      <br><p>\u2014 \u05E6\u05D5\u05D5\u05EA Mizra</p>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <div style="direction:ltr;text-align:left">
      <h2 style="color:#0c1829">\u2705 Payment Confirmed!</h2>
      <p>Hi ${order.name},</p>
      <p>Thank you for your order! Here's a summary:</p>
      <ul style="line-height:2">
        <li><strong>Package:</strong> ${order.plan === "landing_page" ? "Landing Page" : "Custom Website"}</li>
        <li><strong>Amount:</strong> \u20AA${order.amount_ht} + VAT 18% = <strong>\u20AA${order.amount_ttc}</strong></li>
        ${order.installments > 1 ? `<li><strong>Payment:</strong> ${order.installments} installments of \u20AA${perInstallment}</li>` : ""}
      </ul>
      <p>We'll reach out within 24 hours to get started on your project.</p>
      <p>Questions? WhatsApp us at <a href="https://wa.me/972559640902">+972 55-964-0902</a></p>
      <br><p>\u2014 The Mizra Team</p>
    </div>
  </div>`;
}
