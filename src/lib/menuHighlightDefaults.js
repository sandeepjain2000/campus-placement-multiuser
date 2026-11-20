/** Client-safe defaults for menu item highlighting (no DB). */

export const DEFAULT_MENU_HIGHLIGHT_COLOR = '#FF0000';

/** Roles that have configurable landing-page menus for this feature. */
export const MENU_HIGHLIGHT_ROLE_OPTIONS = [
  { key: 'college_admin', label: 'College' },
  { key: 'employer', label: 'Employer' },
  { key: 'student', label: 'Student' },
];

export const MENU_HIGHLIGHT_ENTITY_TYPES = [
  { key: 'college', label: 'College' },
  { key: 'employer', label: 'Employer' },
  { key: 'student', label: 'Student' },
];

export function emptySelectedItems() {
  return {
    college_admin: [],
    employer: [],
    student: [],
  };
}
