exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  const data = JSON.parse(event.body);

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Mizra Orders <hello@getmizra.com>",
      to: ["hello@getmizra.com"],
      subject: `🎉 Nouvelle commande — ${data.restaurant_name} (${data.package})`,
      html: `
        <h2>Nouvelle commande !</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Package</td><td style="padding:8px 0">${data.package}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Prix package</td><td style="padding:8px 0">${data.package_price} NIS</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Add-ons</td><td style="padding:8px 0">${data.addons || "—"}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Total</td><td style="padding:8px 0"><strong>${data.total_price} NIS</strong></td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Acompte (50%)</td><td style="padding:8px 0">${data.deposit_amount} NIS</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Paiement</td><td style="padding:8px 0">${data.payment_method || "—"}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Nom payeur</td><td style="padding:8px 0">${data.payer_name || "—"}</td></tr>
        </table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
        <h3>Onboarding</h3>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Restaurant</td><td style="padding:6px 0">${data.restaurant_name}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Type</td><td style="padding:6px 0">${data.restaurant_type || "—"}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Téléphone</td><td style="padding:6px 0">${data.phone || "—"}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Adresse</td><td style="padding:6px 0">${data.full_address || "—"}</td></tr>
        </table>
      `,
    }),
  });

  // Confirmation email to client
  if (data.email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Mizra <hello@getmizra.com>",
        to: [data.email],
        subject: "הזמנתך אושרה ✓ — Your order is confirmed",
        html: `<div style="font-family:sans-serif">
          <p>Hi ${data.payer_name || "there"},</p>
          <p>Thank you for your order! Here's a quick summary:</p>
          <ul>
            <li><strong>Package:</strong> ${data.package}</li>
            <li><strong>Total:</strong> ${data.total_price} NIS</li>
            <li><strong>Deposit (50%):</strong> ${data.deposit_amount} NIS</li>
          </ul>
          <p>We'll reach out within 24 hours to get started on your project.</p>
          <p>If you have any questions, reply to this email or WhatsApp us at +972 55-964-0902.</p>
          <br><p>— The Mizra Team</p>
        </div>`,
      }),
    });
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
