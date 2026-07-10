import { normalizeOrganizationName } from '@/lib/organizationNames';
import { validateEmail, validatePersonName, validatePhone } from '@/lib/validators';

/** @returns {string | null} First validation error, or null when valid. */
export function validateAdminEmployerForm(form) {
  const name = normalizeOrganizationName(form?.name);
  if (!name) return 'Company name is required';

  const contactPerson = String(form?.contactPerson || '').trim();
  if (contactPerson) {
    const personErr = validatePersonName(contactPerson, { required: false, label: 'Contact person' });
    if (personErr) return personErr;
  }

  const contactEmail = String(form?.contactEmail || '').trim();
  if (contactEmail && !validateEmail(contactEmail)) {
    return 'Contact email must be a valid email address';
  }

  const contactPhone = String(form?.contactPhone || '').trim();
  if (contactPhone && !validatePhone(contactPhone)) {
    return 'Contact phone must use international format, e.g. +91 9876543210';
  }

  return null;
}
