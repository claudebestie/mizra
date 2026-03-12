import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.API_SUPABASE;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CATEGORY → SLUG MAPPING ────────────────────────────────
// Maps Hebrew + English CSV categories to getmizra.com/examples/ slugs
const CATEGORY_MAP = {
  // Restaurants
  'restaurant': 'restaurant',
  'hamburger restaurant': 'restaurant',
  'pizza restaurant': 'restaurant',
  'kosher restaurant': 'restaurant',
  'fast food restaurant': 'restaurant',
  'italian restaurant': 'restaurant',
  'asian restaurant': 'restaurant',
  'thai restaurant': 'restaurant',
  'sushi restaurant': 'restaurant',
  'chophouse restaurant': 'restaurant',
  'mexican restaurant': 'restaurant',
  'seafood restaurant': 'restaurant',
  'chinese restaurant': 'restaurant',
  'japanese restaurant': 'restaurant',
  'indian restaurant': 'restaurant',
  'vegetarian restaurant': 'restaurant',
  'vegan restaurant': 'restaurant',
  'mediterranean restaurant': 'restaurant',
  'steak house': 'restaurant',
  'cafe': 'restaurant',
  'coffee shop': 'restaurant',
  'bar': 'restaurant',

  // Beauty & Hair
  'מספרה': 'beauty-salon',
  'מכון יופי': 'beauty-salon',
  'קליניקה לאיפור קבוע': 'beauty-salon',
  'קליניקה לטיפוח העור': 'beauty-salon',
  'שירות הסרת שיער בלייזר': 'beauty-salon',
  'מספרת גברים': 'barbershop',
  'barber shop': 'barbershop',
  'beauty salon': 'beauty-salon',
  'hair salon': 'beauty-salon',
  'nail salon': 'beauty-salon',

  // Pilates & Fitness
  'סטודיו לפילאטיס': 'pilates',
  'סטודיו ליוגה': 'pilates',
  'חדר כושר': 'pilates',
  'pilates studio': 'pilates',
  'yoga studio': 'pilates',
  'gym': 'pilates',

  // Health & Clinics
  'מרפאת פיזיותרפיה': 'clinic',
  'פיזיותרפיסט': 'clinic',
  'מרפאה': 'clinic',
  'מרפאת פוריות': 'clinic',
  'מרפאה לטיפול בכאבים': 'clinic',
  'מרפאה אורתופדית': 'clinic',
  'רופא שיניים': 'clinic',
  'פסיכולוג': 'therapist',
  'נוירופסיכולוגיה': 'therapist',
  'פסיכותרפיסט': 'therapist',
  'physiotherapist': 'clinic',
  'clinic': 'clinic',
  'dentist': 'clinic',
  'doctor': 'clinic',

  // Real Estate
  'סוכנות נדל"ן': 'real-estate',
  'תיווך נדל"ן': 'real-estate',
  'מפתח נדל"ן': 'real-estate',
  'יועץ נדל"ן': 'real-estate',
  'סוכן משכנתאות': 'real-estate',
  'שמאי נכסים': 'real-estate',
  'real estate agent': 'real-estate',
  'real estate agency': 'real-estate',

  // Contractors
  'קבלן': 'contractor',
  'קבלן שיש': 'contractor',
  'קבלן תקשורת': 'contractor',
  'קבלן תשתיות': 'contractor',
  'קבלן ריצוף': 'contractor',
  'קבלן כללי': 'contractor',
  'קבלן מיזוג אוויר': 'contractor',
  'חשמלאי': 'contractor',
  'שיפוצניק': 'contractor',
  'שרברב': 'contractor',
  'חברת בנייה': 'contractor',
  'שירות להתקנת מוצרי חשמל': 'contractor',
  'שירות מעליות': 'contractor',
  'שירות תיקונים למזגנים': 'contractor',
  'contractor': 'contractor',
  'electrician': 'contractor',
  'plumber': 'contractor',

  // Interior Design / Freelancer
  'עיצוב פנים': 'freelancer',
  'interior designer': 'freelancer',
  'architect': 'freelancer',
  'אדריכל': 'freelancer',

  // Sports Coach
  'מאמן כושר': 'sports-coach',
  'personal trainer': 'sports-coach',

  // Lawyer
  'עורך דין': 'lawyer',
  'lawyer': 'lawyer',
  'law firm': 'lawyer',
};

