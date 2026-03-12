import { createClient } from '@supabase/supabase-js';

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.API_SUPABASE;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WATI_API_URL = process.env.WATI_API_URL;
const WATI_API_TOKEN = process.env.WATI_API_TOKEN;
const WATI_TEMPLATE_NAME = process.env.WATI_TEMPLATE_NAME || 'website_mockup_outreach_mizra';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'hello@getmizra.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Mizra';
const CLOUDINARY_BASE_URL = process.env.CLOUDINARY_BASE_URL || '';
const WHATSAPP_COUNT = parseInt(process.env.WHATSAPP_COUNT || '50');
const EMAIL_COUNT = parseInt(process.env.EMAIL_COUNT || '50');
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── MOCKUP URL BUILDER ──────────────────────────────────────
function buildMockupUrl(lead) {
  if (!CLOUDINARY_BASE_URL) return null;
  const slug = lead.category_slug || 'restaurant';
  const name = encodeURIComponent((lead.name || 'Business').substring(0, 40));
  return `${CLOUDINARY_BASE_URL}/l_text:Heebo_36_bold:${name},co_white,g_north,y_80/mockup-${slug}.png`;
}

// ── WATI WhatsApp API ───────────────────────────────────────
async function sendWhatsApp(lead, mockupUrl) {
  if (!WATI_API_URL || !WATI_API_TOKEN) throw new Error('Wati not configured');

  // Phone should already be in 972XXXXXXXXX format from import
  const phone = lead.phone;
  if (!phone) throw new Error('No phone');

  const body = {
    template_name: WATI_TEMPLATE_NAME,
    broadcast_name: `outreach_${new Date().toISOString().split('T')[0]}`,
    receivers: [{
      whatsappNumber: phone,
      customParams: [
        { name: 'business_name', value: lead.name || '' },
        { name: 'category', value: lead.category || 'business' },
      ],
    }],
  };

  const res = await fetch(`${WATI_API_URL}/api/v1/sendTemplateMessages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WATI_API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Wati ${res.status}: ${err.substring(0, 200)}`);
  }
  return res.json();
}

