/** Shared SQL fragments for sandbox soft-delete (is_deleted). Requires migration 066. */

/** @param {string} alias Table alias, e.g. "jp" */
export function notDeleted(alias) {
  return `COALESCE(${alias}.is_deleted, false) = false`;
}

/** @param {string} alias @returns {string} e.g. "AND COALESCE(jp.is_deleted, false) = false" */
export function andNotDeleted(alias) {
  return `AND ${notDeleted(alias)}`;
}

/** @param {...string} aliases */
export function andNotDeletedAll(...aliases) {
  return aliases.map((a) => andNotDeleted(a)).join(' ');
}

export const JP_NOT_DELETED = notDeleted('jp');
export const DRIVE_NOT_DELETED = notDeleted('d');
export const APP_NOT_DELETED = notDeleted('a');
export const PA_NOT_DELETED = notDeleted('pa');
export const OFFER_NOT_DELETED = notDeleted('o');
export const SP_NOT_DELETED = notDeleted('sp');
export const EAU_NOT_DELETED = notDeleted('eau');

export const AND_JP_NOT_DELETED = andNotDeleted('jp');
export const AND_DRIVE_NOT_DELETED = andNotDeleted('d');
export const AND_DRIVE_PD_NOT_DELETED = andNotDeleted('pd');
export const AND_APP_NOT_DELETED = andNotDeleted('a');
export const AND_PA_NOT_DELETED = andNotDeleted('pa');
export const AND_OFFER_NOT_DELETED = andNotDeleted('o');
export const AND_SP_NOT_DELETED = andNotDeleted('sp');
export const AND_EAU_NOT_DELETED = andNotDeleted('eau');

/** Standard read-path filter bundle for joined placement entities. */
export const READ_FILTERS = {
  driveApplication: `${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED} ${AND_JP_NOT_DELETED}`,
  programApplication: `${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}`,
  offer: `${AND_OFFER_NOT_DELETED} ${AND_SP_NOT_DELETED}`,
  jobPosting: AND_JP_NOT_DELETED,
  drive: AND_DRIVE_NOT_DELETED,
  assessmentUpload: AND_EAU_NOT_DELETED,
};
