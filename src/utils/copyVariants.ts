/**
 * Deterministic content rotation helper.
 * Uses djb2 hashing so the same vertical+city combo always picks the same variant,
 * but different combos get different text — avoiding duplicate content across pages.
 */

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function pickVariant<T>(key: string, variants: T[]): T {
  const index = djb2(key) % variants.length;
  return variants[index];
}

export function pickVariantIndex(key: string, count: number): number {
  return djb2(key) % count;
}

// --- Hero intro variants (EN) ---
export const heroIntrosEN = [
  "Get a professional website built for your {vertical} — designed to attract customers and grow your business online.",
  "Launch a stunning {vertical} website that turns visitors into customers. Built fast, optimized for Google.",
  "Your {vertical} deserves a website that works as hard as you do. Get online with a site built for results.",
  "Stand out from the competition with a {vertical} website designed to convert. Professional, fast, mobile-ready.",
  "A professional website is the most powerful marketing tool for any {vertical}. Get yours built in days, not months."
];

export const heroIntrosHE = [
  "קבלו אתר מקצועי שנבנה עבור ה{vertical} שלכם — מעוצב למשוך לקוחות ולהצמיח את העסק אונליין.",
  "השיקו אתר מרהיב ל{vertical} שהופך מבקרים ללקוחות. נבנה מהר, מותאם לגוגל.",
  "ה{vertical} שלכם ראויה לאתר שעובד קשה כמוכם. צאו לאוויר עם אתר שנבנה לתוצאות.",
  "בלטו מול המתחרים עם אתר ל{vertical} שמעוצב להמרה. מקצועי, מהיר, מותאם למובייל.",
  "אתר מקצועי הוא כלי השיווק החזק ביותר לכל {vertical}. קבלו את שלכם תוך ימים, לא חודשים."
];

// --- "How it works" step descriptions (EN) ---
export const howItWorksIntrosEN = [
  "Getting your {vertical} online is simple. Here's how Mizra works:",
  "Three easy steps to launch your {vertical} website:",
  "From first call to live website — here's the process:",
  "We make it effortless to get your {vertical} online:"
];

export const howItWorksIntrosHE = [
  "להוציא את ה{vertical} שלכם לאוויר זה פשוט. ככה Mizra עובדת:",
  "שלושה צעדים פשוטים להשקת אתר ה{vertical} שלכם:",
  "משיחה ראשונה ועד אתר חי — הנה התהליך:",
  "אנחנו הופכים את זה לפשוט להוציא את ה{vertical} שלכם לאוויר:"
];

// --- CTA variants (EN) ---
export const ctaHeadingsEN = [
  "Ready to launch your {vertical} website?",
  "Get your {vertical} online today",
  "Let's build your {vertical} website",
  "Start growing your {vertical} online"
];

export const ctaHeadingsHE = [
  "מוכנים להשיק את אתר ה{vertical} שלכם?",
  "קבלו את ה{vertical} שלכם אונליין היום",
  "בואו נבנה את אתר ה{vertical} שלכם",
  "התחילו להצמיח את ה{vertical} שלכם אונליין"
];

// --- Local angle variants (EN) ---
export const localAnglesEN = [
  "Businesses in {city} face unique challenges. With Mizra, your {vertical} gets a website optimized for local search so customers in {city} find you first.",
  "Whether your {vertical} is on a busy street or a quiet neighborhood in {city}, a professional website puts you on the map — literally.",
  "In {city}, customers search online before visiting. Your {vertical} website makes sure they find you, not your competitor.",
  "{city} is a competitive market. A Mizra website gives your {vertical} the edge with fast loading, mobile design and Google optimization."
];

export const localAnglesHE = [
  "עסקים ב{city} מתמודדים עם אתגרים ייחודיים. עם Mizra, ה{vertical} שלכם מקבלת אתר מותאם לחיפוש מקומי כדי שלקוחות ב{city} ימצאו אתכם ראשונים.",
  "בין אם ה{vertical} שלכם ברחוב סואן או בשכונה שקטה ב{city}, אתר מקצועי שם אתכם על המפה — פשוטו כמשמעו.",
  "ב{city}, לקוחות מחפשים אונליין לפני ביקור. אתר ה{vertical} שלכם מוודא שהם ימצאו אתכם, לא את המתחרים.",
  "{city} הוא שוק תחרותי. אתר Mizra נותן ל{vertical} שלכם יתרון עם טעינה מהירה, עיצוב מובייל ואופטימיזציה לגוגל."
];

// --- Pricing teaser variants (EN) ---
export const pricingTeasersEN = [
  "Professional {vertical} websites starting at NIS 1,990. One-time payment, no monthly fees.",
  "Get a complete {vertical} website from NIS 1,990. Includes design, development, SEO and mobile optimization.",
  "Affordable pricing for your {vertical} website. Plans start at NIS 1,990 with everything included."
];

export const pricingTeasersHE = [
  "אתרים מקצועיים ל{vertical} החל מ-₪1,990. תשלום חד פעמי, ללא דמי מנוי.",
  "קבלו אתר {vertical} שלם מ-₪1,990. כולל עיצוב, פיתוח, SEO ואופטימיזציה למובייל.",
  "מחירים נגישים לאתר ה{vertical} שלכם. תוכניות מ-₪1,990 עם הכל כלול."
];

/**
 * Replace {vertical} and {city} placeholders in a template string.
 */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

/**
 * Get a deterministic variant for a section, filled with variables.
 */
export function getVariant(
  section: string,
  variants: string[],
  verticalSlug: string,
  citySlug: string | undefined,
  vars: Record<string, string>
): string {
  const key = `${section}-${verticalSlug}-${citySlug || 'none'}`;
  const template = pickVariant(key, variants);
  return fillTemplate(template, vars);
}
