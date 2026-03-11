#!/usr/bin/env node
/**
 * MIZRA SITE CHECKER
 * Checks each lead's website for existence and mobile-readiness
 * Results: 'none' (no website), 'outdated' (down/no viewport), 'ok' (live + mobile)
 *
 * Usage:
 *   node check-sites.js                     # all unchecked leads
 *   node check-sites.js --limit 200         # batch size
 *   node check-sites.js --segment restaurants
 *   node check-sites.js --dry-run
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[check-sites] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: 200, segment: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) opts.limit = parseInt(args[++i]);
    if (args[i] === "--segment" && args[i + 1]) opts.segment = args[++i];
    if (args[i] === "--dry-run") opts.dryRun = true;
  }
  return opts;
}

async function checkSite(url) {
  if (!url.startsWith("http")) url = "https://" + url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mizra-SiteChecker/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return "outdated";

    const html = await res.text();
    const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
    return hasViewport ? "ok" : "outdated";
  } catch {
    return "outdated";
  }
}

async function run() {
  const opts = parseArgs();
  console.log("[check-sites] ===== CONFIG =====");
  console.log(`  Limit: ${opts.limit}`);
  console.log(`  Segment: ${opts.segment || "all"}`);
  console.log(`  Dry run: ${opts.dryRun}\n`);

  // Fetch unchecked leads
  let query = supabase
    .from("leads")
    .select("id, business_name, website, segment")
    .is("site_checked_at", null)
    .order("created_at", { ascending: true })
    .limit(opts.limit);

  if (opts.segment) query = query.eq("segment", opts.segment);

  const { data: leads, error } = await query;
  if (error) {
    console.error("[check-sites] Query error:", error.message);
    process.exit(1);
  }

  console.log(`[check-sites] Found ${leads.length} unchecked leads\n`);
  if (leads.length === 0) return;

  let stats = { none: 0, outdated: 0, ok: 0 };

  for (const lead of leads) {
    let status;

    if (!lead.website || lead.website.trim() === "") {
      status = "none";
    } else {
      if (opts.dryRun) {
        console.log(`[check-sites] [DRY] Would check: ${lead.website} (${lead.business_name})`);
        stats.ok++;
        continue;
      }
      status = await checkSite(lead.website);
      // 1s delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    }

    stats[status]++;
    const icon = status === "ok" ? "✅" : status === "none" ? "🚫" : "⚠️";
    console.log(`${icon} ${lead.business_name} → ${status} ${lead.website || "(no url)"}`);

    if (!opts.dryRun) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          site_status: status,
          site_checked_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateErr) console.error(`[check-sites] Update error for ${lead.id}:`, updateErr.message);
    }
  }

  console.log(`\n[check-sites] ===== RESULTS =====`);
  console.log(`  No website: ${stats.none}`);
  console.log(`  Outdated:   ${stats.outdated}`);
  console.log(`  OK:         ${stats.ok}`);
}

run().catch((err) => {
  console.error("[check-sites] Fatal:", err);
  process.exit(1);
});
