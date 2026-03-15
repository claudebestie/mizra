// ─── Mizra Preview — Dynamic personalized landing pages ─────────────────
// URL: /preview/{slug}--{sector}
// Generates a beautiful one-page mockup website personalized with the business name

const SECTORS = {
  restaurant: {
    he: 'מסעדה',
    tagline: 'חוויה קולינרית ייחודית',
    color: '#1a0a00',
    accent: '#e85d04',
    accentLight: '#ff8c38',
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 100%)',
    features: [
      { icon: '🍽', he: 'תפריט אונליין', desc: 'תפריט דיגיטלי מעוצב עם תמונות, מחירים וקטגוריות' },
      { icon: '📍', he: 'מיקום ושעות', desc: 'מפה אינטראקטיבית, שעות פתיחה ודרכי הגעה' },
      { icon: '📞', he: 'הזמנת שולחן', desc: 'כפתור הזמנה ישירה + קישור WhatsApp' },
      { icon: '⭐', he: 'גלריה', desc: 'תמונות מנות, אווירה ואירועים מיוחדים' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=75',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=75',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=75',
    ],
  },
  beauty: {
    he: 'סלון יופי',
    tagline: 'יופי, טיפוח ואלגנטיות',
    color: '#1a1a2e',
    accent: '#c9a96e',
    accentLight: '#dcc08a',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d2348 100%)',
    features: [
      { icon: '💇', he: 'שירותים ומחירון', desc: 'רשימת טיפולים מלאה עם מחירים ומבצעים' },
      { icon: '📅', he: 'הזמנת תור', desc: 'מערכת הזמנות אונליין 24/7' },
      { icon: '✨', he: 'גלריית עבודות', desc: 'לפני/אחרי, עיצובים וטיפולים אחרונים' },
      { icon: '📍', he: 'מיקום ויצירת קשר', desc: 'מפה, שעות פעילות ו-WhatsApp ישיר' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=75',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=75',
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&q=75',
    ],
  },
  barbershop: {
    he: 'ברברשופ',
    tagline: 'סטייל, דיוק ואומנות',
    color: '#0f1923',
    accent: '#d4a853',
    accentLight: '#e0be78',
    gradient: 'linear-gradient(135deg, #0f1923 0%, #1e2d3d 100%)',
    features: [
      { icon: '✂️', he: 'שירותים', desc: 'תספורות, זקן, טיפוח וחבילות VIP' },
      { icon: '📅', he: 'הזמנת תור', desc: 'בחירת ספר וזמן פנוי בקליק' },
      { icon: '📸', he: 'גלריה', desc: 'עבודות אחרונות וסגנונות פופולריים' },
      { icon: '📍', he: 'איפה אנחנו', desc: 'מפה, שעות ויצירת קשר מהירה' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=75',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=75',
      'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=75',
    ],
  },
  clinic: {
    he: 'קליניקה',
    tagline: 'בריאות מקצועית ואכפתית',
    color: '#0d2137',
    accent: '#2a9d8f',
    accentLight: '#52c7b8',
    gradient: 'linear-gradient(135deg, #0d2137 0%, #153050 100%)',
    features: [
      { icon: '🩺', he: 'שירותים רפואיים', desc: 'תחומי טיפול, התמחויות וגישות' },
      { icon: '👨‍⚕️', he: 'הצוות שלנו', desc: 'מומחים מוסמכים עם ניסיון רב' },
      { icon: '📅', he: 'קביעת תור', desc: 'הזמנה אונליין או WhatsApp ישיר' },
      { icon: '📍', he: 'מיקום והגעה', desc: 'כתובת, חניה ונגישות' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&q=75',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=75',
      'https://images.unsplash.com/photo-1666214280250-41f17e3a0de3?w=600&q=75',
    ],
  },
  therapist: {
    he: 'מטפל/ת',
    tagline: 'דרך חדשה לרווחה נפשית',
    color: '#1e1e2e',
    accent: '#9b72cf',
    accentLight: '#b794e0',
    gradient: 'linear-gradient(135deg, #1e1e2e 0%, #2e2544 100%)',
    features: [
      { icon: '🧘', he: 'גישת טיפול', desc: 'שיטות טיפול, תחומי התמחות וגישה אישית' },
      { icon: '📋', he: 'הכשרה וניסיון', desc: 'תארים, הסמכות ושנות ניסיון' },
      { icon: '📅', he: 'קביעת פגישה', desc: 'פגישת היכרות ראשונה בחינם' },
      { icon: '🏠', he: 'פרונטלי/אונליין', desc: 'מפגשים פנים אל פנים או בזום' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=75',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=75',
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600&q=75',
    ],
  },
  lawyer: {
    he: 'עורך דין',
    tagline: 'ייעוץ משפטי מקצועי ואמין',
    color: '#141414',
    accent: '#b8960c',
    accentLight: '#d4af37',
    gradient: 'linear-gradient(135deg, #141414 0%, #2a2a1e 100%)',
    features: [
      { icon: '⚖️', he: 'תחומי עיסוק', desc: 'מקרקעין, חוזים, משפחה, פלילי ועוד' },
      { icon: '🎓', he: 'ניסיון והכשרה', desc: 'שנות ניסיון, פסקי דין ומומחיות' },
      { icon: '📞', he: 'ייעוץ ראשוני', desc: 'שיחת ייעוץ ראשונה ללא התחייבות' },
      { icon: '📍', he: 'המשרד', desc: 'כתובת, שעות קבלה ויצירת קשר' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1521791055366-0d553872125f?w=600&q=75',
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=75',
      'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=600&q=75',
    ],
  },
  coach: {
    he: 'מאמן/ת',
    tagline: 'הדרך שלך להצלחה מתחילה כאן',
    color: '#0a0a0a',
    accent: '#ff6b35',
    accentLight: '#ff8c5a',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    features: [
      { icon: '🎯', he: 'תוכניות אימון', desc: 'תוכניות מותאמות אישית למטרות שלך' },
      { icon: '💪', he: 'גישה ומתודולוגיה', desc: 'שיטות מוכחות ותוצאות מדידות' },
      { icon: '⭐', he: 'המלצות', desc: 'סיפורי הצלחה של מתאמנים' },
      { icon: '📅', he: 'פגישת היכרות', desc: 'שיחה ראשונה בחינם לבניית תוכנית' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=75',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=75',
      'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=75',
    ],
  },
  contractor: {
    he: 'קבלן',
    tagline: 'שיפוצים ובנייה ברמה הגבוהה ביותר',
    color: '#1c1c1c',
    accent: '#e07b39',
    accentLight: '#f09a5e',
    gradient: 'linear-gradient(135deg, #1c1c1c 0%, #2c2218 100%)',
    features: [
      { icon: '🏗', he: 'שירותים', desc: 'שיפוץ דירה, בנייה, חשמל, אינסטלציה ועוד' },
      { icon: '📸', he: 'פרויקטים', desc: 'גלריית עבודות לפני/אחרי' },
      { icon: '📋', he: 'הצעת מחיר', desc: 'קבלו הצעה מפורטת ללא התחייבות' },
      { icon: '📞', he: 'יצירת קשר', desc: 'WhatsApp ישיר או טלפון' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=75',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=75',
      'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=75',
    ],
  },
  general: {
    he: 'עסק מקומי',
    tagline: 'המקום שלך ברשת',
    color: '#181818',
    accent: '#4f8ef7',
    accentLight: '#7aabff',
    gradient: 'linear-gradient(135deg, #181818 0%, #1e2a3a 100%)',
    features: [
      { icon: '🌐', he: 'אודות העסק', desc: 'ספרו את הסיפור שלכם ללקוחות חדשים' },
      { icon: '🛠', he: 'שירותים', desc: 'הציגו את כל השירותים והמוצרים' },
      { icon: '📞', he: 'יצירת קשר', desc: 'טלפון, WhatsApp, מייל ומפה' },
      { icon: '⭐', he: 'המלצות', desc: 'ביקורות ודירוגים של לקוחות' },
    ],
    heroImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600&q=75',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=75',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=75',
    ],
  },
};

function deslugify(slug) {
  // First try URL-decoding (for Hebrew names)
  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) return decoded;
  } catch (e) { /* ignore */ }
  // Fallback: convert dashes to spaces and capitalize
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function parsePreviewPath(path) {
  // Remove /preview/ prefix and trailing slash
  const raw = path.replace(/^\/preview\/?/, '').replace(/\/$/, '');
  if (!raw) return null;

  // Split on -- to separate slug from sector (last -- is the separator)
  const lastIdx = raw.lastIndexOf('--');
  let slug, sector;
  if (lastIdx > 0) {
    slug = raw.substring(0, lastIdx);
    sector = raw.substring(lastIdx + 2);
  } else {
    slug = raw;
    sector = 'general';
  }

  return {
    slug,
    businessName: deslugify(slug),
    sector: SECTORS[sector] ? sector : 'general',
  };
}

function buildHTML(businessName, sectorKey) {
  const s = SECTORS[sectorKey] || SECTORS.general;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${businessName} | ${s.he}</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
:root{
  --c:${s.color};--a:${s.accent};--al:${s.accentLight};
  --bg:#fafafa;--text:#1a1a1a;--muted:#666;
}
body{font-family:'Heebo',sans-serif;background:var(--bg);color:var(--text);line-height:1.7;overflow-x:hidden;direction:rtl}
img{display:block;max-width:100%}
a{text-decoration:none;color:inherit}

/* ── NAV ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(0,0,0,.92);backdrop-filter:blur(12px);padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-size:20px;font-weight:800;color:#fff}
.nav-logo span{color:var(--a)}
.nav-links{display:flex;gap:24px}
.nav-links a{color:rgba(255,255,255,.7);font-size:13px;font-weight:500;transition:color .2s}
.nav-links a:hover{color:#fff}
.nav-cta{background:var(--a);color:var(--c);padding:8px 20px;border-radius:6px;font-weight:700;font-size:13px;transition:transform .2s}
.nav-cta:hover{transform:scale(1.05)}

/* ── HERO ── */
.hero{position:relative;min-height:92vh;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-top:0}
.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:brightness(.35)}
.hero-overlay{position:absolute;inset:0;background:${s.gradient};opacity:.7}
.hero-content{position:relative;z-index:2;text-align:center;padding:120px 24px 80px;max-width:800px}
.hero-badge{display:inline-block;background:var(--a);color:var(--c);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:6px 16px;border-radius:30px;margin-bottom:20px}
.hero h1{font-size:clamp(2.2rem,6vw,3.8rem);font-weight:900;color:#fff;line-height:1.15;margin-bottom:16px}
.hero h1 span{color:var(--a)}
.hero-sub{font-size:clamp(1rem,2.5vw,1.25rem);color:rgba(255,255,255,.75);font-weight:300;margin-bottom:36px;max-width:560px;margin-left:auto;margin-right:auto}
.hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.btn-primary{background:var(--a);color:var(--c);padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;transition:all .3s;border:none;cursor:pointer}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.btn-secondary{background:transparent;color:#fff;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;border:1.5px solid rgba(255,255,255,.3);transition:all .3s}
.btn-secondary:hover{border-color:#fff;background:rgba(255,255,255,.08)}

/* ── SECTIONS ── */
.section{padding:80px 24px}
.section-dark{background:var(--c);color:#fff}
.cx{max-width:1100px;margin:0 auto}
.sec-label{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--a);margin-bottom:8px}
.sec-title{font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:800;margin-bottom:12px;line-height:1.25}
.sec-desc{font-size:16px;color:var(--muted);max-width:600px;line-height:1.8}

/* ── FEATURES ── */
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;margin-top:40px}
.feat{background:#fff;border:1px solid #eee;border-radius:16px;padding:32px 28px;transition:all .3s}
.feat:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.08);border-color:var(--a)}
.feat-icon{font-size:32px;margin-bottom:16px}
.feat h3{font-size:18px;font-weight:700;margin-bottom:8px}
.feat p{font-size:14px;color:var(--muted);line-height:1.7}

/* ── GALLERY ── */
.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px}
.gallery-item{border-radius:12px;overflow:hidden;aspect-ratio:4/3;position:relative}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.gallery-item:hover img{transform:scale(1.08)}

/* ── CONTACT ── */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;align-items:start}
.contact-info{display:flex;flex-direction:column;gap:20px}
.contact-item{display:flex;align-items:center;gap:16px;padding:16px 20px;background:rgba(255,255,255,.06);border-radius:12px;border:1px solid rgba(255,255,255,.08)}
.contact-item .ci-icon{font-size:24px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--a);border-radius:10px}
.contact-item h4{font-size:14px;font-weight:600;margin-bottom:2px}
.contact-item p{font-size:13px;color:rgba(255,255,255,.6)}
.contact-map{border-radius:12px;overflow:hidden;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);height:280px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:14px}

/* ── MIZRA BANNER ── */
.mizra-banner{background:#fff;border-top:3px solid var(--a);padding:48px 24px;text-align:center}
.mizra-banner h3{font-size:22px;font-weight:800;color:var(--c);margin-bottom:8px}
.mizra-banner p{font-size:15px;color:var(--muted);margin-bottom:24px;max-width:500px;margin-left:auto;margin-right:auto}
.mizra-badge{display:inline-flex;align-items:center;gap:8px;background:var(--c);color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;transition:all .3s}
.mizra-badge:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(0,0,0,.2)}

/* ── FOOTER ── */
.footer{background:var(--c);color:rgba(255,255,255,.5);text-align:center;padding:32px 24px;font-size:12px}

/* ── RESPONSIVE ── */
@media(max-width:768px){
  .nav-links{display:none}
  .contact-grid{grid-template-columns:1fr}
  .gallery-grid{grid-template-columns:1fr 1fr}
  .hero-content{padding:100px 20px 60px}
}

/* ── ANIMATION ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.hero-content>*{animation:fadeUp .8s ease-out both}
.hero-badge{animation-delay:.1s}
.hero h1{animation-delay:.2s}
.hero-sub{animation-delay:.3s}
.hero-btns{animation-delay:.4s}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav">
  <div class="nav-logo">${businessName.substring(0, 20)}<span>.</span></div>
  <div class="nav-links">
    <a href="#services">שירותים</a>
    <a href="#gallery">גלריה</a>
    <a href="#contact">צור קשר</a>
  </div>
  <a href="https://wa.me/972542271670?text=${encodeURIComponent('היי, ראיתי את המוקאפ של ' + businessName)}" class="nav-cta">WhatsApp</a>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-bg" style="background-image:url('${s.heroImage}')"></div>
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-badge">${s.he}</div>
    <h1><span>${businessName}</span></h1>
    <p class="hero-sub">${s.tagline}</p>
    <div class="hero-btns">
      <a href="https://wa.me/972542271670?text=${encodeURIComponent('היי, ראיתי את המוקאפ של ' + businessName)}" class="btn-primary">דברו איתנו</a>
      <a href="#services" class="btn-secondary">גלו עוד</a>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="section" id="services">
  <div class="cx">
    <div class="sec-label">מה תקבלו באתר</div>
    <div class="sec-title">הכל כלול באתר המקצועי של ${businessName}</div>
    <div class="sec-desc">אתר מעוצב, מותאם למובייל, מחובר לגוגל ומוכן למשוך לקוחות חדשים — תוך 48 שעות.</div>
    <div class="features-grid">
      ${s.features.map(f => `
      <div class="feat">
        <div class="feat-icon">${f.icon}</div>
        <h3>${f.he}</h3>
        <p>${f.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- GALLERY -->
<section class="section" style="background:#f0f0f0" id="gallery">
  <div class="cx">
    <div class="sec-label">גלריה</div>
    <div class="sec-title">הצצה לאווירה</div>
    <div class="gallery-grid">
      ${s.galleryImages.map(img => `
      <div class="gallery-item">
        <img src="${img}" alt="${businessName}" loading="lazy">
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CONTACT -->
<section class="section section-dark" id="contact">
  <div class="cx">
    <div class="sec-label" style="color:var(--al)">צרו קשר</div>
    <div class="sec-title" style="color:#fff">בואו נדבר</div>
    <div class="contact-grid">
      <div class="contact-info">
        <div class="contact-item">
          <div class="ci-icon">📞</div>
          <div><h4>טלפון</h4><p>054-XXX-XXXX</p></div>
        </div>
        <div class="contact-item">
          <div class="ci-icon">💬</div>
          <div><h4>WhatsApp</h4><p>שלחו הודעה ונחזור אליכם</p></div>
        </div>
        <div class="contact-item">
          <div class="ci-icon">📍</div>
          <div><h4>כתובת</h4><p>ישראל</p></div>
        </div>
        <div class="contact-item">
          <div class="ci-icon">🕐</div>
          <div><h4>שעות פעילות</h4><p>א׳-ה׳ 9:00–18:00</p></div>
        </div>
      </div>
      <div class="contact-map">
        מפה אינטראקטיבית
      </div>
    </div>
  </div>
</section>

<!-- MIZRA BANNER -->
<div class="mizra-banner">
  <div class="sec-label">מאת Mizra</div>
  <h3>רוצים אתר כזה? אנחנו בונים אותו בשבילכם</h3>
  <p>אתר מקצועי, מהיר ומותאם למובייל — מוכן תוך 48 שעות. החל מ-₪1,990 בלבד.</p>
  <a href="https://getmizra.com/free-audit/?utm_source=preview&utm_medium=mockup&utm_campaign=${sectorKey}" class="mizra-badge">
    קבלו בדיקה חינמית לעסק &larr;
  </a>
</div>

<!-- FOOTER -->
<footer class="footer">
  <p>${businessName} &bull; אתר לדוגמה נוצר על ידי <a href="https://getmizra.com" style="color:var(--a)">Mizra</a></p>
</footer>

</body>
</html>`;
}

export async function handler(event) {
  const parsed = parsePreviewPath(event.path);

  if (!parsed || !parsed.slug) {
    return {
      statusCode: 302,
      headers: { Location: 'https://getmizra.com/' },
    };
  }

  const html = buildHTML(parsed.businessName, parsed.sector);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
    body: html,
  };
}