function normalizeCategorySlug(rawCategory) {
  if (!rawCategory) return null;
  // Take first category if comma-separated
  const primary = rawCategory.split(',')[0].trim().toLowerCase();
  // Exact match
  if (CATEGORY_MAP[primary]) return CATEGORY_MAP[primary];
  // Partial match
  for (const [key, slug] of Object.entries(CATEGORY_MAP)) {
    if (primary.includes(key) || key.includes(primary)) return slug;
  }
  return null;
}

function normalizePhone(phone) {
  if (!phone || phone === '—' || phone.trim() === '') return null;
  let p = phone.replace(/[\s\-().]/g, '').trim();
  if (!p) return null;
  // Remove leading + for storage, keep digits
  p = p.replace(/^\+/, '');
  // If starts with 972, keep as-is
  // If starts with 0, convert to 972
  if (p.startsWith('0')) p = '972' + p.slice(1);
  // Must be at least 10 digits to be valid
  if (p.length < 10) return null;
  return p;
}

function normalizeEmail(email) {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  // Skip placeholder/generic emails
  if (!e || e.includes('example.com') || e.includes('b144.co.il') || e === '') return null;
  // Basic email validation
  if (!e.includes('@') || !e.includes('.')) return null;
  return e;
}

// ── IMPORT FUNCTION ─────────────────────────────────────────
async function importCSV(fileName, listSource, priority) {
  const filePath = resolve(__dirname, 'data', fileName);
  console.log(`\n📂 Loading ${fileName} (priority ${priority})...`);

  const raw = readFileSync(filePath, 'utf-8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  console.log(`   Found ${records.length} records`);

  const leads = records.map(row => {
    const phone = normalizePhone(row.PHONE || '');
    const email = normalizeEmail(row.EMAIL || '');
    const hasContact = phone || email;

    return {
      list_source: listSource,
      priority,
      name: (row.NAME || '').trim().substring(0, 200),
      category: (row.CATEGORY || '').trim().substring(0, 300),
      address: (row.ADDRESS || row['STREET ADDRESS'] || '').trim().substring(0, 300),
      city: (row.CITY || '').trim(),
      phone,
      email,
      website: (row.WEBSITE || '').trim() || null,
      facebook: (row.FACEBOOK || '').trim() || null,
      instagram: (row.INSTAGRAM || '').trim() || null,
      main_image_url: (row['MAIN IMAGE URL'] || '').trim() || null,
      category_slug: normalizeCategorySlug(row.CATEGORY || ''),
      outreach_status: hasContact ? 'pending' : 'no_contact',
    };
  }).filter(l => l.name); // Skip empty names

  console.log(`   Prepared ${leads.length} leads`);
  const withPhone = leads.filter(l => l.phone).length;
  const withEmail = leads.filter(l => l.email).length;
  const noContact = leads.filter(l => l.outreach_status === 'no_contact').length;
  console.log(`   📱 ${withPhone} phones | 📧 ${withEmail} emails | ⛔ ${noContact} no contact`);

  // Bulk insert in batches of 500
  let inserted = 0;
  for (let i = 0; i < leads.length; i += 500) {
    const batch = leads.slice(i, i + 500);
    const { error } = await supabase.from('leads').insert(batch);
    if (error) {
      console.error(`   ❌ Batch ${i}-${i + batch.length} error:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`   ✅ Inserted ${inserted}/${leads.length}`);
    }
  }

  return { total: leads.length, inserted, withPhone, withEmail, noContact };
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Mizra Lead Import');
  console.log('====================\n');

  // Import in priority order (list_3 first = priority 3)
  const r3 = await importCSV('list_3.csv', 'list_3', 3);
  const r2 = await importCSV('list_2.csv', 'list_2', 2);
  const r1 = await importCSV('list_1.csv', 'list_1', 1);

  console.log('\n📊 SUMMARY');
  console.log('==========');
  console.log(`List 3: ${r3.inserted}/${r3.total} inserted (📱${r3.withPhone} 📧${r3.withEmail})`);
  console.log(`List 2: ${r2.inserted}/${r2.total} inserted (📱${r2.withPhone} 📧${r2.withEmail})`);
  console.log(`List 1: ${r1.inserted}/${r1.total} inserted (📱${r1.withPhone} 📧${r1.withEmail})`);
  console.log(`Total:  ${r3.inserted + r2.inserted + r1.inserted} leads imported`);

  // Verify
  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`\n✅ Supabase leads table count: ${count}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
