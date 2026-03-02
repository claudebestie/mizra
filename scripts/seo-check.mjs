/**
 * SEO QA script — fails the build if any generated page has:
 * - Missing <title>
 * - Missing meta description
 * - Missing canonical
 * - Missing H1
 * - Duplicate titles across pages
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as cheerio from 'cheerio';

const distDir = 'dist';

function findHtmlFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findHtmlFiles(full, files);
    } else if (entry.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const allHtmlFiles = findHtmlFiles(distDir);

// Only check programmatic SEO pages (those with -website- in path)
// Existing static pages (examples/, blog/, services/, etc.) are not checked
const htmlFiles = allHtmlFiles.filter(f => {
  const rel = relative(distDir, f);
  return rel.includes('-website-');
});

const errors = [];
const titles = new Map(); // title -> file path

console.log(`\n🔍 SEO Check: scanning ${htmlFiles.length} programmatic pages (${allHtmlFiles.length} total HTML files)...\n`);

for (const file of htmlFiles) {
  const rel = relative(distDir, file);
  const html = readFileSync(file, 'utf-8');
  const $ = cheerio.load(html);

  // Check title
  const title = $('title').first().text().trim();
  if (!title) {
    errors.push(`❌ Missing <title> in ${rel}`);
  } else {
    if (titles.has(title)) {
      errors.push(`❌ Duplicate title "${title}" in ${rel} (also in ${titles.get(title)})`);
    } else {
      titles.set(title, rel);
    }
  }

  // Check meta description
  const metaDesc = $('meta[name="description"]').attr('content');
  if (!metaDesc || metaDesc.trim().length === 0) {
    errors.push(`❌ Missing meta description in ${rel}`);
  }

  // Check canonical
  const canonical = $('link[rel="canonical"]').attr('href');
  if (!canonical || canonical.trim().length === 0) {
    errors.push(`❌ Missing canonical link in ${rel}`);
  }

  // Check H1
  const h1 = $('h1').first().text().trim();
  if (!h1) {
    errors.push(`❌ Missing H1 in ${rel}`);
  }
}

if (errors.length > 0) {
  console.log('SEO Check FAILED:\n');
  for (const err of errors) {
    console.log(`  ${err}`);
  }
  console.log(`\n${errors.length} issue(s) found.\n`);
  process.exit(1);
} else {
  console.log(`✅ SEO Check PASSED: ${htmlFiles.length} pages checked, no issues found.\n`);
  process.exit(0);
}
