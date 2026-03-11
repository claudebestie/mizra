const PAYPLUS_API = "https://restapi.payplus.co.il/api/v1.0";
const SITE_URL = "https://getmizra.com";

// Landing page fixed pricing
const PLANS = {
  landing_page: { amount_ht: 1990, label_en: "Landing Page Website", label_he: "אתר דף נחיתה" },
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const cors = {
    "Access-Control-Allow-Origin": SITE_URL,
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // ── Validate required fields ──
  const required = ["name", "email", "phone", "business_name", "business_type", "city", "plan", "installments"];
  for (const f of required) {
    if (!data[f]) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Missing field: ${f}` }) };
  }

  // Phone validation (Israeli mobile)
  const phoneClean = data.phone.replace(/[\s-]/g, "");
  if (!/^05\d{8}$/.test(phoneClean)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid phone number" }) };
  }

  // Email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid email" }) };
  }

  // Plan validation
  if (data.plan !== "landing_page") {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid plan" }) };
  }

  const installments = parseInt(data.installments, 10);
  if (![1, 2].includes(installments)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid installments (1 or 2)" }) };
  }

  // ── Compute pricing ──
  const plan = PLANS[data.plan];
  const amount_ht = plan.amount_ht;
  const vat_amount = Math.round(amount_ht * 0.18);
  const amount_ttc = amount_ht + vat_amount;
  const payment_method = `payplus_${installments}x`;

  // ── Insert order in Supabase ──
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server config error" }) };
  }

  const orderData = {
    name: data.name,
    email: data.email,
    phone: phoneClean,
    business_name: data.business_name,
    business_type: data.business_type,
    city: data.city,
    current_website: data.current_website || null,
    instagram: data.instagram || null,
    facebook: data.facebook || null,
    description: data.description || null,
    website_lang: data.website_lang || "he",
    plan: data.plan,
    amount_ht,
    vat_amount,
    amount_ttc,
    installments,
    payment_method,
    payment_status: "processing",
    invoice_requested: data.invoice_requested || false,
    invoice_data: data.invoice_data || null,
  };

  let order;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(orderData),
    });
    const rows = await res.json();
    if (!res.ok || !rows || rows.length === 0) {
      console.error("Supabase insert error:", JSON.stringify(rows));
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Database error" }) };
    }
    order = rows[0];
  } catch (err) {
    console.error("Supabase network error:", err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Database error" }) };
  }

  // ── Create PayPlus payment link ──
  const apiKey = process.env.PAYPLUS_API_KEY;
  const secretKey = process.env.PAYPLUS_SECRET_KEY;
  if (!apiKey || !secretKey) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Payment config error" }) };
  }

  const payloadPayPlus = {
    payment_page_uid: "",
    charge_method: installments > 1 ? 2 : 1, // 1=regular, 2=installments
    amount: amount_ttc,
    currency_code: "ILS",
    sendEmailApproval: true,
    sendEmailFailure: false,
    customer: {
      customer_name: data.name,
      email: data.email,
      phone: phoneClean,
    },
    items: [
      {
        name: plan.label_en,
        quantity: 1,
        price: amount_ht,
        vat_type: 1, // 1 = VAT excluded (PayPlus adds VAT)
      },
    ],
    max_payments: installments,
    success_url: `${SITE_URL}/order-success/?order=${order.id}`,
    failure_url: `${SITE_URL}/pricing/?payment=failed`,
    cancel_url: `${SITE_URL}/pricing/`,
    more_info: order.id,
  };

  try {
    const ppRes = await fetch(`${PAYPLUS_API}/PaymentPages/generateLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: JSON.stringify({ api_key: apiKey, secret_key: secretKey }),
      },
      body: JSON.stringify(payloadPayPlus),
    });

    const ppData = await ppRes.json();

    if (!ppRes.ok || !ppData.data || !ppData.data.payment_page_link) {
      console.error("PayPlus error:", JSON.stringify(ppData));
      // Rollback order status
      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ payment_status: "failed" }),
      });
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Payment provider error" }) };
    }

    // Store PayPlus URL in order
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        payplus_page_url: ppData.data.payment_page_link,
        payplus_payment_id: ppData.data.page_request_uid || null,
      }),
    });

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        ok: true,
        payment_url: ppData.data.payment_page_link,
        order_id: order.id,
      }),
    };
  } catch (err) {
    console.error("PayPlus network error:", err);
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Payment provider unreachable" }) };
  }
};
