-- ============================================================
-- MIZRA LEAD CONVERSION PIPELINE — Schema additions
-- À exécuter dans SQL Editor de ton projet Supabase
-- ============================================================

-- Nouvelles colonnes pour le pipeline mockup
ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_status TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_checked_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mockup_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mockup_sent_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mockup_email_at TIMESTAMPTZ;

-- Index pour les queries du pipeline
CREATE INDEX IF NOT EXISTS idx_leads_site_status ON leads(site_status);
CREATE INDEX IF NOT EXISTS idx_leads_mockup_sent_at ON leads(mockup_sent_at);
CREATE INDEX IF NOT EXISTS idx_leads_mockup_email_at ON leads(mockup_email_at);

-- Vue monitoring pipeline
CREATE OR REPLACE VIEW pipeline_stats AS
SELECT
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE site_status = 'none') AS no_website,
  COUNT(*) FILTER (WHERE site_status = 'outdated') AS outdated_website,
  COUNT(*) FILTER (WHERE site_status = 'ok') AS ok_website,
  COUNT(*) FILTER (WHERE site_status IS NULL) AS unchecked,
  COUNT(*) FILTER (WHERE mockup_sent_at IS NOT NULL) AS mockups_sent_wa,
  COUNT(*) FILTER (WHERE mockup_email_at IS NOT NULL) AS followups_sent_email,
  COUNT(*) FILTER (WHERE status = 'responded') AS responded
FROM leads;
