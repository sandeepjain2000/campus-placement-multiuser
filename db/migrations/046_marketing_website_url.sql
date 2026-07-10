-- Public marketing / brochure website (Wix or other). Consumed by landing nav, /features|/about|/contact redirects, and GET /api/public/site-config.
-- Value lives only in the database (not in application source).

UPDATE platform_settings
SET
  settings = COALESCE(settings, '{}'::jsonb)
    || jsonb_build_object(
      'marketingWebsiteUrl',
      'https://techcorp.com/'
    ),
  updated_at = NOW()
WHERE id = 1;
