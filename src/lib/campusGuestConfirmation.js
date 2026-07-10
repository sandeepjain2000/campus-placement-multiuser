import { applyEmailTemplate } from '@/lib/emailTemplateRender';
import { loadResolvedEmailTemplate } from '@/lib/emailTemplateResolve';
import { CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY } from '@/lib/systemEmailTemplates';

export { CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY } from '@/lib/systemEmailTemplates';

export const GUEST_LISTING_KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

/**
 * @param {string} templateKey
 * @param {{ scopeType?: 'employer'|'college', scopeId?: string } | null} [scope]
 * @returns {Promise<{ template_key: string, subject_template: string, body_template: string, description?: string, updated_at?: string } | null>}
 */
export async function loadSystemEmailTemplate(templateKey, scope = null) {
  return loadResolvedEmailTemplate(templateKey, scope);
}

/**
 * @param {object} listingRow — columns from campus_engagement_listings + college_* aliases
 * @param {{ displayName: string, email: string, companyName: string }} employer
 */
export function buildCampusGuestSubstitutionVars(listingRow, employer) {
  return {
    collegeName: listingRow.college_name || '',
    collegeCity: listingRow.college_city || '',
    collegeState: listingRow.college_state || '',
    listingTitle: listingRow.title || '',
    listingKind: GUEST_LISTING_KIND_LABEL[listingRow.kind] || listingRow.kind || '',
    listingSummary: listingRow.summary || '—',
    listingRequirements: listingRow.requirements || '—',
    timeHint: listingRow.time_hint || '—',
    employerName: employer.displayName || '',
    employerEmail: employer.email || '',
    employerCompany: employer.companyName || '',
  };
}

export function renderTemplates(templateRow, vars) {
  return {
    subject: applyEmailTemplate(templateRow.subject_template, vars),
    body: applyEmailTemplate(templateRow.body_template, vars),
  };
}
