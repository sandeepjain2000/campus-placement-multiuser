import { formatDate, formatStatus } from '@/lib/utils';
import { normalizeEmailRecipients } from '@/lib/studentOpportunityEmail';
import { publicJobPostUrl, publicJobQuestionsUrl } from '@/lib/opportunityPublicLinks';

export { normalizeEmailRecipients };

const MAX_MAILTO_BODY = 1800;

function adminListingsUrl(origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return base ? `${base}/dashboard/admin/placement-listings` : '/dashboard/admin/placement-listings';
}

function adminEmployerUrl(employerId, origin) {
  if (!employerId) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = `/dashboard/admin/employers?view=${encodeURIComponent(employerId)}`;
  return base ? `${base}${path}` : path;
}

function adminCollegeUrl(collegeId, origin) {
  if (!collegeId) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = `/dashboard/admin/colleges/${encodeURIComponent(collegeId)}`;
  return base ? `${base}${path}` : path;
}

/**
 * @param {object} row
 * @param {{ index?: number, origin?: string }} [options]
 */
export function formatAdminPlacementListingEmailBlock(row, options = {}) {
  const { index, origin } = options;
  const prefix = index != null ? `${index + 1}. ` : '';
  const lines = [
    `${prefix}${row.typeLabel || 'Listing'} — ${row.title || 'Untitled'}`,
    `Employer: ${row.employerName || '—'}`,
    `College(s): ${row.collegeNames || '—'}`,
    `Status: ${formatStatus(row.status)}`,
  ];

  if (row.applicationCount != null) {
    const label = row.source === 'drive' ? 'Registered' : 'Applications';
    lines.push(`${label}: ${row.applicationCount}`);
  }
  if (row.eventDate) {
    const label = row.source === 'drive' ? 'Drive date' : 'Deadline / event';
    lines.push(`${label}: ${formatDate(row.eventDate)}`);
  }
  if (row.createdAt) {
    lines.push(`Posted: ${formatDate(row.createdAt)}`);
  }

  if (row.source === 'posting' && row.id) {
    lines.push(`Public job post: ${publicJobPostUrl(row.id, origin)}`);
    lines.push(`Post questions: ${publicJobQuestionsUrl(row.id, origin)}`);
  }

  if (row.employerId) {
    lines.push(`Admin employer profile: ${adminEmployerUrl(row.employerId, origin)}`);
  }
  if (row.collegeId) {
    lines.push(`Admin college: ${adminCollegeUrl(row.collegeId, origin)}`);
  }

  return lines.join('\n');
}

/**
 * @param {object[]} rows
 */
export function buildAdminPlacementListingEmailSubject(rows) {
  const list = rows || [];
  if (list.length === 1) {
    const row = list[0];
    return `Placement listing: ${row.title || 'Opening'} (${row.typeLabel || 'Listing'}) — PlacementHub`;
  }
  return `${list.length} placement listings — PlacementHub`;
}

/**
 * @param {object[]} rows
 * @param {{ origin?: string, footerNote?: string }} [options]
 */
export function buildAdminPlacementListingEmailBody(rows, options = {}) {
  const { origin, footerNote } = options;
  const list = rows || [];
  if (!list.length) return '';

  const intro =
    list.length === 1
      ? 'Sharing this placement listing from PlacementHub admin:\n'
      : `Sharing ${list.length} placement listings from PlacementHub admin:\n`;

  const blocks = list.map((row, index) =>
    formatAdminPlacementListingEmailBlock(row, { index, origin }),
  );

  const footer =
    footerNote ||
    `View all listings: ${adminListingsUrl(origin)}\n` +
      'Job postings include public links for external applicants where applicable.';

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
 * @param {object[]} rows
 * @param {{ to?: string, subject?: string, body?: string, origin?: string }} [options]
 */
export function openAdminPlacementListingEmail(rows, options = {}) {
  const { to = '', subject: subjectOverride, body: bodyOverride, origin } = options;
  const list = (rows || []).filter(Boolean);
  if (!list.length) return false;

  const subject = subjectOverride || buildAdminPlacementListingEmailSubject(list);
  const body = bodyOverride || buildAdminPlacementListingEmailBody(list, { origin });
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

export function listingRowSelectionId(row) {
  return `${row?.source || 'row'}-${row?.id || ''}`;
}
