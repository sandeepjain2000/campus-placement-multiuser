-- Richer marketplace demo catalog (idempotent by provider/service name).

-- Providers
INSERT INTO marketplace_providers (name, category, tagline, description, website, contact_email, is_active)
SELECT 'CampusApt Prep', 'aptitude_tests',
  'Campus-ready aptitude and analytical assessments',
  'Standardized aptitude batteries for placement seasons — numerical, logical, and verbal modules with campus batch scheduling.',
  'https://example.com/campusapt', 'partners@campusapt.example', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_providers WHERE LOWER(name) = LOWER('CampusApt Prep'));

INSERT INTO marketplace_providers (name, category, tagline, description, website, contact_email, is_active)
SELECT 'CodeForge Assess', 'coding_assessments',
  'Timed coding rounds for campus hiring',
  'Online coding assessments with language packs, plagiarism signals, and CSV score export for PlacementHub hiring results.',
  'https://example.com/codeforge', 'campus@codeforge.example', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_providers WHERE LOWER(name) = LOWER('CodeForge Assess'));

INSERT INTO marketplace_providers (name, category, tagline, description, website, contact_email, is_active)
SELECT 'ProctorShield', 'proctoring',
  'Secure online exam proctoring',
  'Browser lockdown, identity checks, and live/AI invigilation windows for remote aptitude and coding rounds.',
  'https://example.com/proctorshield', 'sales@proctorshield.example', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_providers WHERE LOWER(name) = LOWER('ProctorShield'));

INSERT INTO marketplace_providers (name, category, tagline, description, website, contact_email, is_active)
SELECT 'PlacementReady Academy', 'training',
  'Pre-placement prep cohorts',
  'Aptitude brush-up, resume workshops, and mock interview packs scheduled around campus drive calendars.',
  'https://example.com/placementready', 'hello@placementready.example', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_providers WHERE LOWER(name) = LOWER('PlacementReady Academy'));

INSERT INTO marketplace_providers (name, category, tagline, description, website, contact_email, is_active)
SELECT 'CareerLink Advisors', 'career_services',
  'Employer branding and campus career booths',
  'On-campus career fair booths, employer brand sessions, and student mentoring hours for partner companies.',
  'https://example.com/careerlink', 'partners@careerlink.example', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_providers WHERE LOWER(name) = LOWER('CareerLink Advisors'));

-- CampusApt services
INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, 'Batch Aptitude Assessment (300 seats)',
  'One campus cohort of up to 300 students. Includes online proctoring window coordination and score CSV export for PlacementHub assessment uploads.',
  45000.00, 'per_batch', true, true, true, 10
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('CampusApt Prep')
  AND NOT EXISTS (
    SELECT 1 FROM marketplace_services s
    WHERE s.provider_id = p.id AND LOWER(s.title) = LOWER('Batch Aptitude Assessment (300 seats)')
  );

INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, 'Aptitude Retake Window (50 seats)',
  'Follow-up seat pack for absentees and retakes within 14 days of the primary batch.',
  12000.00, 'per_batch', true, false, true, 20
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('CampusApt Prep')
  AND NOT EXISTS (
    SELECT 1 FROM marketplace_services s
    WHERE s.provider_id = p.id AND LOWER(s.title) = LOWER('Aptitude Retake Window (50 seats)')
  );

-- CodeForge services
INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, 'Campus Coding Round (200 seats)',
  'Two-hour coding assessment with auto-scoring and rank export.',
  65000.00, 'per_batch', true, true, true, 10
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('CodeForge Assess')
  AND NOT EXISTS (
    SELECT 1 FROM marketplace_services s
    WHERE s.provider_id = p.id AND LOWER(s.title) = LOWER('Campus Coding Round (200 seats)')
  );

INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, 'Employer Take-Home Pack',
  'Reusable take-home coding pack for employer shortlists — grading dashboard and plagiarism report.',
  28000.00, 'one_time', false, true, true, 20
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('CodeForge Assess')
  AND NOT EXISTS (
    SELECT 1 FROM marketplace_services s
    WHERE s.provider_id = p.id AND LOWER(s.title) = LOWER('Employer Take-Home Pack')
  );

-- ProctorShield services
INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, 'Live Proctoring Add-on (per student)',
  'Live + AI proctoring overlay for an existing aptitude or coding session.',
  150.00, 'per_student', true, true, true, 10
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('ProctorShield')
  AND NOT EXISTS (
    SELECT 1 FROM marketplace_services s
    WHERE s.provider_id = p.id AND LOWER(s.title) = LOWER('Live Proctoring Add-on (per student)')
  );

-- PlacementReady services
INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, 'Pre-Placement Bootcamp (weekend)',
  'Saturday–Sunday aptitude + soft-skills cohort for final-year students.',
  95000.00, 'per_batch', true, false, true, 10
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('PlacementReady Academy')
  AND NOT EXISTS (
    SELECT 1 FROM marketplace_services s
    WHERE s.provider_id = p.id AND LOWER(s.title) = LOWER('Pre-Placement Bootcamp (weekend)')
  );

-- CareerLink services
INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, 'Campus Branding Day',
  'Half-day employer brand session with auditorium slot coordination and student RSVP list.',
  40000.00, 'one_time', true, true, true, 10
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('CareerLink Advisors')
  AND NOT EXISTS (
    SELECT 1 FROM marketplace_services s
    WHERE s.provider_id = p.id AND LOWER(s.title) = LOWER('Campus Branding Day')
  );
