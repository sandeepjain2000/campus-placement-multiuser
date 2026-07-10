import { formatCurrency, formatDate } from '@/lib/utils';

export const OFFER_TEMPLATE_PLACEHOLDERS = [
  { key: 'student_name', label: 'Student name' },
  { key: 'company_name', label: 'Company name' },
  { key: 'role', label: 'Role / job title' },
  { key: 'location', label: 'Location' },
  { key: 'joining_date', label: 'Joining date' },
  { key: 'response_deadline', label: 'Response deadline' },
  { key: 'college_name', label: 'College name' },
];

export const DEFAULT_OFFER_TEMPLATE_BODY = `Dear {{student_name}},

We are pleased to extend an offer for the position of {{role}} at {{company_name}}.

Location: {{location}}
Joining date: {{joining_date}}
Please respond by {{response_deadline}} on PlacementHub (My Offers).

Regards,
{{company_name}}`;

/**
 * @param {string} template
 * @param {Record<string, string>} values
 */
export function renderOfferTemplateBody(template, values) {
  let out = String(template || '');
  for (const [key, val] of Object.entries(values)) {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    out = out.replace(re, val ?? '');
  }
  return out.replace(/\{\{\s*[a-z_]+\s*\}\}/gi, '').trim();
}

/**
 * @param {{
 *   template: { body_template: string; job_title?: string; location?: string | null; joining_date?: string | Date | null; response_deadline?: string | Date | null; salary?: number | null };
 *   studentName: string;
 *   companyName: string;
 *   collegeName?: string;
 * }} opts
 */
export function buildRenderedOfferLetter({ template, studentName, companyName, collegeName = '' }) {
  const values = {
    student_name: String(studentName || 'Student').trim(),
    company_name: String(companyName || 'Company').trim(),
    role: String(template.job_title || '').trim(),
    location: String(template.location || 'As per company policy').trim(),
    joining_date: template.joining_date ? formatDate(template.joining_date) : 'To be confirmed',
    response_deadline: template.response_deadline ? formatDate(template.response_deadline) : 'See My Offers',
    college_name: String(collegeName || '').trim(),
  };
  return renderOfferTemplateBody(template.body_template, values);
}

/**
 * Plain-text letter block for email (includes fixed CTC line from template, not a body placeholder).
 */
export function buildOfferEmailLetterSection({ renderedLetter, salary }) {
  const ctc =
    salary != null && Number(salary) > 0
      ? formatCurrency(Number(salary))
      : null;
  const parts = [];
  if (ctc) parts.push(`CTC: ${ctc}`);
  if (renderedLetter) parts.push(renderedLetter);
  return parts.join('\n\n');
}
