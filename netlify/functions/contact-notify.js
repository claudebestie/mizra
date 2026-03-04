exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };
  const { name, email, subject, message } = JSON.parse(event.body);
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Mizra Contact <hello@getmizra.com>",
      to: ["hello@getmizra.com"],
      subject: `🔔 Nouveau contact — ${name}`,
      html: `<h2>Nouveau message via getmizra.com/contact</h2><p><strong>Nom :</strong> ${name}</p><p><strong>Email :</strong> ${email}</p><p><strong>Sujet :</strong> ${subject || "—"}</p><p><strong>Message :</strong><br>${message}</p>`,
    }),
  });
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Mizra <hello@getmizra.com>",
      to: [email],
      subject: "קיבלנו את ההודעה שלך ✓",
      html: `<p>שלום ${name},</p><p>תודה שפנית אלינו! קיבלנו את ההודעה שלך ונחזור אליך תוך 24 שעות.</p><br><p>— צוות Mizra</p>`,
    }),
  });
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
