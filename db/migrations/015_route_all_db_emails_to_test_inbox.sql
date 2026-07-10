-- Test / staging: point stored email fields at sandeepjain200019@gmail.com
-- WARNING: This breaks normal logins. To recover seeded accounts + sandeep super-admin, run 016_restore_seed_logins_after_email_test_migration.sql after this.
-- NOTE: users.email is UNIQUE. We use Gmail plus-addressing (local+tag@) so every row stays unique.
--       Log in with the new address shown for your user (e.g. sandeepjain200019+u<uuid>@gmail.com).

-- 1) Users → unique plus aliases (all deliver to the same Gmail inbox)
UPDATE users
SET
  email = 'sandeepjain200019+u' || replace(id::text, '-', '') || '@gmail.com',
  updated_at = NOW()
WHERE email IS NOT NULL
  AND lower(email) <> ('sandeepjain200019+u' || replace(id::text, '-', '') || '@gmail.com');

-- 2) Tenant contact email (college / group record)
UPDATE tenants
SET
  email = 'sandeepjain200019@gmail.com',
  updated_at = NOW()
WHERE email IS NOT NULL
  AND trim(email) <> ''
  AND lower(email) <> 'sandeepjain200019@gmail.com';

-- 3) Employer profile contact email
UPDATE employer_profiles
SET
  contact_email = 'sandeepjain200019@gmail.com',
  updated_at = NOW()
WHERE contact_email IS NOT NULL
  AND trim(contact_email) <> ''
  AND lower(contact_email) <> 'sandeepjain200019@gmail.com';

-- 4) Super-admin UI settings JSON (support + from) on all tenant rows
UPDATE tenants
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{adminSettings}',
    COALESCE(settings->'adminSettings', '{}'::jsonb)
      || jsonb_build_object(
        'supportEmail', 'sandeepjain200019@gmail.com',
        'fromEmail', 'sandeepjain200019@gmail.com'
      ),
    true
  ),
  updated_at = NOW();

-- 5) Audit export rows (only if 013_audit_exports… has been applied)
DO $$
BEGIN
  IF to_regclass('public.audit_report_exports') IS NOT NULL THEN
    UPDATE audit_report_exports
    SET emailed_to = 'sandeepjain200019@gmail.com'
    WHERE emailed_to IS NOT NULL
      AND trim(emailed_to) <> ''
      AND lower(emailed_to) <> 'sandeepjain200019@gmail.com';
  END IF;
END $$;
