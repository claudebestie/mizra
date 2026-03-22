exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  const { contact_name, restaurant_name, email, phone, website_status, business_type, lang } = JSON.parse(event.body);
  const isHe = lang === "he";

  // 1. Notify admin
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Mizra Mockup <hello@getmizra.com>",
      to: ["hello@getmizra.com"],
      subject: `🎨 Nouvelle demande de mockup — ${restaurant_name} (${contact_name})`,
      html: `
        <h2>Nouvelle demande de mockup gratuit</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Nom</td><td style="padding:8px 0">${contact_name}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Business</td><td style="padding:8px 0">${restaurant_name}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Téléphone</td><td style="padding:8px 0">${phone || "—"}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Site actuel</td><td style="padding:8px 0">${website_status || "—"}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Type</td><td style="padding:8px 0">${business_type || "—"}</td></tr>
          <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#666">Langue</td><td style="padding:8px 0">${lang}</td></tr>
        </table>
      `,
    }),
  });

  // 2. Confirmation email to the user
  const subjectLine = isHe
    ? "קיבלנו את הבקשה שלך למוקאפ חינמי ✓"
    : "We received your free mockup request ✓";

  const htmlBody = isHe
    ? `<div style="font-family:sans-serif;direction:rtl;text-align:right">
        <p>שלום ${contact_name},</p>
        <p>תודה שביקשת מוקאפ חינמי לאתר <strong>${restaurant_name}</strong>!</p>
        <p>הצוות שלנו כבר עובד על העיצוב שלך. תקבל/י את המוקאפ המותאם תוך <strong>48 שעות</strong> ישירות למייל.</p>
        <p>איך זה עובד:</p>
        <ul style="line-height:2">
          <li>🎨 אנחנו מעצבים מוקאפ מותאם לעסק שלך</li>
          <li>📩 שולחים אותו למייל תוך 48 שעות</li>
          <li>💳 אהבת? משלמים ומקבלים אתר מוכן</li>
          <li>🔄 סבב תיקונים אחד כלול</li>
          <li>🚀 האתר שלך באוויר תוך 48 שעות מהתשלום</li>
        </ul>
        <p>אם יש לך שאלות בינתיים, אפשר לענות ישירות על המייל הזה.</p>
        <br>
        <p>— צוות Mizra</p>
      </div>`
    : `<div style="font-family:sans-serif">
        <p>Hi ${contact_name},</p>
        <p>Thanks for requesting a free website mockup for <strong>${restaurant_name}</strong>!</p>
        <p>Our team is already working on your design. You'll receive your custom mockup within <strong>48 hours</strong> directly to your email.</p>
        <p>Here's how it works:</p>
        <ul style="line-height:2">
          <li>🎨 We design a custom mockup for your business</li>
          <li>📩 We send it to your email within 48 hours</li>
          <li>💳 Love it? Pay and get your site live</li>
          <li>🔄 One revision round included</li>
          <li>🚀 Your site goes live within 48 hours of payment</li>
        </ul>
        <p>If you have any questions in the meantime, just reply to this email.</p>
        <br>
        <p>— The Mizra Team</p>
      </div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Mizra <hello@getmizra.com>",
      to: [email],
      subject: subjectLine,
      html: htmlBody,
    }),
  });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
