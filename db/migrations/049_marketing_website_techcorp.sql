-- Point public marketing / brochure URL to Techcorp (replaces prior Wix default from 046 for existing databases).

UPDATE platform_settings
SET
  settings = COALESCE(settings, '{}'::jsonb)
    || jsonb_build_object(
      'marketingWebsiteUrl',
      'https://techcorp.com/'
    ),
  updated_at = NOW()
WHERE id = 1;
