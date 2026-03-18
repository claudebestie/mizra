// ── Vercel Serverless Function: /api/analyze-pdf ──
// Reçoit un PDF en base64, l'envoie à Claude pour extraction des infos devis
// Retourne un JSON structuré pour pré-remplir le formulaire de facturation

module.exports = async function handler(req, res) {

  // CORS headers (même domaine normalement, mais au cas où)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilise POST.' });
  }

  const { base64 } = req.body || {};

  if (!base64) {
    return res.status(400).json({ error: 'Champ "base64" manquant dans le body.' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY non configurée dans les variables d\'environnement Vercel.'
    });
  }

  try {
    // ── Appel Claude API avec le PDF ──
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            },
            {
              type: 'text',
              text: `Tu es un assistant spécialisé dans l'extraction de données de devis et factures.

Analyse ce document PDF et extrais les informations suivantes.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans commentaire.

Format attendu :
{
  "name": "Nom complet du client (string)",
  "email": "Email du client (string ou null)",
  "phone": "Téléphone du client (string ou null)",
  "company": "Nom de l'entreprise ou entité (string ou null)",
  "package": "Description de la prestation principale (string)",
  "total": 1990,
  "source": "fr",
  "notes": "Infos utiles pour livraison/onboarding (string ou null)",
  "paymethod": "Virement bancaire",
  "instalments": null
}

Règles strictes :
- "total" → nombre uniquement, sans symbole € ou ₪, sans espaces
- "source" → "fr" si le document est en euros ou mentionne la France, "il" si en shekels ou mentionne Israël
- "paymethod" → une de ces valeurs exactes : "Virement bancaire", "PayPlus", "Carte bancaire", "Espèces", "Stripe", "Autre"
- "instalments" → si le paiement est en plusieurs fois, renvoie un tableau :
  [{"label": "Acompte", "amount": 995, "date": "2026-03-18"}, {"label": "Solde", "amount": 995, "date": "2026-04-18"}]
  Sinon, renvoie null
- Les dates doivent être au format YYYY-MM-DD
- Si une information n'est pas trouvable dans le document, mets null
- "package" doit résumer la prestation (ex: "Site web professionnel — Restaurant")
- Réponds UNIQUEMENT avec le JSON, rien d'autre`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({
        error: `Erreur API Anthropic (${response.status})`,
        details: errBody
      });
    }

    const result = await response.json();

    // Extraire le texte de la réponse Claude
    const text = result.content?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: 'Réponse Claude vide ou inattendue',
        raw: JSON.stringify(result)
      });
    }

    // Parser le JSON depuis la réponse (gère le cas où Claude ajoute du texte autour)
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({
        error: 'Impossible de parser la réponse Claude en JSON',
        raw: text
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return res.status(500).json({
        error: 'JSON invalide dans la réponse Claude',
        raw: jsonMatch[0],
        parseError: parseErr.message
      });
    }

    // ── Normaliser les champs ──
    const normalized = {
      name:        parsed.name || null,
      email:       parsed.email || null,
      phone:       parsed.phone || null,
      company:     parsed.company || null,
      package:     parsed.package || parsed.description || parsed.prestation || null,
      total:       typeof parsed.total === 'number' ? parsed.total : (parseFloat(parsed.total) || null),
      source:      ['fr', 'il'].includes(parsed.source) ? parsed.source : 'fr',
      notes:       parsed.notes || null,
      paymethod:   parsed.paymethod || parsed.payment_method || 'Virement bancaire',
      instalments: Array.isArray(parsed.instalments) ? parsed.instalments.map(inst => ({
        label:  inst.label || 'Versement',
        amount: typeof inst.amount === 'number' ? inst.amount : (parseFloat(inst.amount) || 0),
        date:   inst.date || ''
      })) : null
    };

    return res.status(200).json(normalized);

  } catch (err) {
    console.error('analyze-pdf error:', err);
    return res.status(500).json({
      error: 'Erreur interne lors de l\'analyse du PDF',
      message: err.message
    });
  }
};
