#!/usr/bin/env node
/**
 * MIZRA FOLLOW-UP EMAIL (J+7)
 * Sends follow-up email with mockup link 7 days after WhatsApp was sent
 *
 * Usage:
 *   node followup-email.js               # send all due follow-ups
 *   node followup-email.js --dry-run     # simulate
 *   node followup-email.js --limit 50    # batch size
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[followup] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}
if (!RESEND_API_KEY) {
  console.error("[followup] Missing RESEND_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, limit: 100 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") opts.dryRun = true;
    if (args[i] === "--limit" && args[i + 1]) opts.limit = parseInt(args[++i]);
  }
  return opts;
}

function buildEmailHtml(lead) {
  const mockupUrl = lead.mockup_url || `https://getmizra.com/demo/${lead.id}`;
  const name = lead.business_name || "העסק שלכם";

  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;direction:rtl;text-align:right">
  <div style="text-align:center;margin-bottom:24px">
    <img src="https://getmizra.com/favicon.svg" alt="Mizra" width="40" height="40">
  </div>

  <h2 style="font-size:22px;color:#1a1a1a;margin-bottom:8px">שלום 👋</h2>

  <p style="font-size:15px;color:#444;line-height:1.7">
    לפני שבוע יצרנו עבור <strong>${name}</strong> עמוד אתר דמו חינמי.
    רצינו לוודא שהספקתם לראות — הנה הקישור שלכם שוב:
  </p>

  <div style="text-align:center;margin:28px 0">
    <a href="${mockupUrl}" style="display:inline-block;padding:14px 40px;background:#1a1a1a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
      צפו בדמו שלכם →
    </a>
  </div>

  <p style="font-size:14px;color:#666;line-height:1.6">
    אנחנו Mizra — בונים אתרים מקצועיים לעסקים קטנים ב-48 שעות.
    <br>נשמח לענות על שאלות. פשוט ענו על המייל הזה או
    <a href="https://wa.me/972559640902" style="color:#F5A623;font-weight:600;text-decoration:none">שלחו WhatsApp</a>.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
  <p style="font-size:12px;color:#999;text-align:center">
    Mizra · getmizra.com · hello@getmizra.com
  </p>
</div>`;
}

async function sendEmail(lead) {
  const name = lead.business_name || "העסק שלכם";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Mizra <hello@getmizra.com>",
      to: [lead.email],
      subject: `${name} — הדמו שלכם מוכן 🎨`,
      html: buildEmailHtml(lead),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[followup] Resend error for ${lead.email}:`, err);
    return false;
  }
  return true;
}

async function run() {
  const opts = parseArgs();
  console.log("[followup] ===== J+7 FOLLOW-UP EMAIL =====");
  console.log(`  Dry run: ${opts.dryRun}`);
  console.log(`  Limit: ${opts.limit}\n`);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .not("mockup_sent_at", "is", null)
    .lte("mockup_sent_at", sevenDaysAgo)
    .is("mockup_email_at", null)
    .not("email", "is", null)
    .order("mockup_sent_at", { ascending: true })
    .limit(opts.limit);

  if (error) {
    console.error("[followup] Query error:", error.message);
    process.exit(1);
  }

  console.log(`[followup] Found ${leads.length} leads due for J+7 email\n`);

  if (leads.length === 0) {
    console.log("[followup] Nothing to send.");
    return;
  }

  let sent = 0, failed = 0;

  for (const lead of leads) {
    if (opts.dryRun) {
      console.log(`[DRY] ${lead.email} | ${lead.business_name} | mockup sent: ${lead.mockup_sent_at}`);
      sent++;
      continue;
    }

    const ok = await sendEmail(lead);

    if (ok) {
      await supabase
        .from("leads")
        .update({ mockup_email_at: new Date().toISOString() })
        .eq("id", lead.id);
      sent++;
      console.log(`✅ ${lead.business_name} → ${lead.email}`);
    } else {
      failed++;
      console.log(`❌ ${lead.business_name} → ${lead.email}`);
    }

    // 500ms delay between emails
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n[followup] ===== RESULTS =====`);
  console.log(`  Sent:   ${sent}`);
  console.log(`  Failed: ${failed}`);
}

run().catch((err) => {
  console.error("[followup] Fatal:", err);
  process.exit(1);
});
