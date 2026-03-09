-- ============================================================
-- MIZRA BLOG AUTOMATION — Supabase Schema
-- À exécuter dans SQL Editor de ton projet Supabase
-- ============================================================

-- Table principale des articles
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  keyword TEXT,
  lang TEXT NOT NULL DEFAULT 'fr', -- 'fr', 'en', 'he'
  series TEXT, -- 'metier', 'comparatif', 'local-seo', etc.
  content TEXT, -- Contenu markdown complet
  github_path TEXT, -- Chemin dans le repo GitHub
  status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'error'
  word_count INTEGER,
  published_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_lang ON blog_posts(lang);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Table de logs des runs d'automatisation
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL,
  articles_generated INTEGER DEFAULT 0,
  articles_failed INTEGER DEFAULT 0,
  slugs_success TEXT[],
  slugs_failed JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View pratique pour le back-office Mizra
CREATE OR REPLACE VIEW blog_stats AS
SELECT
  COUNT(*) AS total_articles,
  COUNT(*) FILTER (WHERE lang = 'fr') AS articles_fr,
  COUNT(*) FILTER (WHERE lang = 'en') AS articles_en,
  COUNT(*) FILTER (WHERE lang = 'he') AS articles_he,
  COUNT(*) FILTER (WHERE status = 'published') AS published,
  COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '7 days') AS this_week,
  SUM(word_count) AS total_words,
  MAX(published_at) AS last_published_at
FROM blog_posts;

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) — lecture publique, écriture service key uniquement
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read blog_posts"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Service role full access blog_posts"
  ON blog_posts FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access automation_logs"
  ON automation_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- DONNÉES DE TEST (optionnel, à commenter en prod)
-- ============================================================
-- INSERT INTO blog_posts (slug, title, keyword, lang, series, status, published_at, word_count)
-- VALUES ('test-article', 'Article de test', 'test', 'fr', 'metier', 'draft', NOW()::date, 0);
