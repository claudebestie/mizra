#!/usr/bin/env node
/**
 * WATI WhatsApp API helper
 * Handles template sending, contact management, rate limiting
 */

const WATI_API_URL = process.env.WATI_API_URL;
const WATI_API_KEY = process.env.WATI_API_KEY;
const DAILY_LIMIT = parseInt(process.env.WATI_DAILY_LIMIT || "50");
const SEND_HOUR_START = parseInt(process.env.WATI_SEND_HOUR_START || "9");
const SEND_HOUR_END = parseInt(process.env.WATI_SEND_HOUR_END || "20");

let dailySentCount = 0;

function headers() {
  return {
    Authorization: WATI_API_KEY,
    "Content-Type": "application/json",
  };
}

function isWithinSendingHours() {
  const now = new Date();
  const israelHour = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  ).getHours();
  return israelHour >= SEND_HOUR_START && israelHour < SEND_HOUR_END;
}

function canSend() {
  if (dailySentCount >= DAILY_LIMIT) {
    console.error(`[wati] Daily limit reached: ${dailySentCount}/${DAILY_LIMIT}`);
    return false;
  }
  if (!isWithinSendingHours()) {
    console.error("[wati] Outside sending hours (9h-20h Israel time)");
    return false;
  }
  return true;
}

async function sendTemplateMessage(phone, templateName, params = []) {
  if (!canSend()) return { success: false, reason: "rate_limit_or_hours" };

  const cleanPhone = phone.replace(/[^0-9]/g, "");

  const body = {
    template_name: templateName,
    broadcast_name: `mizra_outreach_${Date.now()}`,
    parameters: params.map((p) => ({ name: p.name, value: p.value })),
  };

  try {
    const res = await fetch(
      `${WATI_API_URL}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`,
      { method: "POST", headers: headers(), body: JSON.stringify(body) }
    );

    const data = await res.json();

    if (data.result === "success" || res.ok) {
      dailySentCount++;
      console.log(`[wati] ✅ Sent to ${cleanPhone} (${dailySentCount}/${DAILY_LIMIT})`);
      return { success: true, data };
    }

    console.error(`[wati] ❌ Failed for ${cleanPhone}:`, data);
    return { success: false, data };
  } catch (err) {
    console.error(`[wati] ❌ Network error for ${cleanPhone}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Segment slug → Hebrew label for template personalization
const SEGMENT_LABELS_HE = {
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

/**
 * Send personalized outreach (mizra_perso_he)
 * Falls back to static template (mizra_outreach_he) if perso template not approved
 */
async function sendOutreach(phone, lead) {
  // Check if personalized template exists and is approved
  const persoAvailable = await isTemplateApproved("mizra_perso_he");

  if (persoAvailable && lead.business_name) {
    const categoryLabel = SEGMENT_LABELS_HE[lead.segment] || "עסקים קטנים";
    const city = lead.city || "תל אביב";
    const name = lead.business_name;

    return sendTemplateMessage(phone, "mizra_perso_he", [
      { name: "1", value: name },
      { name: "2", value: name },
      { name: "3", value: categoryLabel },
      { name: "4", value: city },
    ]);
  }

  // Fallback: static template
  return sendTemplateMessage(phone, "mizra_outreach_he", []);
}

let _templateCache = null;
let _templateCacheTime = 0;

async function isTemplateApproved(templateName) {
  // Cache templates for 5 min to avoid spamming the API
  if (_templateCache && Date.now() - _templateCacheTime < 300_000) {
    return _templateCache.some((t) => t.elementName === templateName && t.status === "APPROVED");
  }
  try {
    const all = await getTemplates();
    _templateCache = all;
    _templateCacheTime = Date.now();
    return all.some((t) => t.elementName === templateName && t.status === "APPROVED");
  } catch {
    return false;
  }
}

async function getTemplates() {
  const res = await fetch(`${WATI_API_URL}/api/v1/getMessageTemplates`, {
    headers: headers(),
  });
  const data = await res.json();
  return data.messageTemplates || [];
}

async function getApprovedTemplates() {
  const all = await getTemplates();
  return all.filter((t) => t.status === "APPROVED");
}

function resetDailyCount() {
  dailySentCount = 0;
}

function getSentCount() {
  return dailySentCount;
}

function getDailyLimit() {
  return DAILY_LIMIT;
}

export {
  sendTemplateMessage,
  sendOutreach,
  getTemplates,
  getApprovedTemplates,
  isTemplateApproved,
  canSend,
  isWithinSendingHours,
  resetDailyCount,
  getSentCount,
  getDailyLimit,
  SEGMENT_LABELS_HE,
};
