import { PLATFORM_ERROR_CONTEXT_LABELS } from '@/lib/platformErrorContext';

/** Short reference shown to users (first 8 hex of UUID). */
export function formatLogReference(id) {
  if (!id) return null;
  return String(id).replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function contextLabel(value) {
  const FUNCTIONALITY_MAP = {
    // Login
    'login_debug': 'Login',
    'login_failed': 'Login',
    'session_stale_signout': 'Login',
    'api_auth_callback_credentials': 'Login',
    'api_auth_session': 'Login',
    
    // Internship Create & Update
    'employer_job_create': 'Internship Create',
    'api_employer_jobs_post': 'Internship Create',
    'employer_job_update': 'Internship Update',
    'api_employer_jobs_put': 'Internship Update',
    'api_employer_jobs': 'Internship Create/Update',
    'employer_job_list': 'Internship List',
    'api_employer_jobs_get': 'Internship List',
    
    // Internship Approve
    'college_job_listing_approval': 'Internship Approve',
    'api_college_job_listings_approve': 'Internship Approve',
    'api_college_job_listings_reject': 'Internship Approve',
    'api_college_job_listing_approval': 'Internship Approve',
    
    // Internship Apply
    'student_program_application': 'Internship Apply',
    'api_student_program_applications': 'Internship Apply',
    'debug_student_apply': 'Internship Apply',
    'api_student_program_applications_post': 'Internship Apply',
    
    // Internship Select
    'employer_application_update': 'Internship Select',
    'api_employer_applications_update': 'Internship Select',
    'api_employer_applications_status': 'Internship Select',
    'api_employer_application_update': 'Internship Select',
    
    // Internship Browse
    'api_student_program_opportunities': 'Internship Browse',
    
    // Placement Drive Create & Update
    'employer_drive_create': 'Placement Drive Create',
    'api_employer_drives_post': 'Placement Drive Create',
    'employer_drive_update': 'Placement Drive Update',
    'api_employer_drives_put': 'Placement Drive Update',
    'api_employer_drives': 'Placement Drive Create/Update',
    'employer_drive_list': 'Placement Drive List',
    'employer_drive_get': 'Placement Drive View',
    'employer_drive_cancel': 'Placement Drive Cancel',
    
    // Guided Runner
    'api_guided_runner_state': 'Guided Runner State',
    'api_guided_runner_click': 'Guided Runner Action',
    'api_guided_runner_sign_in': 'Guided Runner Login',
  };
  if (FUNCTIONALITY_MAP[value]) return FUNCTIONALITY_MAP[value];
  if (PLATFORM_ERROR_CONTEXT_LABELS[value]) {
    // Clean up "Employer — create placement drive" to "Placement Drive Create" style if possible
    const label = PLATFORM_ERROR_CONTEXT_LABELS[value];
    if (label.startsWith('Employer — ')) {
      const parts = label.split(' — ');
      if (parts[1]) {
        // e.g. "create placement drive" -> "Placement Drive Create"
        return parts[1]
          .replace('create ', 'Create ')
          .replace('update ', 'Update ')
          .replace('list ', 'List ')
          .replace('view ', 'View ')
          .replace('cancel ', 'Cancel ')
          .replace('applications list', 'Applications List')
          .replace('update application status', 'Internship Select');
      }
    }
    return label;
  }
  if (typeof value === 'string' && value.startsWith('api_')) {
    let clean = value.slice(4).replace(/_/g, ' ');
    // Title Case
    clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return clean.replace(/\b(Id)\b/g, '[id]');
  }
  if (typeof value === 'string' && value.startsWith('debug_')) {
    let clean = value.slice(6).replace(/_/g, ' ');
    // Title Case
    clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return clean;
  }
  return value || '—';
}

const PG_HINTS = {
  '42703': 'A required database column is missing — run pending migrations on the server.',
  '42P01': 'A required database table is missing — run pending migrations on the server.',
  '23514': 'A platform validation rule blocked this request.',
  '23503': 'A linked record (campus, employer, or user) could not be found.',
  '23505': 'This record conflicts with an existing entry.',
  '22P02': 'One of the submitted values has an invalid format.',
  '22007': 'One of the submitted values has an invalid date/time format.',
  '53300': 'Database connection pool exhausted — retry or reduce concurrent load.',
  '57P01': 'Database connection was terminated — often transient on serverless.',
};

export function postgresHintFromLog(row) {
  const details = parseLogDetails(row);
  if (details.pgHint) return details.pgHint;
  const code = row?.error_code || null;
  if (code && PG_HINTS[code]) return PG_HINTS[code];
  const msg = String(row?.error_message || '').toLowerCase();
  if (msg.includes('missing from-clause')) return 'SQL query uses a table alias that is not defined in FROM/JOIN.';
  if (msg.includes('does not exist')) return 'Database object missing — check migrations and query aliases.';
  return null;
}

export function parseLogDetails(row) {
  const raw = row?.details;
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function severityBadgeClass(severity) {
  const s = String(severity || 'error').toLowerCase();
  if (s === 'warning') return 'badge-amber';
  if (s === 'info') return 'badge-gray';
  return 'badge-red';
}

/** Flatten a log row for copy/export with parsed details. */
export function formatFullErrorLog(row) {
  const details = parseLogDetails(row);
  const payload = {
    reference: formatLogReference(row.id),
    id: row.id,
    created_at: row.created_at,
    severity: row.severity,
    context: row.context,
    context_label: contextLabel(row.context),
    status_code: row.status_code,
    error_code: row.error_code,
    postgres_hint: postgresHintFromLog(row),
    user_message: row.user_message,
    error_message: row.error_message,
    route: details.route || null,
    request_method: details.requestMethod || null,
    request_query: details.requestQuery || null,
    user_agent: details.userAgent || null,
    actor_email: details.actorEmail || row.user_email || null,
    user_name: row.user_name,
    company_name: row.company_name,
    tenant_name: row.tenant_name,
    ip_address: row.ip_address,
    stack: details.stack || null,
    pg_detail: details.pgDetail || null,
    request_body: details.requestBody ?? null,
    client_details: details.clientDetails ?? null,
    source: details.source || 'server',
    details,
  };
  return JSON.stringify(payload, null, 2);
}

/** API helper — attach display fields without mutating stored row. */
export function enrichErrorLogRow(row) {
  const details = parseLogDetails(row);
  return {
    ...row,
    details,
    reference: formatLogReference(row.id),
    context_label: contextLabel(row.context),
    route: details.route || null,
    request_method: details.requestMethod || null,
    postgres_hint: postgresHintFromLog(row),
    stack_preview: details.stack ? String(details.stack).split('\n').slice(0, 2).join('\n') : null,
  };
}
