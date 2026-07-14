const fs = require('fs');
const path = require('path');
const { DEMO_LOGINS } = require('@/lib/demoLogins');

/** Seed sources that must keep every login-picker demo email functional. */
const SEED_SOURCES = [
  'db/seed.sql',
  'db/migrations/024_live_colleges_students_employers.sql',
  'db/migrations/074_student_alumni_jobs.sql',
  'db/migrations/111_ensure_placement_committee_demo_accounts.sql',
];

describe('demo login seed integrity', () => {
  const corpus = SEED_SOURCES.map((rel) => {
    const abs = path.join(process.cwd(), rel);
    expect(fs.existsSync(abs)).toBe(true);
    return fs.readFileSync(abs, 'utf8');
  }).join('\n');

  it('lists every DEMO_LOGINS email in seed SQL', () => {
    const missing = DEMO_LOGINS.map((row) => row.email).filter(
      (email) => !corpus.includes(`'${email}'`) && !corpus.includes(`"${email}"`),
    );
    expect(missing).toEqual([]);
  });

  it('includes all seven Placement Committee demo emails', () => {
    const committeeEmails = DEMO_LOGINS.filter((row) => row.group === 'placement_committee').map(
      (row) => row.email,
    );
    expect(committeeEmails).toHaveLength(7);
    for (const email of committeeEmails) {
      expect(corpus).toContain(`'${email}'`);
    }
  });
});
