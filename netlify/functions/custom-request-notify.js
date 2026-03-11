exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };
  const { name, email, phone, services, budget_range, description } = JSON.parse(event.body);
  const serviceList = (services || []).join(", ") || "—";

  // Admin notification
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Mizra Custom <hello@getmizra.com>",
      to: ["hello@getmizra.com"],
      subject: `📋 Custom request — ${name}`,
      html: `<h2>New Custom Project Request</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Name</td><td>${name}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Email</td><td>${email}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Phone</td><td>${phone || "—"}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Services</td><td>${serviceList}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Budget</td><td>${budget_range || "—"}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Description</td><td>${description}</td></tr>
        </table>`,
    }),
  });

  // Client confirmation
  if (email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Mizra <hello@getmizra.com>",
        to: [email],
        subject: "We received your project request ✓ — Mizra",
        html: `<p>Hi ${name},</p><p>Thanks for your custom project request! We'll review your needs and send a detailed quote within 24 hours.</p><p>Services requested: ${serviceList}</p><br><p>— The Mizra Team</p>`,
      }),
    });
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
