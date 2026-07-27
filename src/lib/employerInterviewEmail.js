import { formatDate } from '@/lib/utils';
import { interviewTabLabel } from '@/lib/employerInterviewOpportunity';

export const INTERVIEW_TIMEFRAME_DISCLAIMER =
  'The date and time below indicate a general interview window only. Your exact interview slot will be confirmed separately outside PlacementHub (for example by email, phone, or your campus placement coordinator).';

function formatTimeDisplay(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const am = h < 12;
  const hr = h % 12 || 12;
  const mm = String(m || 0).padStart(2, '0');
  return `${hr}:${mm} ${am ? 'AM' : 'PM'}`;
}

/**
 * @param {object} slot
 * @param {{ companyName?: string, campusName?: string }} [ctx]
 */
export function buildEmployerInterviewApplicantEmailSubject(slot, ctx = {}) {
  const company = ctx.companyName || slot.companyName || 'Employer';
  const opening = slot.opportunityTitle || interviewTabLabel(slot.opportunityKind);
  return `Interview schedule — ${opening} (${company})`;
}

/**
 * @param {object} slot
 * @param {{ companyName?: string, campusName?: string, recipientName?: string }} [ctx]
 */
export function buildEmployerInterviewApplicantEmailBody(slot, ctx = {}) {
  const greeting = ctx.recipientName ? `Hello ${ctx.recipientName},` : 'Hello,';
  const company = ctx.companyName || slot.companyName || 'the employer';
  const campus = ctx.campusName || slot.campus || 'your campus';
  const opening = slot.opportunityTitle || interviewTabLabel(slot.opportunityKind);
  const kindLabel = interviewTabLabel(slot.opportunityKind);
  const dateLabel = slot.date ? formatDate(slot.date) : 'To be confirmed';
  const timeLabel = slot.time ? formatTimeDisplay(slot.time) : 'To be confirmed';

  return [
    greeting,
    '',
    `${company} has shared an interview window for applicants on ${opening} (${kindLabel}) at ${campus}.`,
    '',
    'Interview window (indicative):',
    `- Round: ${slot.round || 'Interview'}`,
    `- Date: ${dateLabel}`,
    `- Time: ${timeLabel}`,
    `- Mode: ${slot.mode || 'Virtual'}`,
    slot.panelNames ? `- Panel / interviewer: ${slot.panelNames}` : '',
    '',
    INTERVIEW_TIMEFRAME_DISCLAIMER,
    '',
    'Please watch for a separate message with your confirmed slot and joining details.',
    '',
    '— PlacementHub',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Shared props for React Email interview template (server-only senders). */
export function buildInterviewInviteTemplateProps(slot, ctx = {}) {
  return {
    recipientName: ctx.recipientName,
    companyName: ctx.companyName || slot.companyName || 'the employer',
    campusName: ctx.campusName || slot.campus || 'your campus',
    openingTitle: slot.opportunityTitle || interviewTabLabel(slot.opportunityKind),
    kindLabel: interviewTabLabel(slot.opportunityKind),
    round: slot.round || 'Interview',
    dateLabel: slot.date ? formatDate(slot.date) : 'To be confirmed',
    timeLabel: slot.time ? formatTimeDisplay(slot.time) : 'To be confirmed',
    mode: slot.mode || 'Virtual',
    panelNames: slot.panelNames || undefined,
    disclaimer: INTERVIEW_TIMEFRAME_DISCLAIMER,
  };
}
