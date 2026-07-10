#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed platform academic taxonomy (run after db:migrate:096).
 * Usage: node scripts/seed_academic_taxonomy.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const {
  TAXONOMY_DEGREE_LEVELS,
  TAXONOMY_DEGREES,
  TAXONOMY_DISCIPLINE_CATEGORIES,
  TAXONOMY_DISCIPLINES,
  TAXONOMY_SPECIALIZATIONS,
  TAXONOMY_ELIGIBILITY_GROUPS,
  TAXONOMY_ACADEMIC_PROGRAMS,
} = require('../src/lib/academicTaxonomy/seedData.js');

function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
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

function getDatabaseUrl() {
  const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
  return (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    env.DATABASE_URL ||
    env.SUPABASE_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/campus_placement'
  );
}

async function upsertByCode(client, table, row, columns) {
  const keys = Object.keys(row);
  const vals = keys.map((k) => row[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const updates = columns.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  const res = await client.query(
    `INSERT INTO ${table} (${keys.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (code) DO UPDATE SET ${updates}
     RETURNING id, code`,
    vals,
  );
  return res.rows[0];
}

async function main() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: getDatabaseUrl().includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const levelIds = new Map();
    for (const row of TAXONOMY_DEGREE_LEVELS) {
      const r = await upsertByCode(
        client,
        'taxonomy_degree_levels',
        { code: row.code, name: row.name, sort_order: row.sortOrder ?? 0 },
        ['name', 'sort_order'],
      );
      levelIds.set(row.code, r.id);
    }

    const degreeIds = new Map();
    for (const row of TAXONOMY_DEGREES) {
      const levelId = levelIds.get(row.levelCode);
      if (!levelId) throw new Error(`Missing level ${row.levelCode}`);
      const r = await upsertByCode(
        client,
        'taxonomy_degrees',
        {
          code: row.code,
          level_id: levelId,
          name: row.name,
          sort_order: row.sortOrder ?? 0,
          is_engineering_default: Boolean(row.engineeringDefault),
        },
        ['level_id', 'name', 'sort_order', 'is_engineering_default'],
      );
      degreeIds.set(row.code, r.id);
    }

    const categoryIds = new Map();
    for (const row of TAXONOMY_DISCIPLINE_CATEGORIES) {
      const r = await upsertByCode(
        client,
        'taxonomy_discipline_categories',
        { code: row.code, name: row.name, sort_order: row.sortOrder ?? 0 },
        ['name', 'sort_order'],
      );
      categoryIds.set(row.code, r.id);
    }

    const disciplineIds = new Map();
    for (const row of TAXONOMY_DISCIPLINES) {
      const categoryId = row.categoryCode ? categoryIds.get(row.categoryCode) : null;
      const r = await upsertByCode(
        client,
        'taxonomy_disciplines',
        {
          code: row.code,
          category_id: categoryId,
          name: row.name,
          sort_order: row.sortOrder ?? 0,
          is_engineering_default: Boolean(row.engineeringDefault),
        },
        ['category_id', 'name', 'sort_order', 'is_engineering_default'],
      );
      disciplineIds.set(row.code, r.id);
    }

    const specializationIds = new Map();
    for (const row of TAXONOMY_SPECIALIZATIONS) {
      const disciplineId = row.disciplineCode ? disciplineIds.get(row.disciplineCode) : null;
      const r = await upsertByCode(
        client,
        'taxonomy_specializations',
        {
          code: row.code,
          discipline_id: disciplineId,
          name: row.name,
          sort_order: row.sortOrder ?? 0,
        },
        ['discipline_id', 'name', 'sort_order'],
      );
      specializationIds.set(row.code, r.id);
    }

    const groupIds = new Map();
    for (const row of TAXONOMY_ELIGIBILITY_GROUPS) {
      const r = await upsertByCode(
        client,
        'taxonomy_eligibility_groups',
        {
          code: row.code,
          name: row.name,
          sort_order: row.sortOrder ?? 0,
          is_engineering_default: Boolean(row.engineeringDefault),
        },
        ['name', 'sort_order', 'is_engineering_default'],
      );
      groupIds.set(row.code, r.id);
    }

    for (const row of TAXONOMY_ACADEMIC_PROGRAMS) {
      const degreeId = degreeIds.get(row.degreeCode);
      const disciplineId = disciplineIds.get(row.disciplineCode);
      const eligibilityGroupId = groupIds.get(row.eligibilityGroupCode);
      const specializationId = row.specializationCode
        ? specializationIds.get(row.specializationCode)
        : null;
      if (!degreeId || !disciplineId || !eligibilityGroupId) {
        throw new Error(`Program ${row.code} missing FK refs`);
      }
      await upsertByCode(
        client,
        'taxonomy_academic_programs',
        {
          code: row.code,
          degree_id: degreeId,
          discipline_id: disciplineId,
          specialization_id: specializationId,
          eligibility_group_id: eligibilityGroupId,
          display_name: row.displayName,
          aliases: row.aliases || [],
          sort_order: row.sortOrder ?? 0,
          is_engineering_default: Boolean(row.engineeringDefault),
          is_active: true,
        },
        [
          'degree_id',
          'discipline_id',
          'specialization_id',
          'eligibility_group_id',
          'display_name',
          'aliases',
          'sort_order',
          'is_engineering_default',
          'is_active',
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `Seeded taxonomy: ${TAXONOMY_DEGREES.length} degrees, ${TAXONOMY_DISCIPLINES.length} disciplines, ${TAXONOMY_ACADEMIC_PROGRAMS.length} programs.`,
    );
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
