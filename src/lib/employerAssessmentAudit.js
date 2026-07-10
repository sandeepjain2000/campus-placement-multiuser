/**
 * Dual-write assessment activity: employer_assessment_change_log (per upload) +
 * audit_logs (tenant — visible under college Audit Reports).
 */

export const ASSESS_AUDIT_ACTION = {
  CSV_UPLOAD: 'ASSESS_CSV',
  ROWS_SAVE: 'ASSESS_SAVE',
  ROW_ADD: 'ASSESS_ADD',
};

const KIND_TO_AUDIT_ACTION = {
  csv_upload: ASSESS_AUDIT_ACTION.CSV_UPLOAD,
  rows_save: ASSESS_AUDIT_ACTION.ROWS_SAVE,
  row_add: ASSESS_AUDIT_ACTION.ROW_ADD,
};

/**
 * @param {import('pg').PoolClient} client
 * @param {object} p
 * @param {string} p.tenantId
 * @param {string|null} p.userId
 * @param {string} p.uploadId
 * @param {string|null} [p.rowId]
 * @param {'csv_upload'|'rows_save'|'row_add'} p.kind
 * @param {string} p.summary
 * @param {object} [p.details]
 */
export async function writeEmployerAssessmentAudit(client, p) {
  const { tenantId, userId, uploadId, rowId, kind, summary, details = {} } = p;
  const auditAction = KIND_TO_AUDIT_ACTION[kind];
  if (!auditAction) throw new Error(`Unknown assessment audit kind: ${kind}`);

  await client.query(
    `INSERT INTO employer_assessment_change_log
       (upload_id, row_id, actor_user_id, action, summary, details)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb)`,
    [uploadId, rowId || null, userId || null, kind, summary, JSON.stringify(details)],
  );

  const { old_values: _oldForLog, ...detailsForNew } = details;
  const newValuesPayload = { summary, ...detailsForNew };

  await client.query(
    `INSERT INTO audit_logs
       (user_id, tenant_id, action, entity_type, entity_id, old_values, new_values, ip_address)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7::jsonb, NULL)`,
    [
      userId || null,
      tenantId,
      auditAction,
      'employer_assessment',
      uploadId,
      details.old_values != null ? details.old_values : null,
      newValuesPayload,
    ],
  );
}
