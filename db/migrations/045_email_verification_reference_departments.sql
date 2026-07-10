-- Email verification before activation (new signups); existing users grandfathered.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

UPDATE users
SET email_verified_at = NOW()
WHERE email_verified_at IS NULL;

-- Global department catalog (single dropdown; extend later with tenant_id if needed)
CREATE TABLE IF NOT EXISTS reference_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT reference_departments_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_reference_departments_sort ON reference_departments (sort_order, name);

INSERT INTO reference_departments (name, sort_order) VALUES
  ('Computer Science & Engineering', 10),
  ('Electronics & Communication Engineering', 20),
  ('Electrical & Electronics Engineering', 30),
  ('Mechanical Engineering', 40),
  ('Civil Engineering', 50),
  ('Chemical Engineering', 60),
  ('Aerospace / Aeronautical Engineering', 70),
  ('Information Technology', 80),
  ('Biotechnology / Bioengineering', 90),
  ('Mathematics & Computing', 100),
  ('Physics', 110),
  ('Chemistry', 120),
  ('Business Administration / MBA', 130),
  ('Economics', 140),
  ('Architecture', 150),
  ('Pharmacy', 160),
  ('Other / Interdisciplinary', 990)
ON CONFLICT (name) DO NOTHING;
