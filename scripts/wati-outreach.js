#!/usr/bin/env node
/**
 * MIZRA WATI OUTREACH
 * Reads new leads from Supabase → sends personalized WhatsApp via WATI
 *
 * Rules:
 *   - Max 50 messages/day (configurable via WATI_DAILY_LIMIT)
 *   - Sending hours: 9h-20h Israel time
 *   - Uses personalized template (mizra_perso_he) if approved
 *   - Falls back to static template (mizra_outreach_he) otherwise
 *   - 2s delay between sends
 *
 * Usage:
 *   node wati-outreach.js                          # all new leads, max 50
 *   node wati-outreach.js --segment restaurants     # filter by segment
 *   node wati-outreach.js --dry-run                 # simulate without sending
 *   node wati-outreach.js --limit 25                # override daily cap
 */

import { createClient } from "@supabase/supabase-js";
import { sendOutreach, canSend, getSentCount, getDailyLimit, isTemplateApproved } from "./wati.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[wati-outreach] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}
if (!process.env.WATI_API_URL || !process.env.WATI_API_KEY) {
  console.error("[wati-outreach] Missing WATI_API_URL or WATI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

async function fetchNewLeads(segment, limit) {
  let query = supabase
    .from("leads")
    .select("*")
    .eq("status", "new")
    .is("wati_sent_at", null)
    .not("phone", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (segment) query = query.eq("segment", segment);

  const { data, error } = await query;
  if (error) {
    console.error("[wati-outreach] Supabase query error:", error.message);
    process.exit(1);
  }
  return data || [];
}

async function markAsSent(leadId, templateUsed) {
  const { error } = await supabase
    .from("leads")
    .update({
      wati_sent_at: new Date().toISOString(),
      wati_template: templateUsed,
      status: "contacted",
      canal: "whatsapp",
    })
    .eq("id", leadId);

  if (error) console.error(`[wati-outreach] Failed to update lead ${leadId}:`, error.message);
}

async function markAsFailed(leadId, reason) {
  const { error } = await supabase
    .from("leads")
    .update({ wati_error: reason })
    .eq("id", leadId);

  if (error) console.error(`[wati-outreach] Failed to flag lead ${leadId}:`, error.message);
}

async function run() {
  const opts = parseArgs();
  const limit = Math.min(opts.limit, getDailyLimit());

  console.log("[wati-outreach] ===== CONFIG =====");
  console.log(`  Daily limit: ${limit}`);
  console.log(`  Segment: ${opts.segment || "all"}`);
  console.log(`  Dry run: ${opts.dryRun}`);

  // Check which template will be used
  const persoReady = await isTemplateApproved("mizra_perso_he");
  console.log(`  Template: ${persoReady ? "mizra_perso_he (personalized ✨)" : "mizra_outreach_he (static)"}`);
  console.log("");

  const leads = await fetchNewLeads(opts.segment, limit);
  console.log(`[wati-outreach] Found ${leads.length} new leads to contact\n`);

  if (leads.length === 0) {
    console.log("[wati-outreach] Nothing to send. Done.");
    return;
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (!canSend()) {
      console.log("[wati-outreach] Rate limit or hours — stopping.");
      skipped += leads.length - sent - failed - skipped;
      break;
    }

    const phone = lead.phone.replace(/[^0-9]/g, "");
    if (!phone || phone.length < 9) {
      console.log(`[wati-outreach] ⚠️  Invalid phone for "${lead.business_name}" (${lead.id}), skipping`);
      skipped++;
      continue;
    }

    if (opts.dryRun) {
      const tmpl = persoReady ? "perso" : "static";
      console.log(
        `[wati-outreach] [DRY] ${phone} | ${lead.business_name || "?"} | ${lead.segment} | ${lead.city || "?"} | ${tmpl}`
      );
      sent++;
      continue;
    }

    const result = await sendOutreach(phone, lead);
    const templateUsed = persoReady ? "mizra_perso_he" : "mizra_outreach_he";

    if (result.success) {
      await markAsSent(lead.id, templateUsed);
      sent++;
    } else {
      await markAsFailed(lead.id, result.reason || result.error || "unknown");
      failed++;
    }

    // 2s delay between messages
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n[wati-outreach] ===== RESULTS =====`);
  console.log(`  Sent:    ${sent}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  WATI daily count: ${getSentCount()}/${getDailyLimit()}`);
  console.log(`  Remaining leads (segment): check Supabase`);
}

run().catch((err) => {
  console.error("[wati-outreach] Fatal error:", err);
  process.exit(1);
});
