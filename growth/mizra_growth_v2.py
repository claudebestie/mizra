#!/usr/bin/env python3
"""
Mizra Growth v2
- Import des 3 CSV Lobstr → Supabase
- Envoi WATI template: website_mockup_outreach_mizra (1 variable: {{name}})
- Envoi Email Brevo avec preview URL
- Warm-up WhatsApp automatique
"""

import os, re, csv, json, time, unicodedata
from typing import Optional
from datetime import date, datetime
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
WATI_TOKEN = os.getenv("WATI_TOKEN")
WATI_BASE_URL = os.getenv("WATI_BASE_URL")  # https://live-server-10107237.wati.io
PREVIEW_BASE = "https://getmizra.com/preview"
AUDIT_URL = "https://getmizra.com/free-audit"
COUNTER_FILE = Path("./daily_counter.json")

# Template WATI confirmé depuis la capture d'écran
# Template name: website_mockup_outreach_mizra
# Variables: {{name}} seulement
WATI_TEMPLATE_NAME = "website_mockup_outreach_mizra"

WARMUP = {1: 10, 2: 20, 3: 40, 4: 80, 5: 120, 6: 200}
MAX_EMAIL = int(os.getenv("MAX_EMAIL_PER_DAY", 200))
DELAY = float(os.getenv("DELAY_SECONDS", 3))

SECTOR_MAP = {
    "utility contractor": "contractor", "contractor": "contractor",
    "tile contractor": "contractor", "renovation": "contractor",
    "pilates studio": "therapist", "pilates": "therapist", "yoga": "therapist",
    "physical therapy clinic": "clinic", "clinic": "clinic", "dentist": "clinic",
    "fertility clinic": "clinic", "neuropsychologist": "therapist",
    "permanent make-up clinic": "beauty", "hair salons": "beauty",
    "beauty clinics": "beauty", "spa": "beauty",
    "barbershop": "barbershop", "barber shop": "barbershop",
    "psychologist": "therapist", "therapist": "therapist",
    "real estate agents": "general", "interior designers": "general",
    "photographers": "general", "restaurant": "restaurant",
    "lawyer": "lawyer", "attorney": "lawyer", "coach": "coach",
}

SECTOR_NAMES_HE = {
    "contractor": "קבלן שיפוצים", "clinic": "קליניקה",
    "therapist": "מטפל", "restaurant": "מסעדה",
    "general": "עסק מקומי", "beauty": "סלון יופי",
    "barbershop": "ברברשופ", "lawyer": 'עו"ד', "coach": "קואצ׳",
}

SECTOR_COLORS = {
    "beauty": ("#1a1a2e", "#c9a96e"), "barbershop": ("#0f1923", "#d4a853"),
    "clinic": ("#0d2137", "#2a9d8f"), "therapist": ("#1e1e2e", "#9b72cf"),
    "lawyer": ("#141414", "#b8960c"), "coach": ("#0a0a0a", "#ff6b35"),
    "contractor": ("#1c1c1c", "#e07b39"), "restaurant": ("#1a0a00", "#e85d04"),
    "general": ("#181818", "#4f8ef7"),
}

# ─── UTILS ───────────────────────────────────────────────────────────────────
def slugify(text: str) -> str:
    t = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    t = re.sub(r'[^\w\s-]', '', t.lower().strip())
    t = re.sub(r'[\s_]+', '-', t)
    return re.sub(r'-+', '-', t).strip('-')[:40]

def detect_sector(cat: str) -> str:
    c = (cat or '').lower()
    for k, v in SECTOR_MAP.items():
        if k in c: return v
    return "general"

def normalize_phone(phone: str) -> Optional[str]:
    if not phone: return None
    d = re.sub(r'[^\d]', '', phone)
    if d.startswith('972') and len(d) >= 11: return d
    if d.startswith('0') and len(d) == 10: return '972' + d[1:]
    if len(d) == 9: return '972' + d
    return None

def sb_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def sb_get(table, params=""):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?{params}", headers=sb_headers(), timeout=10)
    return r.json()

def sb_post(table, data):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", json=data, headers=sb_headers(), timeout=10)
    return r.status_code

def sb_patch(table, row_id, data):
    h = {**sb_headers(), "Prefer": "return=minimal"}
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}", json=data, headers=h, timeout=10)
    return r.status_code

