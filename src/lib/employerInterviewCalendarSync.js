import { query } from '@/lib/db';

export function buildEmployerInterviewCalendarDescription({
  employerUserId,
  time,
  mode,
  panelNames,
  assigned,
  planId,
  opportunityKind,
  opportunityTitle,
  opportunityId,
}) {
  return [
    'Employer interview slot',
    opportunityKind && opportunityTitle
      ? `Opening (${opportunityKind}): ${opportunityTitle}`
      : opportunityId
        ? `Opening id: ${opportunityId}`
        : '',
    time ? `Time: ${time}` : '',
    mode ? `Mode: ${mode}` : '',
    panelNames ? `Panel: ${panelNames}` : '',
    assigned != null && assigned !== '' ? `Assigned: ${assigned}` : '',
    `Plan: ${planId}`,
    `Employer user: ${employerUserId}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function planIdLikePattern(planId) {
  return `%Plan: ${planId}%`;
}

export async function deleteEmployerInterviewCalendarSlot(tenantId, planId) {
  await query(
    `DELETE FROM college_calendar
     WHERE tenant_id = $1::uuid
       AND event_type = 'interview_slot'
       AND description LIKE $2`,
    [tenantId, planIdLikePattern(planId)],
  );
}

export async function updateEmployerInterviewCalendarSlot({
  tenantId,
  planId,
  title,
  dateYmd,
  description,
}) {
  const updated = await query(
    `UPDATE college_calendar
     SET title = $1,
         start_date = $2::date,
         end_date = $2::date,
         description = $3
     WHERE tenant_id = $4::uuid
       AND event_type = 'interview_slot'
       AND description LIKE $5
     RETURNING id`,
    [title, dateYmd, description, tenantId, planIdLikePattern(planId)],
  );
  return updated.rows.length > 0;
}

export async function insertEmployerInterviewCalendarSlot({
  tenantId,
  title,
  dateYmd,
  description,
}) {
  await query(
    `INSERT INTO college_calendar (tenant_id, title, event_type, start_date, end_date, is_blocking, description)
     VALUES ($1::uuid, $2, 'interview_slot', $3::date, $3::date, false, $4)`,
    [tenantId, title, dateYmd, description],
  );
}
