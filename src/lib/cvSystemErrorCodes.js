/**
 * Stable system-defined codes for student / college CV API failures.
 */
export const CV_SYSTEM_ERROR_CODES = Object.freeze({
  COLLEGE_LIST: 'PH-CV-COL-LIST',
  COLLEGE_LIST_QUERY: 'PH-CV-COL-QUERY',
  STUDENT_LIST: 'PH-CV-STU-LIST',
  MIGRATION: 'PH-CV-MIGRATE',
  ROUTE_MISSING: 'PH-CV-404',
  S3_CONFIG: 'PH-CV-S3-CONFIG',
  S3_MISSING: 'PH-CV-S3-MISSING',
  S3_ACCESS: 'PH-CV-S3-ACCESS',
  S3_ERROR: 'PH-CV-S3',
  VIEW: 'PH-CV-VIEW',
});