// ── BREVO Email API ─────────────────────────────────────────
function buildEmailHTML(lead, mockupUrl) {
  const businessName = lead.name || '';
  const ctaUrl = 'https://getmizra.com/free-audit/?utm_source=outreach&utm_medium=email';
  const whatsappUrl = 'https://wa.me/972542271670?text=' + encodeURIComponent(`היי, קיבלתי מייל על ${businessName}`);
  const unsubUrl = `https://getmizra.com/.netlify/functions/unsubscribe?id=${lead.id}`;
  const mockupHtml = mockupUrl
    ? `<div style="text-align:center;margin:0 0 24px;"><img src="${mockupUrl}" width="500" style="max-width:100%;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" alt="Website mockup"></div>`
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0D2137;padding:24px 32px;text-align:center;">
  <h1 style="color:#fff;font-size:20px;margin:0;">שלום ${businessName}!</h1>
  <p style="color:#F97316;font-size:14px;margin:8px 0 0;">הצצה לאתר שיכול להיות שלכם</p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">
    אנחנו <strong>Mizra</strong> — בונים אתרים מקצועיים לעסקים כמו שלכם.
  </p>
  <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 24px;">
    הנה איך האתר שלכם יכול להיראות:
  </p>
  ${mockupHtml}
  <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 24px;">
    אתר מקצועי, מהיר, מותאם למובייל — מוכן תוך 48 שעות.<br>
    כולל SEO, Google Maps, טופס יצירת קשר ו-WhatsApp.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:8px;">
      <a href="${ctaUrl}" style="display:inline-block;background:#0D2137;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
        בדיקה חינמית לעסק שלי
      </a>
    </td></tr>
    <tr><td align="center" style="padding:8px;">
      <a href="${whatsappUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;">
        שלחו לי הודעה בוואטסאפ
      </a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee;">
  <p style="font-size:11px;color:#999;text-align:center;margin:0;">
    Mizra | getmizra.com | hello@getmizra.com<br>
    <a href="${unsubUrl}" style="color:#999;">הסרה מרשימת התפוצה</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

async function sendEmail(lead, mockupUrl) {
  if (!BREVO_API_KEY) throw new Error('Brevo not configured');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: lead.email, name: lead.name }],
      subject: `${lead.name} — ככה האתר שלכם יכול להיראות`,
      htmlContent: buildEmailHTML(lead, mockupUrl),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err.substring(0, 200)}`);
  }
  return res.json();
}

// ── SLEEP HELPER ────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── MAIN ────────────────────────────────────────────────────
async function run() {
  console.log(`🚀 Mizra Daily Outreach — ${new Date().toISOString()}`);
  console.log(`   WhatsApp: ${WHATSAPP_COUNT} | Email: ${EMAIL_COUNT} | Dry run: ${DRY_RUN}`);
  console.log('');

  const errors = [];
  let whatsappSent = 0, whatsappFailed = 0, emailSent = 0, emailFailed = 0;

  // ── WHATSAPP BATCH ──────────────────────────────────────
  const { data: waLeads, error: waErr } = await supabase
    .from('leads')
    .select('*')
    .eq('outreach_status', 'pending')
    .not('phone', 'is', null)
    .neq('phone', '')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(WHATSAPP_COUNT);

  if (waErr) console.error('WA query error:', waErr.message);
  console.log(`📱 WhatsApp: ${(waLeads || []).length} leads queued`);

  for (const lead of (waLeads || [])) {
    const mockupUrl = buildMockupUrl(lead);
    try {
      if (!DRY_RUN) await sendWhatsApp(lead, mockupUrl);
      else console.log(`   [DRY] WA → ${lead.phone} (${lead.name})`);

      await supabase.from('leads').update({
        outreach_status: lead.email_sent_at ? 'sent_both' : 'sent_whatsapp',
        whatsapp_sent_at: new Date().toISOString(),
        last_contacted_at: new Date().toISOString(),
        contact_count: (lead.contact_count || 0) + 1,
        mockup_url: mockupUrl,
      }).eq('id', lead.id);

      whatsappSent++;
    } catch (err) {
      whatsappFailed++;
      errors.push({ lead_id: lead.id, channel: 'whatsapp', error: err.message });
      console.error(`   ❌ WA ${lead.name}: ${err.message}`);
    }
    await sleep(200);
  }

  // ── EMAIL BATCH ─────────────────────────────────────────
  const { data: emailLeads, error: emErr } = await supabase
    .from('leads')
    .select('*')
    .eq('outreach_status', 'pending')
    .not('email', 'is', null)
    .neq('email', '')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(EMAIL_COUNT);

  if (emErr) console.error('Email query error:', emErr.message);
  console.log(`\n📧 Email: ${(emailLeads || []).length} leads queued`);

  for (const lead of (emailLeads || [])) {
    const mockupUrl = buildMockupUrl(lead);
    try {
      if (!DRY_RUN) await sendEmail(lead, mockupUrl);
      else console.log(`   [DRY] Email → ${lead.email} (${lead.name})`);

      await supabase.from('leads').update({
        outreach_status: lead.whatsapp_sent_at ? 'sent_both' : 'sent_email',
        email_sent_at: new Date().toISOString(),
        last_contacted_at: new Date().toISOString(),
        contact_count: (lead.contact_count || 0) + 1,
        mockup_url: mockupUrl,
      }).eq('id', lead.id);

      emailSent++;
    } catch (err) {
      emailFailed++;
      errors.push({ lead_id: lead.id, channel: 'email', error: err.message });
      console.error(`   ❌ Email ${lead.name}: ${err.message}`);
    }
    await sleep(100);
  }

  // ── LOG RUN ─────────────────────────────────────────────
  await supabase.from('outreach_logs').insert({
    run_at: new Date().toISOString(),
    whatsapp_sent: whatsappSent,
    whatsapp_failed: whatsappFailed,
    email_sent: emailSent,
    email_failed: emailFailed,
    errors: errors.length > 0 ? errors : null,
  });

  console.log('\n📊 RESULTS');
  console.log(`   WhatsApp: ${whatsappSent} sent / ${whatsappFailed} failed`);
  console.log(`   Email:    ${emailSent} sent / ${emailFailed} failed`);
  if (errors.length) console.log(`   Errors:   ${errors.length}`);
  console.log(`\n✅ Done`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