# Mapping category_slug (from Node.js import) → sector
SLUG_TO_SECTOR = {
    "restaurant": "restaurant", "beauty-salon": "beauty",
    "barbershop": "barbershop", "clinic": "clinic",
    "therapist": "therapist", "pilates": "therapist",
    "real-estate": "general", "contractor": "contractor",
    "freelancer": "general", "lawyer": "lawyer",
    "sports-coach": "coach",
}

def get_lead_sector(lead):
    """Get sector from lead, using category_slug as fallback."""
    sector = lead.get("sector")
    if sector and sector != "general":
        return sector
    cat_slug = lead.get("category_slug")
    if cat_slug and cat_slug in SLUG_TO_SECTOR:
        return SLUG_TO_SECTOR[cat_slug]
    return sector or "general"

def build_preview_url(lead):
    """Build preview URL from lead name and sector."""
    from urllib.parse import quote
    name = lead.get("name", "business")
    sector = get_lead_sector(lead)
    # Try ASCII slug first; for Hebrew names, URL-encode the original
    slug = slugify(name)
    if not slug:
        slug = quote(name.strip()[:60], safe='')
    return f"{PREVIEW_BASE}/{slug}--{sector}"

# ─── COUNTER ─────────────────────────────────────────────────────────────────
def load_counter():
    today = str(date.today())
    if COUNTER_FILE.exists():
        d = json.loads(COUNTER_FILE.read_text())
        if d.get("date") == today: return d
    return {"date": today, "wa": 0, "email": 0}

def save_counter(c): COUNTER_FILE.write_text(json.dumps(c))

