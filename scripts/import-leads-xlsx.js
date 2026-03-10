#!/usr/bin/env node
/**
 * MIZRA LEAD IMPORTER
 * Reads Excel file (Lobstr export) → deduplicates → inserts into Supabase
 *
 * Usage:
 *   node import-leads-xlsx.js /path/to/mizra_leads_v2.xlsx
 *   node import-leads-xlsx.js /path/to/file.xlsx --dry-run
 *   node import-leads-xlsx.js /path/to/file.xlsx --sheet "Restaurants"
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[import-leads] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Segment name → clean slug for Supabase
const SEGMENT_MAP = {
  restaurants: "restaurants",
  "beauty salons & spas": "beauty_salons",
  barbershops: "barbershops",
  "pilates studios": "pilates",
  "sports & fitness": "sports",
  "clinics & healthcare": "clinics",
  lawyers: "lawyers",
  "real estate": "real_estate",
  "contractors & renovation": "contractors",
  "interior design & architectu": "interior_design",
  "interior design & architecture": "interior_design",
  "photographers & studios": "photographers",
  "event planners": "event_planners",
};

// Hebrew category → outreach label
const CATEGORY_LABELS = {
  restaurants: "מסעדות",
  beauty_salons: "מכוני יופי",
  barbershops: "מספרות",
  pilates: "סטודיו פילאטיס",
  sports: "מאמני ספורט",
  clinics: "קליניקות",
  lawyers: "משרדי עורכי דין",
  real_estate: "נדל\"ן",
  contractors: "קבלנים",
  interior_design: "מעצבי פנים",
  photographers: "צלמים",
  event_planners: "מפיקי אירועים",
};

function cleanPhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[^0-9+]/g, "");
  if (p.startsWith("+972")) p = "0" + p.slice(4);
  if (p.startsWith("972") && p.length > 10) p = "0" + p.slice(3);
  if (p.startsWith("+")) p = p.slice(1);
  if (p.length < 9) return null;
  return p;
}

function normalizeSegment(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return SEGMENT_MAP[key] || key.replace(/[^a-z0-9]/g, "_");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { file: null, dryRun: false, sheet: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") opts.dryRun = true;
    else if (args[i] === "--sheet" && args[i + 1]) opts.sheet = args[++i];
    else if (!args[i].startsWith("--")) opts.file = args[i];
  }
  return opts;
}

async function loadXlsx(filePath, sheetFilter) {
  // Dynamic import — xlsx is a peer dependency
  const XLSX = await import("xlsx");
  const workbook = XLSX.readFile(filePath);

  const leads = [];

  for (const sheetName of workbook.SheetNames) {
    // Skip dashboard sheet
    if (sheetName.includes("Dashboard")) continue;
    if (sheetName.includes("Tous les leads")) continue;

    if (sheetFilter && !sheetName.toLowerCase().includes(sheetFilter.toLowerCase())) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // Find header row (contains "Nom" and "Téléphone")
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i].map((c) => String(c).trim());
      if (row.includes("Nom") && row.includes("Téléphone")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    const headers = rows[headerIdx].map((c) => String(c).trim());
    const colIdx = {
      segment: headers.indexOf("Segment"),
      nom: headers.indexOf("Nom"),
      categorie: headers.indexOf("Catégorie"),
      telephone: headers.indexOf("Téléphone"),
      email: headers.indexOf("Email"),
      site_web: headers.indexOf("Site Web"),
      instagram: headers.indexOf("Instagram"),
      adresse: headers.indexOf("Adresse"),
      ville: headers.indexOf("Ville"),
      score: headers.indexOf("Score"),
      avis: headers.indexOf("Avis"),
      statut: headers.indexOf("Statut"),
    };

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const nom = row[colIdx.nom] ? String(row[colIdx.nom]).trim() : "";
      if (!nom) continue;

      const phone = cleanPhone(row[colIdx.telephone]);
      const email = row[colIdx.email] ? String(row[colIdx.email]).trim() : null;

      if (!phone && !email) continue;

      leads.push({
        business_name: nom,
        segment: normalizeSegment(row[colIdx.segment]),
        category: row[colIdx.categorie] ? String(row[colIdx.categorie]).trim() : null,
        phone,
        email: email || null,
        website: row[colIdx.site_web] ? String(row[colIdx.site_web]).trim() : null,
        instagram: row[colIdx.instagram] ? String(row[colIdx.instagram]).trim() : null,
        address: row[colIdx.adresse] ? String(row[colIdx.adresse]).trim() : null,
        city: row[colIdx.ville] ? String(row[colIdx.ville]).trim() : null,
        google_score: row[colIdx.score] ? parseFloat(row[colIdx.score]) || null : null,
        google_reviews: row[colIdx.avis] ? parseInt(row[colIdx.avis]) || null : null,
        status: "new",
        source: "lobstr_xlsx",
      });
    }
  }

  return leads;
}

async function getExistingPhones() {
  const { data, error } = await supabase
    .from("leads")
    .select("phone")
    .not("phone", "is", null);

  if (error) {
    console.error("[import-leads] Error fetching existing leads:", error.message);
    return new Set();
  }
  return new Set(data.map((r) => r.phone));
}

async function getExistingEmails() {
  const { data, error } = await supabase
    .from("leads")
    .select("email")
    .not("email", "is", null);

  if (error) return new Set();
  return new Set(data.map((r) => r.email.toLowerCase()));
}

async function run() {
  const opts = parseArgs();
  if (!opts.file) {
    console.error("Usage: node import-leads-xlsx.js <file.xlsx> [--dry-run] [--sheet <name>]");
    process.exit(1);
  }

  console.log(`[import-leads] Loading ${opts.file}...`);
  const leads = await loadXlsx(opts.file, opts.sheet);
  console.log(`[import-leads] Parsed ${leads.length} leads from Excel`);

  // Dedup within file (by phone)
  const seenPhones = new Set();
  const seenEmails = new Set();
  const deduped = [];
  for (const lead of leads) {
    const key = lead.phone || lead.email?.toLowerCase();
    if (lead.phone && seenPhones.has(lead.phone)) continue;
    if (!lead.phone && lead.email && seenEmails.has(lead.email.toLowerCase())) continue;
    if (lead.phone) seenPhones.add(lead.phone);
    if (lead.email) seenEmails.add(lead.email.toLowerCase());
    deduped.push(lead);
  }
  console.log(`[import-leads] After internal dedup: ${deduped.length} unique leads`);

  // Dedup against Supabase
  const existingPhones = await getExistingPhones();
  const existingEmails = await getExistingEmails();
  const newLeads = deduped.filter((l) => {
    if (l.phone && existingPhones.has(l.phone)) return false;
    if (!l.phone && l.email && existingEmails.has(l.email.toLowerCase())) return false;
    return true;
  });
  console.log(`[import-leads] After Supabase dedup: ${newLeads.length} new leads to insert`);

  if (opts.dryRun) {
    console.log("[import-leads] [DRY RUN] Would insert:");
    const bySegment = {};
    newLeads.forEach((l) => {
      bySegment[l.segment] = (bySegment[l.segment] || 0) + 1;
    });
    Object.entries(bySegment)
      .sort((a, b) => b[1] - a[1])
      .forEach(([seg, count]) => console.log(`  ${seg}: ${count}`));
    return;
  }

  // Insert in batches of 500
  let inserted = 0;
  for (let i = 0; i < newLeads.length; i += 500) {
    const batch = newLeads.slice(i, i + 500);
    const { error } = await supabase.from("leads").insert(batch);
    if (error) {
      console.error(`[import-leads] Insert error at batch ${i}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`[import-leads] Inserted ${inserted}/${newLeads.length}`);
    }
  }

  console.log(`\n[import-leads] ===== DONE =====`);
  console.log(`  Total parsed: ${leads.length}`);
  console.log(`  Deduped: ${deduped.length}`);
  console.log(`  New inserted: ${inserted}`);
}

run().catch((err) => {
  console.error("[import-leads] Fatal error:", err);
  process.exit(1);
});
