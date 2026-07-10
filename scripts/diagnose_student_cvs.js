/* eslint-disable no-console */
const path = require('path');
const { Client } = require('pg');
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

const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
const url = process.env.DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
const email = process.argv[2] || 'arjun.verma@iitm.edu';

async function hasColumn(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column],
  );
  return r.rows.length > 0;
}

async function main() {
  if (!url) throw new Error('No DATABASE_URL');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const user = await client.query(
    `SELECT id, email, role, tenant_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  console.log('USER', user.rows[0] || null);

  if (!user.rows[0]) {
    await client.end();
    return;
  }

  const sp = await client.query(
    `SELECT id, roll_number, resume_url, tenant_id FROM student_profiles WHERE user_id = $1::uuid`,
    [user.rows[0].id],
  );
  console.log('PROFILE', sp.rows[0] || null);
  const studentId = sp.rows[0]?.id;

  const cvsReady = await hasColumn(client, 'student_cvs', 'label');
  console.log('student_cvs table ready:', cvsReady);

  if (studentId) {
    const docs = await client.query(
      `SELECT document_type, document_name, file_url FROM student_documents WHERE student_id = $1::uuid`,
      [studentId],
    );
    console.log('DOCUMENTS', docs.rows);

    if (cvsReady) {
      const verReady = await hasColumn(client, 'student_cvs', 'cv_verified_at');
      const verSel = verReady ? ', cv_verified_at' : '';
      const cvs = await client.query(
        `SELECT id, label, file_url, is_default, archived_at${verSel}
         FROM student_cvs WHERE student_id = $1::uuid`,
        [studentId],
      );
      console.log('CVS', cvs.rows);
    }

    const appCol = await hasColumn(client, 'applications', 'student_cv_id');
    const progCol = await hasColumn(client, 'program_applications', 'student_cv_id');
    console.log('usage columns:', { applications: appCol, program_applications: progCol });

    if (cvsReady && studentId) {
      try {
        const usageParts = [];
        if (progCol) usageParts.push('(SELECT COUNT(*)::int FROM program_applications pa WHERE pa.student_cv_id = sc.id)');
        if (appCol) usageParts.push('(SELECT COUNT(*)::int FROM applications a WHERE a.student_cv_id = sc.id)');
        const usageSql = usageParts.length
          ? `(${usageParts.join(' + ')}) AS used_on_applications`
          : '0::int AS used_on_applications';
        const verReady = await hasColumn(client, 'student_cvs', 'cv_verified_at');
        const verCols = verReady ? ', sc.cv_verified_at, sc.cv_verified_by' : '';
        const r = await client.query(
          `SELECT sc.id, sc.label${verCols}, ${usageSql}
           FROM student_cvs sc WHERE sc.student_id = $1::uuid AND sc.archived_at IS NULL`,
          [studentId],
        );
        console.log('API_LIST_QUERY_OK', r.rows);
      } catch (e) {
        console.error('API_LIST_QUERY_FAIL', e.message, e.code);
      }
    }

    const tenantId = sp.rows[0]?.tenant_id || user.rows[0].tenant_id;
    const t = await client.query(`SELECT settings FROM tenants WHERE id = $1::uuid`, [tenantId]);
    console.log('TENANT_CV_SETTINGS', {
      requireCvVerification: Boolean(t.rows[0]?.settings?.requireCvVerification),
    });
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
