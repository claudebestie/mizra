#!/usr/bin/env node
/**
 * MIZRA BLOG AUTOMATION
 * Generates 5 SEO articles per week via Claude API (EN + HE only)
 * Publishes to Supabase + GitHub (Astro/Netlify)
 *
 * Topics are generated dynamically by Claude — never runs out.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { Octokit } from "@octokit/rest";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const ARTICLES_PER_RUN = parseInt(process.env.ARTICLES_PER_RUN || "5");

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// ─── NICHE PROFESSIONS ──────────────────────────────────────────────────────
// Claude picks from these + invents cross-cutting angles (SEO, pricing, booking, etc.)
const PROFESSIONS = [
  "psychologist", "therapist", "psychiatrist", "social worker",
  "nutritionist", "dietitian", "physiotherapist", "occupational therapist",
  "speech therapist", "chiropractor", "osteopath", "acupuncturist",
  "dentist", "orthodontist", "dermatologist", "pediatrician",
  "veterinarian", "optometrist",
  "lawyer", "notary", "mediator", "tax consultant", "accountant",
  "architect", "interior designer", "landscape designer",
  "personal trainer", "pilates instructor", "yoga teacher", "sports coach",
  "hair stylist", "barber", "beautician", "nail technician", "tattoo artist",
  "photographer", "videographer", "graphic designer", "web designer",
  "music teacher", "private tutor", "language teacher", "driving instructor",
  "real estate agent", "mortgage broker", "insurance agent",
  "electrician", "plumber", "locksmith", "handyman", "painter",
  "dog trainer", "pet groomer", "pet sitter",
  "wedding planner", "event planner", "florist", "caterer",
  "life coach", "business coach", "career coach",
  "restaurant owner", "cafe owner", "bakery owner", "food truck owner",
  "mechanic", "auto detailer",
];

// ─── TOPIC GENERATION (DYNAMIC) ─────────────────────────────────────────────
async function generateTopics(count, existingSlugs) {
  const slugList = existingSlugs.size > 0
    ? `\nALREADY PUBLISHED (do NOT repeat these or similar topics):\n${[...existingSlugs].map(s => `- ${s}`).join("\n")}`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: `You generate blog topic ideas for Mizra (getmizra.com), an Israeli web agency that builds professional websites for small businesses.

RULES:
- Generate exactly ${count} article topics
- Each run: roughly half in English (lang: "en"), half in Hebrew (lang: "he")
- Focus on NICHE professions and specific, practical website questions
- Topics should be specific and actionable, not generic (e.g. "Should a veterinarian show prices on their website?" not "How to build a website")
- Mix professions from this list: ${PROFESSIONS.join(", ")}
- Mix angles: website design tips, SEO, online booking, pricing display, testimonials, photos, Google My Business, social media integration, before/after portfolios, bilingual sites, mobile optimization, etc.
- Slugs must be URL-safe (lowercase, hyphens, no special chars)
- For Hebrew articles: slug should be transliterated (e.g. "atar-le-rofe-shinayim-israel")
- Never repeat a topic that's already been published

OUTPUT FORMAT: Return ONLY a valid JSON array, no markdown fences, no commentary. Each item:
{"lang": "en"|"he", "title": "...", "keyword": "...", "slug": "...", "series": "..."}

series should be a category like "profession", "seo", "comparison", "tips", "case-study"`,
    messages: [{
      role: "user",
      content: `Generate ${count} unique blog topics for this week.${slugList}`
    }],
  });

  const text = response.content[0].text.trim();
  try {
    const topics = JSON.parse(text);
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error("Empty or invalid topics array");
    }
    // Validate and filter
    return topics
      .filter(t => t.lang && t.title && t.keyword && t.slug)
      .filter(t => ["en", "he"].includes(t.lang))
      .filter(t => !existingSlugs.has(t.slug))
      .slice(0, count);
  } catch (err) {
    console.error("Failed to parse topics JSON:", text.substring(0, 200));
    throw new Error(`Topic generation failed: ${err.message}`);
  }
}

// ─── SYSTEM PROMPTS ─────────────────────────────────────────────────────────
function getSystemPrompt(lang) {
  const prompts = {
    en: `You are an SEO expert and content writer for Mizra (getmizra.com), an Israeli web agency that creates professional websites for SMBs in 48 hours starting at ₪2,990.

MISSION: Write high-quality SEO blog articles in English, targeting small businesses and professionals in Israel.

MANDATORY STRUCTURE:
1. Complete YAML frontmatter: title, description, date, author ("Mizra Team"), tags (array), keyword, lang ("en"), readingTime (e.g. "6 min")
2. Engaging introduction (150-200 words) with the main keyword
3. 4-6 H2 sections with H3 subsections as needed
4. "How Mizra Can Help" section naturally integrated (not salesy)
5. FAQ section (5-7 concrete questions/answers using ### for each question)
6. Conclusion with CTA link: [See our plans →](/pricing/)

SEO RULES:
- Length: 1800-2500 words
- Main keyword in H1, first paragraph, 2-3 H2s, and conclusion
- Short sentences, airy paragraphs, bullet points when useful
- Tone: professional but accessible, opinionated, practical
- Mention Tel Aviv, Israel, local market context when relevant
- Prices in shekels (₪) when discussing costs
- No generic fluff — be specific, give real numbers and examples

OUTPUT FORMAT: Pure Markdown (.md), YAML frontmatter at top, no HTML tags.
Reply ONLY with the article content, no intro or commentary.`,

    he: `אתה מומחה SEO וכותב תוכן עבור Mizra (getmizra.com), סוכנות ווב ישראלית שבונה אתרים מקצועיים לעסקים קטנים תוך 48 שעות החל מ-₪2,990.

משימה: לכתוב מאמרי בלוג SEO איכותיים בעברית, המיועדים לעסקים קטנים ובעלי מקצוע בישראל.

מבנה חובה:
1. Frontmatter YAML מלא: title, description, date, author ("צוות Mizra"), tags (מערך), keyword, lang ("he"), readingTime (לדוגמה "6 דק׳")
2. פתיחה מושכת (150-200 מילים) עם מילת המפתח הראשית
3. 4-6 כותרות H2 עם H3 במידת הצורך
4. קטע "איך Mizra עוזרת" משולב באופן טבעי (לא פרסומי)
5. שאלות נפוצות (5-7 שאלות ותשובות עם ### לכל שאלה)
6. סיכום עם קריאה לפעולה: [גלו את המסלולים שלנו ←](/pricing/)

כללי SEO:
- אורך: 1800-2500 מילים
- מילת המפתח ב-H1, פסקה ראשונה, 2-3 כותרות H2, וסיכום
- משפטים קצרים, פסקאות מאווררות, רשימות תבליטים
- טון: מקצועי אך נגיש, עם דעה, מעשי
- הזכרת תל אביב, ישראל, שוק מקומי
- מחירים בשקלים (₪)
- בלי מילוי גנרי — להיות ספציפי, לתת מספרים ודוגמאות אמיתיות

פורמט פלט: Markdown טהור בלבד, YAML frontmatter בתחילת הקובץ, ללא תגיות HTML.
להגיב רק עם תוכן המאמר, ללא הקדמה או הערות.`
  };
  return prompts[lang];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getContentPath(slug) {
  return `src/content/blog/${slug}.md`;
}

async function getPublishedSlugs() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");
  if (error) throw error;
  return new Set((data || []).map((r) => r.slug));
}

// ─── ARTICLE GENERATION ──────────────────────────────────────────────────────
async function generateArticle(topic) {
  console.log(`\n Writing: "${topic.title}" [${topic.lang}]`);

  const today = new Date().toISOString().split("T")[0];

  const userPrompt = topic.lang === "he"
    ? `כתוב מאמר בלוג SEO מלא עבור Mizra על הנושא הבא:

כותרת: ${topic.title}
מילת מפתח ראשית: ${topic.keyword}
תאריך: ${today}

המאמר צריך לפנות לבעלי מקצוע ועסקים קטנים בישראל שרוצים לבנות נוכחות אונליין מקצועית.`
    : `Write a complete SEO blog article for Mizra on this topic:

Title: ${topic.title}
Main keyword: ${topic.keyword}
Date: ${today}

The article should target professionals and small business owners in Israel who want to build a professional online presence.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: getSystemPrompt(topic.lang),
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0].text;
  console.log(`  Article generated (${content.length} chars)`);
  return content;
}

// ─── SUPABASE SAVE ────────────────────────────────────────────────────────────
async function saveToSupabase(topic, content, githubPath) {
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("blog_posts").upsert({
    slug: topic.slug,
    title: topic.title,
    keyword: topic.keyword,
    lang: topic.lang,
    series: topic.series,
    content: content,
    github_path: githubPath,
    status: "published",
    published_at: today,
    created_at: new Date().toISOString(),
    word_count: content.split(/\s+/).length,
  }, { onConflict: "slug" });

  if (error) throw error;
  console.log(`  Saved to Supabase`);
}

// ─── GITHUB PUSH ──────────────────────────────────────────────────────────────
async function pushToGitHub(topic, content) {
  const filePath = getContentPath(topic.slug);
  const encodedContent = Buffer.from(content, "utf-8").toString("base64");

  let sha;
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
    });
    sha = data.sha;
  } catch {
    // File doesn't exist yet
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: filePath,
    message: `blog: add "${topic.title}" [${topic.lang}] [automated]`,
    content: encodedContent,
    ...(sha ? { sha } : {}),
  });

  console.log(`  Pushed to GitHub: ${filePath}`);
  return filePath;
}

// ─── NETLIFY REBUILD ─────────────────────────────────────────────────────────
async function triggerRebuild() {
  const NETLIFY_BUILD_HOOK = process.env.NETLIFY_BUILD_HOOK;
  if (!NETLIFY_BUILD_HOOK) {
    console.log("  NETLIFY_BUILD_HOOK not set, skipping rebuild");
    return;
  }
  try {
    const resp = await fetch(NETLIFY_BUILD_HOOK, { method: "POST" });
    if (resp.ok) console.log("  Netlify rebuild triggered");
    else console.log("  Netlify build hook error:", resp.status);
  } catch (e) {
    console.log("  Could not trigger Netlify:", e.message);
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("MIZRA BLOG AUTOMATION");
  console.log(`Date: ${new Date().toISOString().split("T")[0]}`);
  console.log(`Target: ${ARTICLES_PER_RUN} articles (EN + HE)\n`);

  // Validate env vars
  const required = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error("Missing env vars:", missing.join(", "));
    process.exit(1);
  }

  // Get already published slugs
  const publishedSlugs = await getPublishedSlugs();
  console.log(`Already published: ${publishedSlugs.size} articles\n`);

  // Ask Claude to pick topics dynamically
  console.log("Generating topics...");
  const topics = await generateTopics(ARTICLES_PER_RUN, publishedSlugs);
  console.log(`${topics.length} topics selected:`);
  topics.forEach((t) => console.log(`  - [${t.lang}] ${t.title}`));

  const results = { success: [], failed: [] };

  for (const topic of topics) {
    try {
      const content = await generateArticle(topic);
      const githubPath = await pushToGitHub(topic, content);
      await saveToSupabase(topic, content, githubPath);
      results.success.push(topic.slug);
      // Pause between articles to avoid rate limits
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  Error for ${topic.slug}:`, err.message);
      results.failed.push({ slug: topic.slug, error: err.message });
    }
  }

  // Trigger Netlify rebuild after all articles
  if (results.success.length > 0) {
    await triggerRebuild();
  }

  console.log("\nSUMMARY:");
  console.log(`  Success: ${results.success.length}/${topics.length}`);
  if (results.failed.length > 0) {
    console.log("  Failed:", results.failed.map((f) => f.slug).join(", "));
  }

  // Log to Supabase for monitoring
  await supabase.from("automation_logs").insert({
    run_at: new Date().toISOString(),
    articles_generated: results.success.length,
    articles_failed: results.failed.length,
    slugs_success: results.success,
    slugs_failed: results.failed,
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
