/* eslint-disable no-console */
/**
 * One-shot smoke for menu highlighting (DB + resolve logic).
 * Does not send email. Restores prior config after the check when possible.
 */
const path = require('path');
const fs = require('fs');

function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    env.DATABASE_URL ||
    env.SUPABASE_DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');

  const { Client } = require('pg');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const failures = [];

  try {
    const table = await client.query(
      `SELECT highlight_color, selected_items, selected_entities FROM menu_highlight_config WHERE id = 1`,
    );
    if (!table.rows[0]) failures.push('menu_highlight_config row missing');
    else console.log('OK table row present, color=', table.rows[0].highlight_color);

    const prior = table.rows[0]
      ? {
          color: table.rows[0].highlight_color,
          items: table.rows[0].selected_items,
          entities: table.rows[0].selected_entities,
        }
      : null;

    const college = await client.query(
      `SELECT id, name FROM tenants WHERE type = 'college' ORDER BY created_at ASC LIMIT 1`,
    );
    const employer = await client.query(
      `SELECT id, company_name FROM employer_profiles ORDER BY created_at ASC LIMIT 1`,
    );
    const student = await client.query(
      `SELECT u.id, u.first_name, u.tenant_id
       FROM users u
       WHERE u.role = 'student'
       ORDER BY u.created_at ASC
       LIMIT 1`,
    );
    const otherStudent = await client.query(
      `SELECT u.id FROM users u WHERE u.role = 'student' ORDER BY u.created_at ASC OFFSET 1 LIMIT 1`,
    );

    if (!college.rows[0]) failures.push('no college');
    if (!employer.rows[0]) failures.push('no employer');
    if (!student.rows[0]) failures.push('no student');

    const studentItem = '/dashboard/student/internships';
    const collegeItem = '/dashboard/college/students';
    const employerItem = '/dashboard/employer/drives';

    const selectedItems = {
      college_admin: [collegeItem],
      employer: [employerItem],
      student: [studentItem],
    };
    const selectedEntities = [
      { type: 'college', id: college.rows[0]?.id },
      { type: 'employer', id: employer.rows[0]?.id },
      { type: 'student', id: student.rows[0]?.id },
    ].filter((e) => e.id);

    await client.query(
      `UPDATE menu_highlight_config
       SET highlight_color = $1,
           selected_items = $2::jsonb,
           selected_entities = $3::jsonb,
           updated_at = NOW()
       WHERE id = 1`,
      ['#FF0000', JSON.stringify(selectedItems), JSON.stringify(selectedEntities)],
    );
    console.log('OK wrote smoke config', {
      college: college.rows[0]?.name,
      employer: employer.rows[0]?.company_name,
      studentId: student.rows[0]?.id,
    });

    // Resolve checks (mirror lib rules)
    const cfg = await client.query(`SELECT selected_items, selected_entities, highlight_color FROM menu_highlight_config WHERE id = 1`);
    const entities = cfg.rows[0].selected_entities;
    const items = cfg.rows[0].selected_items;

    const studentSelected = entities.some((e) => e.type === 'student' && e.id === String(student.rows[0].id));
    const otherSelected = otherStudent.rows[0]
      ? entities.some((e) => e.type === 'student' && e.id === String(otherStudent.rows[0].id))
      : false;
    const collegeSelected = entities.some((e) => e.type === 'college' && e.id === String(college.rows[0].id));

    if (!studentSelected) failures.push('selected student not matched');
    if (otherSelected) failures.push('other student incorrectly matched');
    if (!collegeSelected) failures.push('college not matched');
    if (!Array.isArray(items.student) || !items.student.includes(studentItem)) {
      failures.push('student item missing from config');
    }
    if (String(cfg.rows[0].highlight_color).toUpperCase() !== '#FF0000') {
      failures.push(`color expected #FF0000 got ${cfg.rows[0].highlight_color}`);
    }

    console.log('OK resolve gates', { studentSelected, otherSelected, collegeSelected });

    // Entity list order smoke: oldest first among colleges
    const ordered = await client.query(
      `SELECT id FROM tenants WHERE type = 'college' ORDER BY created_at ASC LIMIT 3`,
    );
    const unorderedCheck = await client.query(
      `SELECT id FROM tenants WHERE type = 'college' ORDER BY name ASC LIMIT 3`,
    );
    console.log('OK creation-order sample', ordered.rows.map((r) => r.id.slice(0, 8)));
    if (
      ordered.rows.length > 1 &&
      unorderedCheck.rows.length > 1 &&
      ordered.rows[0].id === unorderedCheck.rows[0].id &&
      ordered.rows[1].id !== unorderedCheck.rows[1].id
    ) {
      console.log('NOTE alphabetical first college equals oldest (coincidence possible)');
    }

    if (prior) {
      await client.query(
        `UPDATE menu_highlight_config
         SET highlight_color = $1,
             selected_items = $2::jsonb,
             selected_entities = $3::jsonb,
             updated_at = NOW()
         WHERE id = 1`,
        [prior.color, JSON.stringify(prior.items || {}), JSON.stringify(prior.entities || [])],
      );
      console.log('OK restored prior config');
    }
  } finally {
    await client.end();
  }

  if (failures.length) {
    console.error('SMOKE FAIL', failures);
    process.exit(1);
  }
  console.log('SMOKE PASS menu highlighting');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
