import { query } from '@/lib/db';
import {
  CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY,
  SPONSORSHIP_THANK_YOU_TEMPLATE_KEY,
  SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY,
  SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY,
} from '@/lib/systemEmailTemplates';

/** Templates an employer organization may customize (scoped to employer_profiles.id). */
export const EMPLOYER_EMAIL_TEMPLATE_KEYS = [
  CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY,
  SPONSORSHIP_THANK_YOU_TEMPLATE_KEY,
];

/** Templates a college may customize (scoped to tenants.id). */
export const COLLEGE_EMAIL_TEMPLATE_KEYS = [
  SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY,
  SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY,
];

export const EMPLOYER_EMAIL_TEMPLATE_KEY_SET = new Set(EMPLOYER_EMAIL_TEMPLATE_KEYS);
export const COLLEGE_EMAIL_TEMPLATE_KEY_SET = new Set(COLLEGE_EMAIL_TEMPLATE_KEYS);

/** Built-in defaults when `system_email_templates` rows are not seeded yet. */
const EMAIL_TEMPLATE_FALLBACKS = {
  [CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY]: {
    subject_template: 'Guest engagement interest: {{listingTitle}} — {{employerCompany}}',
    body_template: `Dear {{collegeName}} Placement Team,

We are writing regarding your published campus guest need.

Listing: {{listingTitle}}
Type: {{listingKind}}

Summary:
{{listingSummary}}

Requirements:
{{listingRequirements}}

Preferred timing: {{timeHint}}

—
From: {{employerName}}
Email: {{employerEmail}}
Organization: {{employerCompany}}

We confirm our interest and would like to discuss next steps at your convenience.

Best regards,
{{employerName}}
{{employerCompany}}`,
    description: 'Default campus guest confirmation (seed system_email_templates for admin edit)',
  },
  [SPONSORSHIP_THANK_YOU_TEMPLATE_KEY]: {
    subject_template: 'Thank you — {{collegeName}} sponsorship',
    body_template:
      'Dear {{collegeName}} team,\n\nThank you for partnering with {{employerCompany}} on {{sponsorshipTierName}} ({{amountInr}}).\n\n— {{employerName}}\n{{employerCompany}}\n',
    description: 'Default employer sponsorship thank-you draft',
  },
  [SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY]: {
    subject_template: 'Thank you for supporting {{collegeName}}',
    body_template:
      'Dear {{employerName}},\n\nOn behalf of {{collegeName}}, thank you for your {{sponsorshipTierName}} sponsorship ({{amountInr}}).\n\nWe have sent a separate email with receipt details for your records.\n\n— {{collegeName}}\n',
    description: 'Default college thanks sponsor (auto-sent after payment)',
  },
  [SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY]: {
    subject_template: 'Donation / sponsorship receipt {{receiptNumber}} — {{collegeName}}',
    body_template:
      'Dear {{employerName}},\n\nPlease find your sponsorship receipt details.\n\nReceipt: {{receiptNumber}}\nDate: {{receiptDate}}\nAmount (INR): {{amountInr}}\n\nLegal name: {{billingLegalName}}\nPAN: {{billingPan}}\nGSTIN: {{billingGstNumber}}\n\n{{collegeName}}\n{{taxNote}}\n',
    description: 'Default donation receipt (auto-sent after payment)',
  },
};

/**
 * @param {string} templateKey
 * @returns {{ template_key: string, subject_template: string, body_template: string, description?: string } | null}
 */
export function getEmailTemplateFallback(templateKey) {
  const fb = EMAIL_TEMPLATE_FALLBACKS[templateKey];
  if (!fb) return null;
  return { template_key: templateKey, ...fb };
}

/**
 * @param {string} templateKey
 * @returns {Promise<{ template_key: string, subject_template: string, body_template: string, description?: string, updated_at?: string } | null>}
 */
export async function loadSystemEmailTemplateRow(templateKey) {
  try {
    const r = await query(
      `SELECT template_key, subject_template, body_template, description, updated_at
       FROM system_email_templates WHERE template_key = $1`,
      [templateKey],
    );
    return r.rows[0] || null;
  } catch (e) {
    console.warn('[emailTemplateResolve] system_email_templates missing?', e.message);
    return null;
  }
}

/**
 * @param {'employer'|'college'} scopeType
 * @param {string} scopeId
 * @param {string} templateKey
 */
export async function loadEmailTemplateOverride(scopeType, scopeId, templateKey) {
  if (!scopeType || !scopeId || !templateKey) return null;
  try {
    const r = await query(
      `SELECT subject_template, body_template, updated_at, updated_by
       FROM email_template_overrides
       WHERE scope_type = $1 AND scope_id = $2::uuid AND template_key = $3`,
      [scopeType, scopeId, templateKey],
    );
    return r.rows[0] || null;
  } catch (e) {
    if (e.message?.includes('email_template_overrides')) return null;
    throw e;
  }
}

/**
 * Resolve template: organization override when present, else platform default.
 * @param {string} templateKey
 * @param {{ scopeType?: 'employer'|'college', scopeId?: string } | null} [scope]
 */
export async function loadResolvedEmailTemplate(templateKey, scope = null) {
  const system = (await loadSystemEmailTemplateRow(templateKey)) || getEmailTemplateFallback(templateKey);
  if (!system) return null;

  if (scope?.scopeType && scope?.scopeId) {
    const override = await loadEmailTemplateOverride(scope.scopeType, scope.scopeId, templateKey);
    if (override) {
      return {
        ...system,
        subject_template: override.subject_template,
        body_template: override.body_template,
        updated_at: override.updated_at,
        source: 'override',
      };
    }
  }

  return { ...system, source: 'system' };
}

/**
 * @param {'employer'|'college'} scopeType
 * @param {string} scopeId
 * @param {string} templateKey
 * @param {string} subjectTemplate
 * @param {string} bodyTemplate
 * @param {string} userId
 */
export async function upsertEmailTemplateOverride(
  scopeType,
  scopeId,
  templateKey,
  subjectTemplate,
  bodyTemplate,
  userId,
) {
  const r = await query(
    `INSERT INTO email_template_overrides (scope_type, scope_id, template_key, subject_template, body_template, updated_at, updated_by)
     VALUES ($1, $2::uuid, $3, $4, $5, NOW(), $6::uuid)
     ON CONFLICT (scope_type, scope_id, template_key)
     DO UPDATE SET
       subject_template = EXCLUDED.subject_template,
       body_template = EXCLUDED.body_template,
       updated_at = NOW(),
       updated_by = EXCLUDED.updated_by
     RETURNING template_key, subject_template, body_template, updated_at`,
    [scopeType, scopeId, templateKey, subjectTemplate, bodyTemplate, userId],
  );
  return r.rows[0];
}

export async function deleteEmailTemplateOverride(scopeType, scopeId, templateKey) {
  await query(
    `DELETE FROM email_template_overrides
     WHERE scope_type = $1 AND scope_id = $2::uuid AND template_key = $3`,
    [scopeType, scopeId, templateKey],
  );
}