def get_warmup_limit():
    start = date(2026, 3, 15)  # Date de démarrage warm-up
    days = (date.today() - start).days
    week = min((days // 7) + 1, 6)
    limit = WARMUP[week]
    print(f"🔥 Warm-up semaine {week} → max {limit} WhatsApp/jour")
    return limit

# ─── IMPORT CSV ───────────────────────────────────────────────────────────────
def import_all_csvs():
    files = [
        ("/mnt/user-data/uploads/lobstr_liste_3.csv", "liste_3"),
        ("/mnt/user-data/uploads/lobstr_liste_1.csv", "liste_1"),
        ("/mnt/user-data/uploads/lobstr_liste_2.csv", "liste_2"),
    ]

    # Charger phones/emails existants pour dédup
    existing = sb_get("leads", "select=phone,email")
    seen_phones = {r['phone'] for r in existing if r.get('phone')}
    seen_emails = {r['email'] for r in existing if r.get('email')}
    print(f"Déjà en base: {len(existing)} leads")

    imported = 0
    skipped = 0

    for fpath, source in files:
        if not Path(fpath).exists():
            print(f"⚠️ Fichier non trouvé: {fpath}")
            continue

        print(f"\n📥 Import {source}...")
        batch = []

        with open(fpath, encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                name = row.get('NAME','').strip()
                if not name: continue

                phone = normalize_phone(row.get('PHONE',''))
                email = (row.get('EMAIL','') or '').strip().lower() or None
                cat = row.get('INPUT CATEGORY','').strip() or row.get('CATEGORY','').strip()

                # Dédup
                if phone and phone in seen_phones: skipped += 1; continue
                if email and email in seen_emails: skipped += 1; continue
                if phone: seen_phones.add(phone)
                if email: seen_emails.add(email)

                sector = detect_sector(cat)
                slug = slugify(name)
                preview_url = f"{PREVIEW_BASE}/{slug}--{sector}" if slug else f"{PREVIEW_BASE}/business--{sector}"

                batch.append({
                    "name": name,
                    "phone": phone,
                    "email": email,
                    "category": cat,
                    "sector": sector,
                    "city": row.get('CITY','').strip() or None,
                    "website": row.get('WEBSITE','').strip() or None,
                    "preview_url": preview_url,
                    "source": source,
                    "status": "pending",
                    "created_at": datetime.utcnow().isoformat(),
                })

                # Insert par batches de 100
                if len(batch) >= 100:
                    code = sb_post("leads", batch)
                    imported += len(batch)
                    batch = []
                    print(f"  ✓ {imported} importés...")

        if batch:
            sb_post("leads", batch)
            imported += len(batch)

        print(f"  ✅ {source}: terminé")

    print(f"\n{'='*40}")
    print(f"✅ Import terminé: {imported} importés, {skipped} doublons ignorés")

# ─── EMAIL ────────────────────────────────────────────────────────────────────
# ── Sector-specific hooks for email body ──
SECTOR_HOOKS = {
    "restaurant": {
        "pain": "לקוחות מחפשים את התפריט שלכם בגוגל — ולא מוצאים",
        "benefit": "תפריט אונליין, הזמנת מקום, וקישור ישיר ל-WhatsApp",
        "cta_line": "תנו ללקוחות שלכם להזמין מקום ישירות מהאתר",
    },
    "beauty": {
        "pain": "לקוחות חדשים מחפשים סלון יופי באזור — ולא מוצאים אתכם",
        "benefit": "מחירון, גלריית עבודות, והזמנת תור אונליין",
        "cta_line": "תנו ללקוחות לקבוע תור ישירות מהאתר",
    },
    "barbershop": {
        "pain": "אנשים מחפשים ברברשופ בגוגל — ולא מוצאים אתכם",
        "benefit": "גלריית תספורות, מחירון, וקביעת תור אונליין",
        "cta_line": "תנו ללקוחות לקבוע תור ישירות",
    },
    "clinic": {
        "pain": "מטופלים מחפשים קליניקה באזור — ולא מגיעים אליכם",
        "benefit": "שירותים רפואיים, צוות, וקביעת תור אונליין",
        "cta_line": "תנו למטופלים חדשים למצוא אתכם בגוגל",
    },
    "therapist": {
        "pain": "לקוחות פוטנציאליים מחפשים מטפל/ת בגוגל — ולא מוצאים אתכם",
        "benefit": "גישת טיפול, הכשרה מקצועית, וקביעת פגישה",
        "cta_line": "תנו ללקוחות חדשים להכיר את הגישה שלכם",
    },
    "lawyer": {
        "pain": "אנשים מחפשים עורך דין באזור — ולא מגיעים אליכם",
        "benefit": "תחומי עיסוק, ניסיון, וייעוץ ראשוני",
        "cta_line": "תנו ללקוחות פוטנציאליים לפנות אליכם ישירות",
    },
    "coach": {
        "pain": "אנשים מחפשים קואצ׳ר בגוגל — ולא מוצאים אתכם",
        "benefit": "תוכניות, המלצות, ופגישת היכרות",
        "cta_line": "תנו ללקוחות חדשים לגלות אתכם",
    },
    "contractor": {
        "pain": "אנשים מחפשים קבלן שיפוצים בגוגל — ולא מוצאים אתכם",
        "benefit": "פרויקטים קודמים, שירותים, והצעת מחיר",
        "cta_line": "תנו ללקוחות חדשים לראות את העבודות שלכם",
    },
    "general": {
        "pain": "לקוחות מחפשים את השירות שלכם בגוגל — ולא מוצאים",
        "benefit": "שירותים, אודות, ויצירת קשר ישירה",
        "cta_line": "תנו ללקוחות חדשים למצוא אתכם ברשת",
    },
}

def build_email_html(lead: dict) -> tuple:
    """Build personalized email HTML and subject. Returns (html, subject)."""
    sector = lead.get("sector", "general")
    color, accent = SECTOR_COLORS.get(sector, ("#181818", "#4f8ef7"))
    cat_he = SECTOR_NAMES_HE.get(sector, "עסק")
    hooks = SECTOR_HOOKS.get(sector, SECTOR_HOOKS["general"])
    name = lead["name"]
    city = (lead.get("city") or "").strip()
    website = (lead.get("website") or "").strip()
    preview_url = lead.get("preview_url", "")

    # Personalized intro based on what we know
    if website and city:
        intro = f'שלום,<br/>בדקנו את <strong>{website}</strong> — האתר הנוכחי שלכם ב{city}. יצרנו עבורכם <strong>גרסה משודרגת</strong> בחינם, כדי שתראו איך אתר מקצועי יכול להיראות.'
        subject = f'{name} — בדקנו את האתר שלכם ויצרנו גרסה משודרגת 👁'
    elif website:
        intro = f'שלום,<br/>בדקנו את <strong>{website}</strong> ויצרנו עבורכם <strong>גרסה משודרגת</strong> בחינם — ללא התחייבות.'
        subject = f'{name} — בדקנו את האתר שלכם 👁'
    elif city:
        intro = f'שלום,<br/>חיפשנו {cat_he} ב{city} בגוגל — ו<strong>{name}</strong> לא מופיע. יצרנו עבורכם <strong>אתר לדוגמה</strong> בחינם כדי שתראו איך זה יכול להיראות.'
        subject = f'חיפשנו {cat_he} ב{city} — ויצרנו לכם אתר לדוגמה 👁'
    else:
        intro = f'שלום,<br/>בדקנו את הנוכחות של <strong>{name}</strong> ברשת — ויצרנו עבורכם <strong>אתר לדוגמה</strong> בחינם וללא התחייבות.'
        subject = f'בנינו לכם אתר לדוגמה 👁 — {name}'

    # City mention in SEO line
    seo_line = f'מופיעים בגוגל כשמחפשים {cat_he} ב{city}' if city else f'מופיעים בגוגל כשמחפשים {cat_he} באזורכם'

    html = f'''<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="background:{color};padding:36px 40px 28px">
    <div style="color:{accent};font-size:10px;letter-spacing:.15em;text-transform:uppercase;margin-bottom:10px">Mizra · getmizra.com</div>
    <div style="color:#fff;font-size:22px;font-weight:800;line-height:1.25">
      {hooks["pain"]}<br/>
      <span style="opacity:.7;font-size:16px;font-weight:400">{name}{f" · {city}" if city else ""}</span>
    </div>
  </div>
  <div style="padding:32px 40px;background:#fafafa;border:1px solid #eee">
    <p style="font-size:15px;line-height:1.8;margin-bottom:20px">{intro}</p>
    <div style="border:2px solid {accent};padding:24px;margin:20px 0;background:#fff">
      <div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:{accent};margin-bottom:10px">{"גרסה משודרגת" if website else "מוקאפ אתר מקצועי"} עבור {name}</div>
      <div style="font-size:17px;font-weight:800;margin-bottom:16px;color:{color}">ראו איך {"האתר החדש שלכם" if website else "תיראו ברשת"} ←</div>
      <a href="{preview_url}" style="display:inline-block;background:{color};color:#fff;padding:13px 26px;font-weight:700;font-size:14px;text-decoration:none">
        👁 {"צפייה בגרסה המשודרגת" if website else "צפייה במוקאפ החינמי"}
      </a>
    </div>
    <p style="font-size:14px;line-height:1.8;color:#555">
      ✅ {hooks["benefit"]}<br/>
      📍 {seo_line}<br/>
      💰 רק <strong>₪1,990</strong> — כולל עיצוב, SEO וחיבור WhatsApp<br/>
      🚀 {hooks["cta_line"]}
    </p>
  </div>
  <div style="padding:28px 40px;background:{color};text-align:center">
    <a href="{AUDIT_URL}" style="display:inline-block;background:{accent};color:{color};padding:14px 36px;font-weight:800;font-size:15px;text-decoration:none">
      קבלו אודיט חינמי ←
    </a>
    <p style="color:rgba(255,255,255,.4);font-size:11px;margin-top:16px">
      מרגו | Mizra · hello@getmizra.com · +972 54 227 1670
    </p>
  </div>
</div>'''

    return html, subject

def build_followup1_email(lead: dict) -> tuple:
    """Follow-up 1 (J+5): short reminder email."""
    sector = lead.get("sector", "general")
    color, accent = SECTOR_COLORS.get(sector, ("#181818", "#4f8ef7"))
    name = lead["name"]
    preview_url = lead.get("preview_url", "")

    html = f'''<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="background:{color};padding:28px 40px">
    <div style="color:{accent};font-size:10px;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">Mizra · תזכורת</div>
    <div style="color:#fff;font-size:20px;font-weight:800">ראיתם את המוקאפ שיצרנו עבורכם?</div>
  </div>
  <div style="padding:28px 40px;background:#fafafa;border:1px solid #eee">
    <p style="font-size:15px;line-height:1.8;margin-bottom:16px">
      שלום,<br/>לפני כמה ימים שלחנו לכם <strong>אתר לדוגמה</strong> שיצרנו עבור <strong>{name}</strong>. רצינו לוודא שהגיע אליכם.
    </p>
    <a href="{preview_url}" style="display:inline-block;background:{color};color:#fff;padding:13px 26px;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:16px">
      👁 צפייה במוקאפ שלכם
    </a>
    <p style="font-size:14px;line-height:1.8;color:#555;margin-top:16px">
      אם אתם מעוניינים — פשוט השיבו למייל הזה או שלחו הודעה ב-WhatsApp ל-<strong>054-227-1670</strong>.<br/>
      נשמח לדבר ולענות על כל שאלה 🙂
    </p>
  </div>
  <div style="padding:20px 40px;background:{color};text-align:center">
    <p style="color:rgba(255,255,255,.4);font-size:11px">
      מרגו | Mizra · hello@getmizra.com · +972 54 227 1670
    </p>
  </div>
</div>'''
    subject = f'ראיתם את האתר שיצרנו עבור {name}? 👀'
    return html, subject

WATI_FOLLOWUP_TEMPLATE = "followup_reminder_mizra"  # Template to create in Wati

def send_email(lead: dict, followup: int = 0) -> bool:
    if not lead.get("email"): return False
    sector = lead.get("sector", "general")

    if followup == 1:
        html, subject = build_followup1_email(lead)
        tags = ["mizra-followup1", sector]
    else:
        html, subject = build_email_html(lead)
        tags = ["mizra-outreach", sector]

    r = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        json={
            "sender": {"email": "hello@getmizra.com", "name": "מרגו | Mizra"},
            "to": [{"email": lead["email"], "name": lead["name"]}],
            "subject": subject,
            "htmlContent": html,
            "tags": tags,
        },
        headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
        timeout=15
    )
    ok = r.status_code in (200, 201)
    if ok: print(f"  📧{'(R1)' if followup==1 else ''} {lead['email']}")
    else: print(f"  ❌ Email {r.status_code}: {r.text[:80]}")
    return ok

# ─── WHATSAPP ─────────────────────────────────────────────────────────────────
def send_whatsapp(lead: dict, followup: int = 0) -> bool:
    if not lead.get("phone"): return False

    template = WATI_FOLLOWUP_TEMPLATE if followup else WATI_TEMPLATE_NAME
    broadcast = f"mizra_{'fu' + str(followup) + '_' if followup else ''}{date.today().strftime('%Y%m%d')}"

    r = requests.post(
        f"{WATI_BASE_URL}/api/v1/sendTemplateMessages",
        json={
            "template_name": template,
            "broadcast_name": broadcast,
            "receivers": [{
                "whatsappNumber": lead["phone"],
                "customParams": [
                    {"name": "name", "value": lead["name"]}
                ]
            }]
        },
        headers={"Authorization": f"Bearer {WATI_TOKEN}", "Content-Type": "application/json"},
        timeout=15
    )
    ok = r.status_code in (200, 201)
    tag = f"(R{followup})" if followup else ""
    if ok: print(f"  📱{tag} {lead['phone']} ({lead['name']})")
    else: print(f"  ❌ WA {r.status_code}: {r.text[:80]}")
    return ok

# ─── RUN ─────────────────────────────────────────────────────────────────────
def run(dry_run=False, wa_only=False, email_only=False, limit=None):
    print(f"\n{'='*50}")
    print(f"🚀 Mizra Growth — {date.today()}")
    print(f"{'='*50}")

    # Only run Sunday (6) to Thursday (3) — Israeli work week
    weekday = date.today().weekday()  # Monday=0, Sunday=6
    if weekday in (4, 5) and not dry_run:  # Friday=4, Saturday=5
        print("⛔ Vendredi/Samedi — pas d'envoi (Shabbat). À dimanche!")
        return

    counter = load_counter()
    wa_max = get_warmup_limit()
    email_max = MAX_EMAIL

    wa_left = wa_max - counter["wa"]
    email_left = email_max - counter["email"]

    print(f"📊 Quotas: WA {counter['wa']}/{wa_max} (reste {wa_left}) | Email {counter['email']}/{email_max} (reste {email_left})")

    if wa_left <= 0 and email_left <= 0:
        print("⛔ Quotas atteints pour aujourd'hui.")
        return

    # Fetch leads pending — use outreach_status which was set by Node.js import
    needed = max(wa_left, email_left) + 50
    if limit: needed = min(needed, limit)

    params = f"outreach_status=eq.pending&order=priority.desc,created_at.asc&limit={needed}"
    leads = sb_get("leads", params)
    print(f"📋 {len(leads)} leads pending récupérés")

    wa_done = email_done = wa_failed = email_failed = 0
    errors = []

    for lead in leads:
        if wa_done >= wa_left and email_done >= email_left: break

        # Resolve sector and preview URL dynamically
        lead["sector"] = get_lead_sector(lead)
        lead["preview_url"] = build_preview_url(lead)

        name = lead.get('name', '?')
        print(f"\n→ {name} [{lead['sector']}] {lead.get('city','')} ")

        if dry_run:
            print(f"   [DRY] preview: {lead['preview_url']}")
            print(f"   [DRY] phone: {lead.get('phone')} | email: {lead.get('email')}")
            continue

        channels = []
        now = datetime.utcnow().isoformat()

        # WhatsApp
        if not email_only and lead.get("phone") and wa_done < wa_left:
            try:
                if send_whatsapp(lead):
                    wa_done += 1; counter["wa"] += 1; channels.append("whatsapp")
                else:
                    wa_failed += 1
            except Exception as e:
                wa_failed += 1
                errors.append({"lead_id": lead["id"], "channel": "whatsapp", "error": str(e)[:200]})
                print(f"  ❌ WA exception: {e}")
            time.sleep(DELAY)

        # Email
        if not wa_only and lead.get("email") and email_done < email_left:
            try:
                if send_email(lead):
                    email_done += 1; counter["email"] += 1; channels.append("email")
                else:
                    email_failed += 1
            except Exception as e:
                email_failed += 1
                errors.append({"lead_id": lead["id"], "channel": "email", "error": str(e)[:200]})
                print(f"  ❌ Email exception: {e}")
            time.sleep(DELAY)

        if channels:
            # Determine outreach_status for CRM compatibility
            has_wa = "whatsapp" in channels
            has_em = "email" in channels
            if has_wa and has_em:
                outreach_status = "sent_both"
            elif has_wa:
                outreach_status = "sent_whatsapp"
            else:
                outreach_status = "sent_email"

            update_data = {
                "status": "contacted",
                "outreach_status": outreach_status,
                "channel": "+".join(channels),
                "contacted_at": now,
                "last_contacted_at": now,
                "updated_at": now,
                "preview_url": lead["preview_url"],
                "sector": lead["sector"],
                "contact_count": (lead.get("contact_count") or 0) + 1,
            }
            if has_wa:
                update_data["whatsapp_sent_at"] = now
            if has_em:
                update_data["email_sent_at"] = now

            sb_patch("leads", lead["id"], update_data)
            save_counter(counter)

    # Log the run to outreach_logs
    if not dry_run:
        sb_post("outreach_logs", {
            "run_at": datetime.utcnow().isoformat(),
            "whatsapp_sent": wa_done,
            "whatsapp_failed": wa_failed,
            "email_sent": email_done,
            "email_failed": email_failed,
            "errors": errors if errors else None,
        })

    print(f"\n{'='*40}")
    print(f"✅ Session terminée:")
    print(f"   📧 Email: {email_done} envoyés / {email_failed} échoués")
    print(f"   📱 WhatsApp: {wa_done} envoyés / {wa_failed} échoués")
    if errors:
        print(f"   ⚠️  {len(errors)} erreurs")

# ─── FOLLOW-UPS ──────────────────────────────────────────────────────────────
def run_followups(dry_run=False, limit=None):
    """
    Relance 1 (J+5): email reminder to leads contacted 5+ days ago who have email
    Relance 2 (J+12): WA reminder to leads contacted 12+ days ago who have phone
    Skip leads who responded.
    """
    print(f"\n{'='*50}")
    print(f"🔄 Mizra Follow-ups — {date.today()}")
    print(f"{'='*50}")

    weekday = date.today().weekday()
    if weekday in (4, 5) and not dry_run:
        print("⛔ Vendredi/Samedi — pas d'envoi (Shabbat).")
        return

    now = datetime.utcnow()
    j5 = (now - __import__('datetime').timedelta(days=5)).isoformat()
    j12 = (now - __import__('datetime').timedelta(days=12)).isoformat()
    now_iso = now.isoformat()

    # ── Relance 1: Email J+5 ──
    # Leads contacted 5+ days ago, contact_count=1 (only initial contact), have email, not responded
    params_r1 = (
        "outreach_status=neq.responded&outreach_status=neq.converted&outreach_status=neq.pending"
        f"&contacted_at=lt.{j5}&contact_count=eq.1&email=neq.null"
        "&order=contacted_at.asc"
        f"&limit={limit or 200}"
    )
    r1_leads = sb_get("leads", params_r1)
    # Filter: only leads with actual email (neq.null doesn't catch empty strings)
    r1_leads = [l for l in r1_leads if l.get("email")]
    print(f"\n📧 Relance 1 (J+5): {len(r1_leads)} leads éligibles")

    r1_sent = r1_failed = 0
    r1_errors = []
    for lead in r1_leads:
        lead["sector"] = get_lead_sector(lead)
        lead["preview_url"] = build_preview_url(lead)
        name = lead.get("name", "?")
        print(f"  → R1 {name} [{lead['sector']}]")

        if dry_run:
            print(f"    [DRY] email: {lead.get('email')}")
            continue

        try:
            if send_email(lead, followup=1):
                r1_sent += 1
                sb_patch("leads", lead["id"], {
                    "contact_count": 2,
                    "last_contacted_at": now_iso,
                    "followup1_at": now_iso,
                    "updated_at": now_iso,
                })
            else:
                r1_failed += 1
        except Exception as e:
            r1_failed += 1
            r1_errors.append({"lead_id": lead["id"], "channel": "email_followup1", "error": str(e)[:200]})
            print(f"    ❌ R1 exception: {e}")
        time.sleep(DELAY)

    # ── Relance 2: WhatsApp J+12 ──
    # Leads contacted 12+ days ago, contact_count=2 (had initial + R1), have phone, not responded
    params_r2 = (
        "outreach_status=neq.responded&outreach_status=neq.converted&outreach_status=neq.pending"
        f"&contacted_at=lt.{j12}&contact_count=eq.2&phone=neq.null"
        "&order=contacted_at.asc"
        f"&limit={limit or 100}"
    )
    r2_leads = sb_get("leads", params_r2)
    r2_leads = [l for l in r2_leads if l.get("phone")]

    # Respect warm-up limit for WA
    wa_max = get_warmup_limit()
    counter = load_counter()
    wa_left = wa_max - counter["wa"]
    r2_leads = r2_leads[:max(0, wa_left)]

    print(f"\n📱 Relance 2 (J+12): {len(r2_leads)} leads éligibles (WA quota: {wa_left} restants)")

    r2_sent = r2_failed = 0
    r2_errors = []
    for lead in r2_leads:
        lead["sector"] = get_lead_sector(lead)
        lead["preview_url"] = build_preview_url(lead)
        name = lead.get("name", "?")
        print(f"  → R2 {name} [{lead['sector']}]")

        if dry_run:
            print(f"    [DRY] phone: {lead.get('phone')}")
            continue

        try:
            if send_whatsapp(lead, followup=2):
                r2_sent += 1
                counter["wa"] += 1
                sb_patch("leads", lead["id"], {
                    "contact_count": 3,
                    "last_contacted_at": now_iso,
                    "followup2_at": now_iso,
                    "updated_at": now_iso,
                })
            else:
                r2_failed += 1
        except Exception as e:
            r2_failed += 1
            r2_errors.append({"lead_id": lead["id"], "channel": "wa_followup2", "error": str(e)[:200]})
            print(f"    ❌ R2 exception: {e}")
        time.sleep(DELAY)

    if not dry_run:
        save_counter(counter)
        all_errors = r1_errors + r2_errors
        sb_post("outreach_logs", {
            "run_at": now_iso,
            "run_type": "followups",
            "whatsapp_sent": r2_sent,
            "whatsapp_failed": r2_failed,
            "email_sent": r1_sent,
            "email_failed": r1_failed,
            "errors": all_errors if all_errors else None,
        })

    print(f"\n{'='*40}")
    print(f"✅ Follow-ups terminés:")
    print(f"   📧 R1 email: {r1_sent} envoyés / {r1_failed} échoués")
    print(f"   📱 R2 WA: {r2_sent} envoyés / {r2_failed} échoués")


if __name__ == "__main__":
    import sys
    args = sys.argv[1:]

    if "--import" in args:
        import_all_csvs()
    elif "--followups" in args:
        run_followups(
            dry_run="--dry" in args,
            limit=int(next((a.split("=")[1] for a in args if a.startswith("--limit=")), 0)) or None
        )
    else:
        run(
            dry_run="--dry" in args,
            wa_only="--wa-only" in args,
            email_only="--email-only" in args,
            limit=int(next((a.split("=")[1] for a in args if a.startswith("--limit=")), 0)) or None
        )
