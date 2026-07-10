import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { downloadCsv, rowsToCsv } from '@/lib/csvExport';

function opportunityStatusLabel(row) {
  return row.hasApplied ? formatStatus(row.applicationStatus) : 'Open';
}

/**
 * CSV payload for student browse tables (internships, alumni jobs, etc.).
 * @param {object[]} rows
 * @param {{ kind?: 'job' | 'internship' }} [options]
 */
export function buildStudentOpportunityCsvPayload(rows, options = {}) {
  const { kind = 'internship' } = options;
  const includeCgpa = kind !== 'job';

  const headers = ['Company', 'Role', 'Salary Min (INR/mo)', 'Salary Max (INR/mo)'];
  if (includeCgpa) headers.push('Min CGPA');
  if (kind === 'internship') headers.push('Start Date', 'End Date');
  headers.push('Openings', 'Application Deadline', 'Status');

  const csvRows = (rows || []).map((row) => {
    const cells = [
      row.companyName || '',
      row.title || '',
      row.salaryMin != null ? formatCurrency(row.salaryMin) : '',
      row.salaryMax != null ? formatCurrency(row.salaryMax) : '',
    ];
    if (includeCgpa) {
      cells.push(row.minCgpa != null ? String(row.minCgpa) : '');
    }
    if (kind === 'internship') {
      cells.push(
        row.startDate ? formatDate(row.startDate) : '',
        row.endDate ? formatDate(row.endDate) : '',
      );
    }
    cells.push(
      row.vacancies != null ? String(row.vacancies) : '',
      row.applicationDeadline ? formatDate(row.applicationDeadline) : '',
      opportunityStatusLabel(row),
    );
    return cells;
  });

  return { headers, rows: csvRows };
}

function exportFilenameStem(row, kind) {
  const parts = [row.companyName, row.title].filter(Boolean).join('_');
  const slug = String(parts || kind)
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
  return slug || kind;
}

/**
 * Field/value CSV for a single opportunity (job detail download).
 * @param {object} row
 * @param {{ kind?: 'job' | 'internship' }} [options]
 */
export function buildSingleStudentOpportunityCsvPayload(row, options = {}) {
  const { kind = 'job' } = options;
  if (!row) return { headers: ['Field', 'Value'], rows: [] };

  const headers = ['Field', 'Value'];
  const paySuffix = kind === 'job' ? ' (INR/mo)' : ' (INR/mo)';
  const rows = [
    ['Company', row.companyName || ''],
    ['Role', row.title || ''],
    ['Website', row.website || ''],
    ['Job Type', row.jobType || kind],
    [
      `Salary Min${paySuffix}`,
      row.salaryMin != null ? formatCurrency(row.salaryMin) : '',
    ],
    [
      `Salary Max${paySuffix}`,
      row.salaryMax != null ? formatCurrency(row.salaryMax) : '',
    ],
  ];

  if (kind !== 'job' && row.minCgpa != null) {
    rows.push(['Min CGPA', String(row.minCgpa)]);
  }
  if (kind === 'internship') {
    rows.push(
      ['Start Date', row.startDate ? formatDate(row.startDate) : ''],
      ['End Date', row.endDate ? formatDate(row.endDate) : ''],
    );
  }

  rows.push(
    ['Openings', row.vacancies != null ? String(row.vacancies) : ''],
    ['Application Deadline', row.applicationDeadline ? formatDate(row.applicationDeadline) : ''],
    ['Application Status', opportunityStatusLabel(row)],
    ['Skills Required', Array.isArray(row.skillsRequired) ? row.skillsRequired.join('; ') : ''],
    ['Description', row.description?.trim() || ''],
  );

  return { headers, rows };
}

/** Trigger browser download of one opportunity as CSV. */
export function downloadStudentOpportunityCsv(row, options = {}) {
  const { kind = 'job' } = options;
  const payload = buildSingleStudentOpportunityCsvPayload(row, { kind });
  const csv = rowsToCsv(payload.headers, payload.rows);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(`${exportFilenameStem(row, kind)}_${stamp}`, csv);
}
