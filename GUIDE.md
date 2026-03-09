# MIZRA BLOG AUTOMATION — Guide de déploiement complet

## Architecture

```
getmizra (GitHub repo)
├── src/content/blog/          ← Articles générés ici automatiquement
│   ├── site-web-restaurant-tel-aviv.md
│   ├── restaurant-website-builder-israel.md
│   └── ...
├── scripts/
│   ├── generate-articles.js   ← Script principal
│   └── package.json
├── .github/workflows/
│   └── weekly-blog.yml        ← Cron lundi 7h
└── supabase/
    └── schema.sql             ← Tables blog_posts + automation_logs
```

---

## Étape 1 — Supabase

1. Va dans **Supabase → SQL Editor**
2. Copie-colle le contenu de `supabase/schema.sql`
3. Execute → les tables `blog_posts` et `automation_logs` sont créées
4. Dans **Settings → API** : copie `SUPABASE_URL` et la **Service Role Key**

---

## Étape 2 — GitHub Secrets

Dans ton repo GitHub → **Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|--------|--------|
| `ANTHROPIC_API_KEY` | Ta clé API Anthropic |
| `SUPABASE_URL` | URL de ton projet Supabase |
| `SUPABASE_SERVICE_KEY` | Service Role Key Supabase |
| `GH_PAT_TOKEN` | Token GitHub (repo + workflow) |
| `NETLIFY_BUILD_HOOK` | URL du build hook Netlify |

---

## Étape 3 — Structure Astro

Assure-toi que ton repo Astro a une collection `blog` dans `src/content/config.ts` :

```typescript
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    author: z.string().default('Équipe Mizra'),
    tags: z.array(z.string()).default([]),
    keyword: z.string().optional(),
    lang: z.string().default('fr'),
    readingTime: z.string().optional(),
  }),
});

export const collections = { blog };
```

Et une page `src/pages/blog/[slug].astro` pour le routing dynamique.

---

## Étape 4 — Test local

```bash
cd scripts
cp ../.env.example .env
# Remplis .env avec tes vraies clés

npm install
ARTICLES_PER_RUN=1 node generate-articles.js
```

---

## Étape 5 — Déployer le GitHub Action

```bash
git add .github/workflows/weekly-blog.yml scripts/
git commit -m "feat: add weekly blog automation"
git push
```

Le cron se déclenchera automatiquement chaque lundi à 7h (heure Israel).

**Test manuel :** GitHub → Actions → "Mizra Blog" → "Run workflow"

---

## Monitoring

Dans ton **back-office Mizra**, ajoute cet onglet :

```sql
-- Articles publiés cette semaine
SELECT slug, title, lang, word_count, published_at
FROM blog_posts
WHERE published_at >= NOW() - INTERVAL '7 days'
ORDER BY published_at DESC;

-- Stats globales
SELECT * FROM blog_stats;
```

---

## LE PROMPT CLAUDE CODE

Copie-colle exactement ce prompt dans Claude Code :

---

```
Je travaille sur getmizra.com, un site Astro déployé sur Netlify avec un backend Supabase.
Je veux intégrer un système d'automatisation du blog qui génère 5 articles SEO par semaine via Claude API.

Voici les fichiers à intégrer dans mon repo :

1. `scripts/generate-articles.js` — le script principal (je t'envoie le fichier)
2. `scripts/package.json` — les dépendances
3. `.github/workflows/weekly-blog.yml` — le GitHub Action cron
4. `supabase/schema.sql` — les tables Supabase

Voici ce que j'ai besoin que tu fasses :

**TÂCHE 1 — Vérifier la structure Astro content collections**
- Vérifie si `src/content/config.ts` existe et si une collection `blog` est déjà définie
- Si non, crée-la avec ce schema : title (string), description (string), date (string), author (string, default 'Équipe Mizra'), tags (array string), keyword (string optional), lang (string default 'fr'), readingTime (string optional)

**TÂCHE 2 — Créer la page de routing blog**
- Vérifie si `src/pages/blog/[slug].astro` existe
- Si non, crée une page blog dynamique qui :
  - Lit les articles depuis `src/content/blog/`
  - Affiche le contenu markdown rendu
  - A le même design/layout que le reste du site (utilise le layout principal existant)
  - Inclut les meta tags SEO (title, description, og:image avec valeur par défaut)
  - Inclut le JSON-LD FAQ Schema si des questions sont présentes dans le markdown

**TÂCHE 3 — Créer la page listing blog**
- Vérifie si `src/pages/blog/index.astro` existe  
- Si non, crée une page listing qui :
  - Liste tous les articles du blog avec titre, date, description, tag langue
  - Pagination si > 12 articles
  - Même design que le reste du site
  - Filtre par langue (FR / EN / HE) avec des onglets ou boutons

**TÂCHE 4 — Ajouter le lien blog dans la navigation**
- Trouve le composant de navigation principal du site
- Ajoute un lien "Blog" vers /blog/
- Place-le entre les liens existants (après les services, avant le CTA)

**TÂCHE 5 — Vérifier le sitemap**
- Vérifie que `@astrojs/sitemap` est configuré dans `astro.config.mjs`
- Si non, ajoute-le avec site: 'https://getmizra.com'
- Assure-toi que les articles blog sont inclus dans le sitemap automatiquement

**CONTRAINTES :**
- Ne touche à rien d'autre dans le codebase
- Respecte exactement le style visuel et les composants existants
- Les articles markdown auront un frontmatter YAML avec : title, description, date, author, tags, slug, lang, keyword, readingTime
- Chaque article peut contenir une section ## FAQ avec des paires Q/R à transformer en JSON-LD

Commence par lire les fichiers existants avant de créer quoi que ce soit. Dis-moi ce que tu trouves avant d'agir.
```

---

## Ajouter de nouveaux sujets

Dans `scripts/generate-articles.js`, ajoute dans le tableau `TOPIC_BANK` :

```javascript
{
  lang: "fr",           // "fr", "en", ou "he"
  series: "metier",     // "metier", "comparatif", "local-seo", "business"
  title: "Titre SEO de l'article",
  keyword: "mot-clé principal",
  slug: "url-de-larticle"  // unique, sans accents, tirets
}
```

---

## Fréquence et budget API

- 5 articles × ~2500 mots = ~12,500 tokens output/semaine
- Claude Sonnet 4 : ~$0.015/1K tokens output = **~$0.19/semaine**
- Soit moins de **$1/mois** pour 20 articles générés automatiquement
