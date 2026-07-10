/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const showcaseRows = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    naacGrade: 'A++',
    nirfRank: 1,
    accreditation: 'UGC, AICTE',
    institutionShowcase: {
      nbaAccreditedPrograms: 'CSE, ECE, Mechanical (Tier-1)',
      nirfCategoryRanks: 'Overall #1, Engineering #1, Innovation #2',
      notableAlumni: 'Sundar Pichai, Arvind Krishna, Kris Gopalakrishnan',
      patentCount: 820,
      startupCount: 310,
      incubationCells: 'IITM Incubation Cell, IITM Research Park',
      researchCenters: 'AI4Bharat, Center for NEMS, National Center for Combustion R&D',
    },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    naacGrade: 'A+',
    nirfRank: 9,
    accreditation: 'UGC, AICTE',
    institutionShowcase: {
      nbaAccreditedPrograms: 'CSE, ECE, EEE, Civil, Mechanical',
      nirfCategoryRanks: 'Engineering Top-10, Architecture Top-25',
      notableAlumni: 'N. Chandrasekaran, S. Venkatachary, M. Lakshmanan',
      patentCount: 240,
      startupCount: 95,
      incubationCells: 'NIT Trichy Incubation & Entrepreneurship Hub',
      researchCenters: 'Energy & Environment, Robotics, Materials & Manufacturing',
    },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    naacGrade: 'A+',
    nirfRank: 25,
    accreditation: 'UGC, AICTE',
    institutionShowcase: {
      nbaAccreditedPrograms: 'CSE, ECE, EEE, Chemical, Mechanical',
      nirfCategoryRanks: 'University Top-30, Engineering Top-30',
      notableAlumni: 'Sanjay Mehrotra, Prithviraj Chavan, Baba Kalyani',
      patentCount: 310,
      startupCount: 180,
      incubationCells: 'BITS BioCyTiH Foundation, PIEDE Society',
      researchCenters: 'Photonics, Data Science, Advanced Materials',
    },
  },
];

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    out[k] = v;
  }
  return out;
}

function getDbConfig() {
  const env = readEnvLocal();
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    env.DATABASE_URL ||
    env.SUPABASE_DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL or SUPABASE_DATABASE_URL is required (.env.local supported).');
  }
  return { connectionString: rawUrl, ssl: { rejectUnauthorized: false } };
}

async function main() {
  const client = new Client(getDbConfig());
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const row of showcaseRows) {
      await client.query(
        `UPDATE tenants
         SET naac_grade = $1,
             nirf_rank = $2,
             accreditation = $3,
             settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{institutionShowcase}', $4::jsonb, true),
             updated_at = NOW()
         WHERE id = $5::uuid`,
        [
          row.naacGrade,
          row.nirfRank,
          row.accreditation,
          JSON.stringify(row.institutionShowcase),
          row.id,
        ],
      );
      console.log(`Updated college showcase: ${row.id}`);
    }
    await client.query('COMMIT');
    console.log('College showcase upsert complete.');
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
