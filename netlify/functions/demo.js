const fs = require("fs");
const path = require("path");

// Segment slug (Supabase) → template directory mapping
const SEGMENT_TO_DIR = {
  restaurants: "restaurant",
  beauty_salons: "beauty-salon",
  barbershops: "barbershop",
  pilates: "pilates",
  sports: "sports-coach",
  clinics: "clinic",
  lawyers: "lawyer",
  real_estate: "real-estate",
  contractors: "contractor",
  interior_design: "freelancer",
  photographers: "freelancer",
  event_planners: "freelancer",
  cafes: "cafe",
};

// Hardcoded values in each template that need to be replaced
const TEMPLATE_CONFIG = {
  restaurant: {
    nameEN: "The Golden Table",
    nameHE: "השולחן הזהוב",
    phone: "03-555-1234",
    phoneTel: "+97235551234",
    addressEN: "82 Rothschild Boulevard",
    addressHE: "שדרות רוטשילד 82",
    cityEN: "Tel Aviv-Yafo",
    cityHE: "תל אביב-יפו",
    email: "info@thegoldentable.co.il",
  },
  "beauty-salon": {
    nameEN: "Studio Lilac",
    nameHE: "סטודיו לילך",
    phone: "03-555-1234",
    phoneTel: "+97235551234",
    addressEN: "82 Basle Street",
    addressHE: "רחוב בזל 82",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  barbershop: {
    nameEN: "Yossi's Barbershop",
    nameHE: "הספר של יוסי",
    phone: "052-123-4567",
    phoneTel: "+972521234567",
    addressEN: "7 Rokach Street",
    addressHE: "רחוב רוקח 7",
    cityEN: "Florentin, Tel Aviv",
    cityHE: "פלורנטין, תל אביב",
    email: null,
  },
  cafe: {
    nameEN: "Cafe Nechama",
    nameHE: "קפה נחמה",
    phone: "03-123-4567",
    phoneTel: "+97231234567",
    addressEN: "88 Dizengoff Street",
    addressHE: "רחוב דיזנגוף 88",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  clinic: {
    nameEN: "Dr. Cohen Dental",
    nameHE: "ד״ר כהן דנטלי",
    phone: "03-123-4567",
    phoneTel: "+97231234567",
    addressEN: "120 Ben Gurion Avenue, 3rd Floor, Office 305",
    addressHE: "רחוב אבן גבירול 120, קומה 3, משרד 305",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  contractor: {
    nameEN: "Avi Renovations",
    nameHE: "אבי שיפוצים",
    phone: "050-123-4567",
    phoneTel: "+972501234567",
    addressEN: "Renovation & Construction Services",
    addressHE: "שירותי שיפוצים והנדסה",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  freelancer: {
    nameEN: "Studio Maya",
    nameHE: "סטודיו מאיה",
    phone: null,
    phoneTel: null,
    addressEN: "Jaffa",
    addressHE: "יפו",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  lawyer: {
    nameEN: "Levi, Shapira & Partners",
    nameHE: "לוי, שפירא ושותפים",
    phone: "+972-3-612-3456",
    phoneTel: "+97236123456",
    addressEN: "Rothschild Tower, 22 Rothschild Boulevard",
    addressHE: "מגדל רוטשילד, שדרות רוטשילד 22",
    cityEN: "Tel Aviv-Yafo",
    cityHE: "תל אביב-יפו",
    email: null,
  },
  pilates: {
    nameEN: "Kore",
    nameHE: "קורה",
    phone: "03-510-8888",
    phoneTel: "+97235108888",
    addressEN: "22 Shabazi St, Neve Tzedek",
    addressHE: "רחוב שבזי 22, נווה צדק",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  "real-estate": {
    nameEN: "Lior Real Estate",
    nameHE: "ליאור נדל״ן",
    phone: "050-123-4567",
    phoneTel: "+972501234567",
    addressEN: "45 Rothschild Boulevard",
    addressHE: "רוטשילד 45",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  "sports-coach": {
    nameEN: "Noa Fitness",
    nameHE: "נועה פיטנס",
    phone: null,
    phoneTel: null,
    addressEN: "Tel Aviv",
    addressHE: "תל אביב",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  startup: {
    nameEN: "Loomi",
    nameHE: "לומי",
    phone: null,
    phoneTel: null,
    addressEN: "Tel Aviv Office",
    addressHE: "משרדים בתל אביב",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
  therapist: {
    nameEN: "Dr. Shira Levi",
    nameHE: "ד״ר שירה לוי",
    phone: "03-640-1234",
    phoneTel: "+97236401234",
    addressEN: "15 Einstein St, Ramat Aviv, 4th Floor",
    addressHE: "רחוב אינשטיין 15, רמת אביב, קומה 4",
    cityEN: "Tel Aviv",
    cityHE: "תל אביב",
    email: null,
  },
};

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method not allowed" };

  const id = event.queryStringParameters?.id;
  if (!id || id.length < 10) return { statusCode: 400, body: "Missing or invalid id" };

  // Fetch lead from Supabase REST API
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return { statusCode: 500, body: "Server config error" };

  let lead;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await res.json();
    if (!data || data.length === 0) return { statusCode: 404, body: "Lead not found" };
    lead = data[0];
  } catch (err) {
    return { statusCode: 500, body: "Database error" };
  }

  // Resolve template
  const segment = lead.segment || "restaurants";
  const templateDir = SEGMENT_TO_DIR[segment] || "freelancer";
  const config = TEMPLATE_CONFIG[templateDir] || TEMPLATE_CONFIG.freelancer;

  // Read template HTML from bundled dist files
  let html;
  try {
    const templatePath = path.join(__dirname, "..", "..", "dist", "examples", templateDir, "index.html");
    html = fs.readFileSync(templatePath, "utf-8");
  } catch {
    return { statusCode: 500, body: `Template not found: ${templateDir}` };
  }

  // Perform replacements
  const name = lead.business_name || "Your Business";
  const phone = lead.phone || "";
  const city = lead.city || config.cityHE;
  const address = lead.address || "";

  // Replace business name
  if (config.nameEN) html = html.replaceAll(config.nameEN, name);
  if (config.nameHE) html = html.replaceAll(config.nameHE, name);

  // Replace phone
  if (phone && config.phone) {
    const displayPhone = phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    html = html.replaceAll(config.phone, displayPhone);
    if (config.phoneTel) {
      const cleanTel = phone.replace(/[^0-9]/g, "");
      html = html.replaceAll(config.phoneTel, `+972${cleanTel.startsWith("0") ? cleanTel.slice(1) : cleanTel}`);
    }
  }

  // Replace city
  if (city) {
    if (config.cityEN) html = html.replaceAll(config.cityEN, city);
    if (config.cityHE) html = html.replaceAll(config.cityHE, city);
  }

  // Replace address
  if (address) {
    if (config.addressEN) html = html.replaceAll(config.addressEN, address);
    if (config.addressHE) html = html.replaceAll(config.addressHE, address);
  }

  // Replace email
  if (config.email) {
    html = html.replaceAll(config.email, "hello@getmizra.com");
  }

  // Fix image paths — relative img/ → absolute URLs
  html = html.replaceAll('src="img/', `src="https://getmizra.com/examples/${templateDir}/img/`);
  html = html.replaceAll("src='img/", `src='https://getmizra.com/examples/${templateDir}/img/`);
  html = html.replaceAll('href="/favicon.svg"', 'href="https://getmizra.com/favicon.svg"');
  html = html.replaceAll('href="/shared.js"', 'href="https://getmizra.com/shared.js"');
  html = html.replaceAll('src="/shared.js"', 'src="https://getmizra.com/shared.js"');

  // Inject Mizra demo banner at top of <body>
  const banner = `
<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#1a1a1a,#333);color:#fff;text-align:center;padding:10px 16px;font-family:sans-serif;font-size:14px;direction:rtl">
  <span class="he"><strong>${name}</strong> — דמו שנוצר עבורכם על ידי <a href="https://getmizra.com" style="color:#F5A623;text-decoration:none;font-weight:700">Mizra</a>. <a href="https://getmizra.com/free-audit/" style="color:#F5A623;text-decoration:underline">בואו נתחיל →</a></span>
  <span class="en"><strong>${name}</strong> — Demo created for you by <a href="https://getmizra.com" style="color:#F5A623;text-decoration:none;font-weight:700">Mizra</a>. <a href="https://getmizra.com/free-audit/" style="color:#F5A623;text-decoration:underline">Get started →</a></span>
</div>
<div style="height:40px"></div>`;

  html = html.replace("<body>", `<body>${banner}`);
  html = html.replace("<body ", `<body data-demo="true" `);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
    body: html,
  };
};
