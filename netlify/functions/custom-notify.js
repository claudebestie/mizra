exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { statusCode: 500, body: "Server config error" };

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { name, email, phone, business_name, business_type, city, description, website_lang } = data;

  // ── Admin notification ──
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: "Mizra Orders <hello@getmizra.com>",
      to: ["hello@getmizra.com"],
      subject: `\uD83C\uDFA8 Projet Custom — ${business_name} (${city})`,
      html: `
        <h2>\uD83C\uDFA8 Nouvelle demande custom</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Client</td><td style="padding:6px 0">${name}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Telephone</td><td style="padding:6px 0">${phone || "\u2014"}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Business</td><td style="padding:6px 0">${business_name} (${business_type})</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Ville</td><td style="padding:6px 0">${city}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-weight:bold;color:#666">Langue</td><td style="padding:6px 0">${website_lang || "he"}</td></tr>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
        <h3>Description du projet</h3>
        <div style="background:#f8f7f4;padding:16px;border-radius:8px;font-size:14px;line-height:1.7;white-space:pre-wrap">${description || "\u2014"}</div>
      `,
    }),
  });

  // ── Client confirmation ──
  if (email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "Mizra <hello@getmizra.com>",
        to: [email],
        subject: "\u05E7\u05D9\u05D1\u05DC\u05E0\u05D5 \u05D0\u05EA \u05D4\u05D1\u05E7\u05E9\u05D4 \u05E9\u05DC\u05DB\u05DD \u2014 We received your request",
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="direction:rtl;text-align:right;margin-bottom:24px">
            <h2 style="color:#0c1829">\u05E7\u05D9\u05D1\u05DC\u05E0\u05D5 \u05D0\u05EA \u05D4\u05D1\u05E7\u05E9\u05D4!</h2>
            <p>\u05E9\u05DC\u05D5\u05DD ${name},</p>
            <p>\u05EA\u05D5\u05D3\u05D4 \u05E9\u05E4\u05E0\u05D9\u05EA\u05DD \u05D0\u05DC\u05D9\u05E0\u05D5. \u05E0\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05DB\u05DD \u05EA\u05D5\u05DA 24 \u05E9\u05E2\u05D5\u05EA \u05E2\u05DD \u05D4\u05E6\u05E2\u05EA \u05DE\u05D7\u05D9\u05E8 \u05DE\u05D5\u05EA\u05D0\u05DE\u05EA.</p>
            <p>\u05E9\u05D0\u05DC\u05D5\u05EA? <a href="https://wa.me/972559640902">+972 55-964-0902</a></p>
            <br><p>\u2014 \u05E6\u05D5\u05D5\u05EA Mizra</p>
          </div>
          <hr style="border:none;border-top:1px solid #eee">
          <div style="direction:ltr;text-align:left;margin-top:24px">
            <h2 style="color:#0c1829">We received your request!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for reaching out. We'll get back to you within 24 hours with a custom quote tailored to your project.</p>
            <p>Questions? <a href="https://wa.me/972559640902">+972 55-964-0902</a></p>
            <br><p>\u2014 The Mizra Team</p>
          </div>
        </div>`,
      }),
    });
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
