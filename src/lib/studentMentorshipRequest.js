import { normalizeTitle } from '@/lib/validators';

export const MENTORSHIP_REQUEST_STATUSES = Object.freeze([
  'draft',
  'submitted',
  'approved',
  'rejected',
  'closed',
]);

const STUDENT_EDITABLE = new Set(['draft', 'rejected']);
const STUDENT_SUBMIT_FROM = new Set(['draft', 'rejected']);

export function mapMentorshipRequestRow(row, { volunteers = [] } = {}) {
  if (!row) return null;
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    studentProfileId: String(row.student_profile_id),
    title: row.title,
    summary: row.summary,
    topics: row.topics || null,
    preferredFormat: row.preferred_format || null,
    timeHint: row.time_hint || null,
    status: row.status,
    collegeNote: row.college_note || null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    student: row.student_roll_number
      ? {
          rollNumber: row.student_roll_number,
          name: [row.student_first_name, row.student_last_name].filter(Boolean).join(' ').trim() || null,
          department: row.student_department || null,
          batchYear: row.student_batch_year ?? null,
        }
      : undefined,
    volunteerCount: row.volunteer_count != null ? Number(row.volunteer_count) : volunteers.length,
    volunteers,
    hasVolunteered: row.has_volunteered != null ? Boolean(row.has_volunteered) : undefined,
  };
}

export function mapMentorshipVolunteerRow(row) {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    employerId: String(row.employer_id),
    companyName: row.company_name || 'Company',
    message: row.message || null,
    volunteeredAt: row.volunteered_at,
  };
}

export function validateMentorshipRequestPayload(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.title !== undefined) {
    const title = normalizeTitle(body.title);
    if (!title) return { error: 'Title is required' };
    if (title.length > 255) return { error: 'Title must be at most 255 characters' };
    out.title = title;
  }
  if (!partial || body.summary !== undefined) {
    const summary = String(body.summary || '').trim();
    if (!summary) return { error: 'Summary is required' };
    if (summary.length > 8000) return { error: 'Summary is too long' };
    out.summary = summary;
  }
  if (!partial || body.topics !== undefined) {
    const topics = String(body.topics || '').trim();
    if (topics.length > 2000) return { error: 'Topics field is too long' };
    out.topics = topics || null;
  }
  if (!partial || body.preferredFormat !== undefined) {
    const preferredFormat = String(body.preferredFormat || body.preferred_format || '').trim();
    if (preferredFormat.length > 500) return { error: 'Preferred format is too long' };
    out.preferredFormat = preferredFormat || null;
  }
  if (!partial || body.timeHint !== undefined) {
    const timeHint = String(body.timeHint || body.time_hint || '').trim();
    if (timeHint.length > 500) return { error: 'Timing hint is too long' };
    out.timeHint = timeHint || null;
  }
  return { data: out };
}

export function canStudentEditRequest(status) {
  return STUDENT_EDITABLE.has(status);
}

export function canStudentSubmitRequest(status) {
  return STUDENT_SUBMIT_FROM.has(status);
}

export function mentorshipStatusLabel(status) {
  const s = String(status || '');
  const map = {
    draft: 'Draft',
    submitted: 'Pending college review',
    approved: 'Open for mentors',
    rejected: 'Not approved',
    closed: 'Closed',
  };
  return map[s] || s.replace(/_/g, ' ');
}

export const MENTORSHIP_REQUEST_LIST_SQL = `
  smr.id,
  smr.tenant_id,
  smr.student_profile_id,
  smr.title,
  smr.summary,
  smr.topics,
  smr.preferred_format,
  smr.time_hint,
  smr.status,
  smr.college_note,
  smr.reviewed_at,
  smr.created_at,
  smr.updated_at,
  sp.roll_number AS student_roll_number,
  u.first_name AS student_first_name,
  u.last_name AS student_last_name,
  sp.department AS student_department,
  sp.batch_year AS student_batch_year
`;
