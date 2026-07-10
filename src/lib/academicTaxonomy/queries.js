import { query } from '@/lib/db';
import { parseCollegeTaxonomySettings } from '@/lib/academicTaxonomy/tenantSettings';
import { mapProgramToStudentFields, resolveStudentEligibilityGroupCode } from '@/lib/academicTaxonomy/mapProgram';

export { mapProgramToStudentFields, resolveStudentEligibilityGroupCode };

/**
 * @param {ReturnType<typeof parseCollegeTaxonomySettings>} taxonomySettings
 */
export function programFilterSql(taxonomySettings, paramOffset = 1) {
  if (!taxonomySettings.usePlatformDefaults || !taxonomySettings.restrictProgramsToDefaults) {
    if (taxonomySettings.enabledProgramCodes?.length) {
      return {
        clause: `AND p.code = ANY($${paramOffset}::text[])`,
        params: [taxonomySettings.enabledProgramCodes],
      };
    }
    return { clause: '', params: [] };
  }
  return {
    clause: 'AND p.is_engineering_default = true',
    params: [],
  };
}

export async function loadAcademicTaxonomyTree({ taxonomySettings } = {}) {
  const settings = taxonomySettings || parseCollegeTaxonomySettings({});

  const filter = programFilterSql(settings);

  const [levels, degrees, categories, disciplines, specializations, groups, programsRes] = await Promise.all([
    query(`SELECT code, name, sort_order FROM taxonomy_degree_levels ORDER BY sort_order, name`),
    query(
      `SELECT d.code, d.name, d.sort_order, d.is_engineering_default, l.code AS level_code, l.name AS level_name
       FROM taxonomy_degrees d
       INNER JOIN taxonomy_degree_levels l ON l.id = d.level_id
       ORDER BY l.sort_order, d.sort_order, d.name`,
    ),
    query(`SELECT code, name, sort_order FROM taxonomy_discipline_categories ORDER BY sort_order, name`),
    query(
      `SELECT d.code, d.name, d.sort_order, d.is_engineering_default, c.code AS category_code, c.name AS category_name
       FROM taxonomy_disciplines d
       LEFT JOIN taxonomy_discipline_categories c ON c.id = d.category_id
       ORDER BY d.sort_order, d.name`,
    ),
    query(
      `SELECT s.code, s.name, s.sort_order, d.code AS discipline_code
       FROM taxonomy_specializations s
       LEFT JOIN taxonomy_disciplines d ON d.id = s.discipline_id
       ORDER BY s.sort_order, s.name`,
    ),
    query(
      `SELECT code, name, sort_order, is_engineering_default FROM taxonomy_eligibility_groups ORDER BY sort_order, name`,
    ),
    query(
      `SELECT
         p.code,
         p.display_name,
         p.aliases,
         p.sort_order,
         p.is_engineering_default,
         d.code AS degree_code,
         d.name AS degree_name,
         disc.code AS discipline_code,
         disc.name AS discipline_name,
         s.code AS specialization_code,
         s.name AS specialization_name,
         g.code AS eligibility_group_code,
         g.name AS eligibility_group_name
       FROM taxonomy_academic_programs p
       INNER JOIN taxonomy_degrees d ON d.id = p.degree_id
       INNER JOIN taxonomy_disciplines disc ON disc.id = p.discipline_id
       LEFT JOIN taxonomy_specializations s ON s.id = p.specialization_id
       INNER JOIN taxonomy_eligibility_groups g ON g.id = p.eligibility_group_id
       WHERE p.is_active = true ${filter.clause}
       ORDER BY p.sort_order, p.display_name`,
      filter.params,
    ),
  ]);

  return {
    degreeLevels: levels.rows,
    degrees: degrees.rows,
    disciplineCategories: categories.rows,
    disciplines: disciplines.rows,
    specializations: specializations.rows,
    eligibilityGroups: groups.rows,
    academicPrograms: programsRes.rows,
    settings,
  };
}

export async function loadAcademicProgramByCode(programCode) {
  const code = String(programCode || '').trim();
  if (!code) return null;
  const res = await query(
    `SELECT
       p.code,
       p.display_name,
       p.aliases,
       d.code AS degree_code,
       d.name AS degree_name,
       disc.code AS discipline_code,
       disc.name AS discipline_name,
       s.code AS specialization_code,
       s.name AS specialization_name,
       g.code AS eligibility_group_code,
       g.name AS eligibility_group_name
     FROM taxonomy_academic_programs p
     INNER JOIN taxonomy_degrees d ON d.id = p.degree_id
     INNER JOIN taxonomy_disciplines disc ON disc.id = p.discipline_id
     LEFT JOIN taxonomy_specializations s ON s.id = p.specialization_id
     INNER JOIN taxonomy_eligibility_groups g ON g.id = p.eligibility_group_id
     WHERE p.code = $1 AND p.is_active = true
     LIMIT 1`,
    [code],
  );
  return res.rows[0] || null;
}
