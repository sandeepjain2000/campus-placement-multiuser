/** Keys stored in `system_email_templates` (Super Admin–editable). */
export const CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY = 'campus_guest_confirmation';
export const SPONSORSHIP_THANK_YOU_TEMPLATE_KEY = 'sponsorship_thank_you';
/** College → employer; auto-sent when a sponsorship payment is recorded. */
export const SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY = 'sponsorship_college_thanks_sponsor';
export const SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY = 'sponsorship_donation_receipt';

export const EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS = [
  CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY,
  SPONSORSHIP_THANK_YOU_TEMPLATE_KEY,
  SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY,
  SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY,
];

/** @type {Set<string>} */
export const EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEY_SET = new Set(EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS);

/**
 * UI + docs: human title, short summary, and Mustache-style placeholders for each template.
 * @type {Record<string, { title: string, summary: string, placeholders: string[] }>}
 */
export const SYSTEM_EMAIL_TEMPLATE_META = {
  [CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY]: {
    title: 'Campus guest need — employer confirmation',
    summary:
      'Prefills the email when you confirm interest in a published guest faculty or lecture listing. You can edit before sending.',
    placeholders: [
      'collegeName',
      'collegeCity',
      'collegeState',
      'listingTitle',
      'listingKind',
      'listingSummary',
      'listingRequirements',
      'timeHint',
      'employerName',
      'employerEmail',
      'employerCompany',
    ],
  },
  [SPONSORSHIP_THANK_YOU_TEMPLATE_KEY]: {
    title: 'Sponsorship — thank you to college',
    summary:
      'Draft wording if the employer sends thanks to the institution (not wired to auto-send). For the automatic college-to-employer note, use “Sponsorship — college thanks sponsor”.',
    placeholders: [
      'collegeName',
      'collegeCity',
      'collegeState',
      'employerName',
      'employerEmail',
      'employerCompany',
      'sponsorshipTierName',
      'sponsorshipCategory',
      'amountInr',
      'placementSeasonLabel',
    ],
  },
  [SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY]: {
    title: 'Sponsorship — college thanks sponsor',
    summary:
      'Sent automatically to the employer right after they record a sponsorship payment (first of two emails; receipt follows separately). Super Admins can edit the wording.',
    placeholders: [
      'collegeName',
      'collegeCity',
      'collegeState',
      'employerName',
      'employerEmail',
      'employerCompany',
      'sponsorshipTierName',
      'sponsorshipCategory',
      'amountInr',
      'placementSeasonLabel',
    ],
  },
  [SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY]: {
    title: 'Sponsorship — donation receipt to employer',
    summary:
      'Sent automatically after payment (second email) and can be resent manually from College → Sponsorships only if no receipt was logged yet.',
    placeholders: [
      'collegeName',
      'collegeCity',
      'collegeState',
      'employerCompany',
      'employerName',
      'employerEmail',
      'billingLegalName',
      'billingPan',
      'billingGstNumber',
      'receiptNumber',
      'receiptDate',
      'paymentRecordedDate',
      'amountInr',
      'tierName',
      'category',
      'paymentMethodLabel',
      'taxNote',
    ],
  },
};
