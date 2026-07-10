import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import {
  clarificationsDeepUrl,
  publicJobPostUrl,
  publicJobQuestionsUrl,
} from '@/lib/opportunityPublicLinks';

const MAX_MAILTO_BODY = 1800;

function browsePath(kind) {
  return kind === 'job' ? '/dashboard/alumni/jobs' : '/dashboard/student/internships';
}

function browseUrl(kind, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = browsePath(kind);
  return base ? `${base}${path}` : path;
}

function statusLabel(row) {
  return row.hasApplied ? formatStatus(row.applicationStatus) : 'Open';
}

function payLine(row, kind) {
  if (row.salaryMin == null && row.salaryMax == null) return 'Salary: Not listed';
  const min = formatCurrency(row.salaryMin || row.salaryMax);
  const range =
    row.salaryMax != null &&
    row.salaryMin != null &&
    Number(row.salaryMax) !== Number(row.salaryMin)
      ? `${min} – ${formatCurrency(row.salaryMax)}`
      : min;
  const suffix = kind === 'job' ? '/mo' : '/mo';
  return `Compensation: ${range} ${suffix}`;
}

/**
 * Normalize comma/semicolon-separated recipient list for mailto.
 * @param {string} to
 */
export function normalizeEmailRecipients(to) {
  return String(to || '')
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(',');
}

/**
 * @param {object} row
 * @param {{ kind?: 'job' | 'internship', index?: number, origin?: string }} [options]
 */
export function formatOpportunityEmailBlock(row, options = {}) {
  const { kind = 'job', index, origin } = options;
  const prefix = index != null ? `${index + 1}. ` : '';
  const lines = [
    `${prefix}${row.title || 'Role'} — ${row.companyName || 'Company'}`,
    payLine(row, kind),
  ];
  if (row.minCgpa != null) lines.push(`Min CGPA: ${row.minCgpa}`);
  if (row.vacancies != null) lines.push(`Openings: ${row.vacancies}`);
  if (row.applicationDeadline) {
    lines.push(`Deadline: ${formatDate(row.applicationDeadline)}`);
  }
  lines.push(`Status: ${statusLabel(row)}`);
  if (row.website) lines.push(`Company website: ${row.website}`);

  if (row.id) {
    lines.push(`Public job post (external applicants): ${publicJobPostUrl(row.id, origin)}`);
    lines.push(`Post questions (applicants): ${publicJobQuestionsUrl(row.id, origin)}`);
  }
  if (row.companyName && kind !== 'job') {
    lines.push(
      `Campus clarifications (signed-in members): ${clarificationsDeepUrl(row.companyName, origin)}`,
    );
  }

  if (row.description?.trim()) {
    const snippet = row.description.trim().replace(/\s+/g, ' ').slice(0, 240);
    lines.push(`Summary: ${snippet}${row.description.length > 240 ? '…' : ''}`);
  }
  return lines.join('\n');
}

/**
 * @param {object[]} rows
 * @param {{ kind?: 'job' | 'internship' }} [options]
 */
export function buildOpportunityEmailSubject(rows, options = {}) {
  const { kind = 'job' } = options;
  const list = rows || [];
  if (list.length === 1) {
    const row = list[0];
    const label = kind === 'job' ? 'Alumni job' : 'Internship';
    return `${label}: ${row.title || 'Opening'} at ${row.companyName || 'Company'}`;
  }
  const label = kind === 'job' ? 'alumni job openings' : 'internship openings';
  return `${list.length} ${label} — PlacementHub`;
}

/**
 * @param {object[]} rows
 * @param {{ kind?: 'job' | 'internship', origin?: string, footerNote?: string }} [options]
 */
export function buildOpportunityEmailBody(rows, options = {}) {
  const { kind = 'job', origin, footerNote } = options;
  const list = rows || [];
  if (!list.length) return '';

  const intro =
    list.length === 1
      ? `Sharing this ${kind === 'job' ? 'alumni job' : 'internship'} opening from PlacementHub:\n`
      : `Sharing ${list.length} ${kind === 'job' ? 'alumni job' : 'internship'} openings from PlacementHub:\n`;

  const blocks = list.map((row, index) =>
    formatOpportunityEmailBlock(row, { kind, index, origin }),
  );

  const footer =
    footerNote ||
    `Browse on PlacementHub: ${browseUrl(kind, origin)}\n` +
      'External applicants can use the public job post link. Questions can be posted via the public questions link.';

  let body = `${intro}\n${blocks.join('\n\n')}\n\n${footer}`;

  if (body.length > MAX_MAILTO_BODY) {
    body =
      `${intro}\n` +
      `${blocks.slice(0, 3).join('\n\n')}\n\n` +
      `[${list.length - 3} more not shown — list truncated for email client limits.]\n\n` +
      footer;
  }

  if (body.length > MAX_MAILTO_BODY) {
    body = body.slice(0, MAX_MAILTO_BODY - 40) + '\n\n[Truncated for email client limits.]';
  }

  return body;
}

/**
 * Opens the user's email client with job/internship details.
 * @param {object[]} rows
 * @param {{ kind?: 'job' | 'internship', to?: string, subject?: string, body?: string, origin?: string }} [options]
 */
export function openOpportunityEmail(rows, options = {}) {
  const { kind = 'job', to = '', subject: subjectOverride, body: bodyOverride, origin } = options;
  const list = (rows || []).filter(Boolean);
  if (!list.length) return false;

  const subject = subjectOverride || buildOpportunityEmailSubject(list, { kind });
  const body = bodyOverride || buildOpportunityEmailBody(list, { kind, origin });
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);

  const recipient = normalizeEmailRecipients(to);
  const href = recipient
    ? `mailto:${recipient.split(',').map((r) => encodeURIComponent(r.trim())).join(',')}?${params.toString()}`
    : `mailto:?${params.toString()}`;

  window.location.href = href;
  return true;
}
