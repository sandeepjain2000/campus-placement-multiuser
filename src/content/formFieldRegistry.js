/**
 * Master index of screens, form fields, defaults, and validation expectations.
 * Used by /developer/form-field-registry and scripts/scan-validation-alignment.mjs
 *
 * When adding a form field or changing validation messages, update this file.
 */

export const FORM_FIELD_REGISTRY_META = {
  title: 'Form field registry',
  subtitle:
    'Screens, fields, defaults, and validation rules. Validation messages are prefixed with [VAL-{FIELD}-{RULE}] — see src/lib/validationErrorCode.js.',
  scanCommand: 'npm run scan:validation-alignment',
  validationLib: 'src/lib/inputConstraints.js + src/lib/validators.js (FIELD_IDS + validateField)',
};

/** @typedef {{ key: string, label: string, required?: boolean, defaultValue?: string, fieldId?: string, validationNotes: string, commonErrors: string[] }} RegistryField */

/** @typedef {{ id: string, route: string, role: string, formName: string, clientValidation?: string, apiRoute?: string, fields: RegistryField[] }} RegistryScreen */

/** @type {RegistryScreen[]} */
export const FORM_FIELD_REGISTRY_SCREENS = [
  {
    id: 'employer-internship-create',
    route: '/dashboard/employer/internships',
    role: 'employer',
    formName: 'Create / edit internship',
    clientValidation: 'src/lib/employerInternshipFormValidation.js',
    apiRoute: 'POST|PATCH /api/employer/jobs (jobType=internship)',
    fields: [
      {
        key: 'title',
        label: 'Internship title',
        required: true,
        defaultValue: '',
        fieldId: 'common.title',
        validationNotes: 'Non-empty title, max length from validators.',
        commonErrors: ['Internship title is required.'],
      },
      {
        key: 'startDate',
        label: 'Start date',
        required: true,
        defaultValue: '',
        validationNotes: 'SegmentedDateInput → YYYY-MM-DD. Both segments must be complete.',
        commonErrors: ['Internship start date is required.'],
      },
      {
        key: 'endDate',
        label: 'End date',
        required: true,
        defaultValue: '',
        validationNotes: 'Must be on or after start date.',
        commonErrors: [
          'Internship end date is required.',
          'Internship end date must be on or after the start date.',
        ],
      },
      {
        key: 'maxBacklogs',
        label: 'Max active backlogs',
        required: false,
        defaultValue: '0',
        fieldId: 'college.rule.maxBacklogs',
        validationNotes: 'Integer 0–20. Default 0 (not blank). 0 = no backlogs allowed.',
        commonErrors: ['Max active backlogs must be between 0 and 20.'],
      },
      {
        key: 'minCgpa',
        label: 'Min CGPA',
        required: false,
        defaultValue: '',
        fieldId: 'employer.minCgpa',
        validationNotes: 'Empty allowed; if set, 0 < CGPA ≤ 10.',
        commonErrors: ['CGPA must be greater than 0 and at most 10.'],
      },
      {
        key: 'vacancies',
        label: 'Openings',
        required: false,
        defaultValue: '5',
        fieldId: 'employer.vacancies',
        validationNotes: 'Positive integer.',
        commonErrors: ['Openings must be between 1 and 10000.'],
      },
      {
        key: 'tenantIds',
        label: 'Target campuses',
        required: true,
        defaultValue: '[]',
        validationNotes: 'At least one approved campus required to publish (not draft).',
        commonErrors: ['Select at least one approved campus before publishing.'],
      },
    ],
  },
  {
    id: 'employer-drive-request',
    route: '/dashboard/employer/drives/request',
    role: 'employer',
    formName: 'Placement drive request',
    clientValidation: 'src/lib/placementDriveJobFields.js',
    apiRoute: 'POST /api/employer/drives',
    fields: [
      {
        key: 'maxBacklogs',
        label: 'Max active backlogs',
        required: false,
        defaultValue: '0',
        fieldId: 'college.rule.maxBacklogs',
        validationNotes: 'Same as internship. Default 0.',
        commonErrors: ['Max active backlogs must be between 0 and 20.'],
      },
      {
        key: 'driveDate',
        label: 'Drive date',
        required: true,
        validationNotes: 'Complete date required for drive scheduling.',
        commonErrors: ['Drive date is required.'],
      },
    ],
  },
  {
    id: 'college-placement-rules',
    route: '/dashboard/college/rules',
    role: 'college_admin',
    formName: 'Placement rules',
    clientValidation: 'src/lib/apiInputValidation.js',
    apiRoute: 'PUT /api/college/rules',
    fields: [
      {
        key: 'maxBacklogs',
        label: 'Max backlogs allowed',
        required: true,
        defaultValue: '0',
        fieldId: 'college.rule.maxBacklogs',
        validationNotes: 'College-wide default; 0 allowed.',
        commonErrors: ['Max active backlogs must be between 0 and 20.'],
      },
    ],
  },
  {
    id: 'student-profile',
    route: '/dashboard/student/profile',
    role: 'student',
    formName: 'Student profile',
    clientValidation: 'src/lib/apiInputValidation.js',
    apiRoute: 'PUT /api/student/profile',
    fields: [
      {
        key: 'cgpa',
        label: 'CGPA',
        required: false,
        fieldId: 'student.cgpa',
        validationNotes: 'College-controlled — read-only for students.',
        commonErrors: [],
      },
      {
        key: 'backlogsActive',
        label: 'Active backlogs',
        required: false,
        fieldId: 'student.backlogsActive',
        validationNotes: 'Must not exceed total backlogs.',
        commonErrors: ['Active backlogs cannot exceed total backlogs.'],
      },
    ],
  },
];

/** Flat list for scanners */
export function listRegistryValidationSources() {
  return FORM_FIELD_REGISTRY_SCREENS.flatMap((screen) => [
    screen.clientValidation,
    screen.apiRoute,
    ...screen.fields.map((f) => f.fieldId).filter(Boolean),
  ]).filter(Boolean);
}
