import { query } from '@/lib/db';
import { hasColumn } from '@/lib/migrationReady';
import {
  deleteEmailTemplateOverride,
  loadSystemEmailTemplateRow,
  upsertEmailTemplateOverride,
} from '@/lib/emailTemplateResolve';

let versionsTableReady = null;

/** @returns {Promise<boolean>} */
export async function hasSystemEmailTemplateVersionsTable() {
  if (versionsTableReady != null) return versionsTableReady;
  versionsTableReady = await hasColumn('system_email_template_versions', 'version_number');
  return versionsTableReady;
}

/**
 * @param {string} templateKey
 */
export async function listSystemEmailTemplateVersions(templateKey) {
  if (!(await hasSystemEmailTemplateVersionsTable())) return [];
  try {
    const r = await query(
      `SELECT id, template_key, version_number, label, subject_template, body_template,
              is_baseline, created_at
       FROM system_email_template_versions
       WHERE template_key = $1
       ORDER BY version_number ASC`,
      [templateKey],
    );
    const live = await loadSystemEmailTemplateRow(templateKey);
    return r.rows.map((row) => ({
      ...row,
      is_current: Boolean(
        live
        && live.subject_template === row.subject_template
        && live.body_template === row.body_template,
      ),
    }));
  } catch (e) {
    console.warn('[emailTemplateVersions] list failed:', e.message);
    return [];
  }
}

/**
 * @param {string} versionId
 */
export async function loadSystemEmailTemplateVersionById(versionId) {
  if (!(await hasSystemEmailTemplateVersionsTable())) return null;
  const r = await query(
    `SELECT id, template_key, version_number, label, subject_template, body_template,
            is_baseline, created_at
     FROM system_email_template_versions
     WHERE id = $1::uuid`,
    [versionId],
  );
  return r.rows[0] || null;
}

/**
 * @param {string} templateKey
 * @param {{ subject_template: string, body_template: string, updated_by?: string | null }} content
 * @param {string | null} [userId]
 */
export async function ensureSystemEmailTemplateBaseline(templateKey, content, userId = null) {
  if (!(await hasSystemEmailTemplateVersionsTable())) return null;
  const existing = await query(
    `SELECT id FROM system_email_template_versions WHERE template_key = $1 LIMIT 1`,
    [templateKey],
  );
  if (existing.rows.length) return existing.rows[0];

  const r = await query(
    `INSERT INTO system_email_template_versions (
       template_key, version_number, label, subject_template, body_template, is_baseline, created_by
     ) VALUES ($1, 1, 'Baseline', $2, $3, true, $4::uuid)
     ON CONFLICT (template_key, version_number) DO NOTHING
     RETURNING id, template_key, version_number, is_baseline`,
    [templateKey, content.subject_template, content.body_template, userId || content.updated_by || null],
  );
  return r.rows[0] || null;
}

/**
 * Restore an org override to a retained system version (or clear override if it matches live current).
 * @param {{
 *   scopeType: 'college'|'employer',
 *   scopeId: string,
 *   templateKey: string,
 *   versionId: string,
 *   userId: string,
 * }} opts
 */
export async function restoreOrgEmailTemplateToSystemVersion(opts) {
  const version = await loadSystemEmailTemplateVersionById(opts.versionId);
  if (!version) {
    const err = new Error('System template version not found');
    err.status = 404;
    throw err;
  }
  if (version.template_key !== opts.templateKey) {
    const err = new Error('Version does not belong to this template');
    err.status = 400;
    throw err;
  }

  const live = await loadSystemEmailTemplateRow(opts.templateKey);
  const matchesLive = Boolean(
    live
    && live.subject_template === version.subject_template
    && live.body_template === version.body_template,
  );

  if (matchesLive) {
    await deleteEmailTemplateOverride(opts.scopeType, opts.scopeId, opts.templateKey);
    return {
      mode: 'platform_current',
      version,
      template: {
        template_key: opts.templateKey,
        subject_template: version.subject_template,
        body_template: version.body_template,
        source: 'system',
      },
    };
  }

  const row = await upsertEmailTemplateOverride(
    opts.scopeType,
    opts.scopeId,
    opts.templateKey,
    version.subject_template,
    version.body_template,
    opts.userId,
  );
  return {
    mode: 'pinned_system_version',
    version,
    template: {
      template_key: row.template_key,
      subject_template: row.subject_template,
      body_template: row.body_template,
      updated_at: row.updated_at,
      source: 'override',
    },
  };
}

/**
 * Publish a new system version and update the live platform row.
 * @param {{
 *   templateKey: string,
 *   subjectTemplate: string,
 *   bodyTemplate: string,
 *   userId: string,
 *   label?: string,
 * }} opts
 */
export async function publishSystemEmailTemplateVersion(opts) {
  const { templateKey, subjectTemplate, bodyTemplate, userId } = opts;

  const current = await loadSystemEmailTemplateRow(templateKey);
  if (!current) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }

  const versionsEnabled = await hasSystemEmailTemplateVersionsTable();
  if (versionsEnabled) {
    await ensureSystemEmailTemplateBaseline(templateKey, current, userId);

    const sameAsLive =
      current.subject_template === subjectTemplate
      && current.body_template === bodyTemplate;
    if (sameAsLive) {
      return { template: current, version: null, unchanged: true };
    }

    const maxRes = await query(
      `SELECT COALESCE(MAX(version_number), 0)::int AS max_v
       FROM system_email_template_versions WHERE template_key = $1`,
      [templateKey],
    );
    const nextNum = (maxRes.rows[0]?.max_v || 0) + 1;
    const label = opts.label?.trim() || `System v${nextNum}`;

    await query(
      `INSERT INTO system_email_template_versions (
         template_key, version_number, label, subject_template, body_template, is_baseline, created_by
       ) VALUES ($1, $2, $3, $4, $5, false, $6::uuid)`,
      [templateKey, nextNum, label, subjectTemplate, bodyTemplate, userId],
    );
  }

  const r = await query(
    `UPDATE system_email_templates
     SET subject_template = $2,
         body_template = $3,
         updated_at = NOW(),
         updated_by = $4::uuid
     WHERE template_key = $1
     RETURNING template_key, description, subject_template, body_template, updated_at`,
    [templateKey, subjectTemplate, bodyTemplate, userId],
  );

  if (r.rowCount === 0) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }

  const versions = versionsEnabled ? await listSystemEmailTemplateVersions(templateKey) : [];
  return {
    template: r.rows[0],
    version: versions.length ? versions[versions.length - 1] : null,
    unchanged: false,
  };
}
