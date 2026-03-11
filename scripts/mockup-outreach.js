#!/usr/bin/env node
/**
 * MIZRA MOCKUP OUTREACH
 * Sends WhatsApp messages with personalized demo link to leads without a website
 *
 * Flow:
 *   1. Query leads where site_status = 'none'/'outdated' + mockup_sent_at IS NULL
 *   2. Send WATI template with link to getmizra.com/demo/<lead-uuid>
 *   3. Update mockup_sent_at + mockup_url in Supabase
 *
 * Usage:
 *   node mockup-outreach.js                     # all eligible, max 50
 *   node mockup-outreach.js --segment restaurants
 *   node mockup-outreach.js --dry-run
 *   node mockup-outreach.js --limit 25
 */

import { createClient } from "@supabase/supabase-js";
import { sendTemplateMessage, canSend, getSentCount, getDailyLimit, isTemplateApproved } from "./wati.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[mockup-outreach] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}
if (!process.env.WATI_API_URL || !process.env.WATI_API_KEY) {
  console.error("[mockup-outreach] Missing WATI_API_URL or WATI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const DEMO_BASE_URL = "https://getmizra.com/demo";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { segment: null, dryRun: false, limit: 50 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--segment" && args[i + 1]) opts.segment = args[++i];
    if (args[i] === "--dry-run") opts.dryRun = true;
    if (args[i] === "--limit" && args[i + 1]) opts.limit = parseInt(args[++i]);
  }
  return opts;
}

async function fetchEligibleLeads(segment, limit) {
  let query = supabase
    .from("leads")
    .select("*")
    .in("site_status", ["none", "outdated"])
    .is("mockup_sent_at", null)
    .not("phone", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (segment) query = query.eq("segment", segment);

  const { data, error } = await query;
  if (error) {
    console.error("[mockup-outreach] Query error:", error.message);
    process.exit(1);
  }
  return data || [];
}

async function sendMockup(phone, lead) {
  const mockupUrl = `${DEMO_BASE_URL}/${lead.id}`;

  // Try personalized mockup template first
  const mockupTemplateReady = await isTemplateApproved("mizra_mockup_he");
  if (mockupTemplateReady) {
    return sendTemplateMessage(phone, "mizra_mockup_he", [
      { name: "1", value: lead.business_name || "העסק שלכם" },
      { name: "2", value: lead.id },
    ]);
  }

  // Fallback: personalized outreach template
  const persoReady = await isTemplateApproved("mizra_perso_he");
  if (persoReady) {
    const { SEGMENT_LABELS_HE } = await import("./wati.js");
    const categoryLabel = SEGMENT_LABELS_HE[lead.segment] || "עסקים קטנים";
    return sendTemplateMessage(phone, "mizra_perso_he", [
      { name: "1", value: lead.business_name || "" },
      { name: "2", value: lead.business_name || "" },
      { name: "3", value: categoryLabel },
      { name: "4", value: lead.city || "תל אביב" },
    ]);
  }

  // Last fallback: static template
  return sendTemplateMessage(phone, "mizra_outreach_he", []);
}

async function run() {
  const opts = parseArgs();
  const limit = Math.min(opts.limit, getDailyLimit());

  console.log("[mockup-outreach] ===== CONFIG =====");
  console.log(`  Daily limit: ${limit}`);
  console.log(`  Segment: ${opts.segment || "all"}`);
  console.log(`  Dry run: ${opts.dryRun}`);

  const mockupReady = await isTemplateApproved("mizra_mockup_he");
  const persoReady = await isTemplateApproved("mizra_perso_he");
  const templateName = mockupReady ? "mizra_mockup_he" : persoReady ? "mizra_perso_he" : "mizra_outreach_he";
  console.log(`  Template: ${templateName}\n`);

  const leads = await fetchEligibleLeads(opts.segment, limit);
  console.log(`[mockup-outreach] Found ${leads.length} leads without website to contact\n`);

  if (leads.length === 0) {
    console.log("[mockup-outreach] Nothing to send.");
    return;
  }

  let sent = 0, failed = 0, skipped = 0;

  for (const lead of leads) {
    if (!canSend()) {
      console.log("[mockup-outreach] Rate limit or hours — stopping.");
      skipped += leads.length - sent - failed - skipped;
      break;
    }

    const phone = lead.phone.replace(/[^0-9]/g, "");
    if (!phone || phone.length < 9) {
      skipped++;
      continue;
    }

    const mockupUrl = `${DEMO_BASE_URL}/${lead.id}`;

    if (opts.dryRun) {
      console.log(`[DRY] ${phone} | ${lead.business_name} | ${lead.segment} | ${lead.site_status} | ${mockupUrl}`);
      sent++;
      continue;
    }

    const result = await sendMockup(phone, lead);

    if (result.success) {
      await supabase
        .from("leads")
        .update({
          mockup_sent_at: new Date().toISOString(),
          mockup_url: mockupUrl,
          status: "mockup_sent",
          canal: "whatsapp",
          wati_template: templateName,
        })
        .eq("id", lead.id);
      sent++;
      console.log(`✅ ${lead.business_name} → ${mockupUrl}`);
    } else {
      await supabase
        .from("leads")
        .update({ wati_error: result.reason || result.error || "unknown" })
        .eq("id", lead.id);
      failed++;
      console.log(`❌ ${lead.business_name} → ${result.reason || result.error}`);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n[mockup-outreach] ===== RESULTS =====`);
  console.log(`  Sent:    ${sent}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  WATI daily count: ${getSentCount()}/${getDailyLimit()}`);
}

run().catch((err) => {
  console.error("[mockup-outreach] Fatal:", err);
  process.exit(1);
});
