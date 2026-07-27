import { applyEmailTemplate } from '@/lib/emailTemplateRender';

/** Normalize message_templates.variables from API / forms. */
export function parseMessageTemplateVariables(variables) {
  if (Array.isArray(variables)) {
    return variables.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof variables === 'string') {
    const trimmed = variables.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    return trimmed
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function variablesToFormText(variables) {
  return parseMessageTemplateVariables(variables).join(', ');
}

/** Collect {{placeholder}} names from template strings. */
export function extractTemplatePlaceholders(...texts) {
  const names = new Set();
  for (const text of texts) {
    const s = String(text || '');
    for (const match of s.matchAll(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g)) {
      names.add(match[1]);
    }
  }
  return [...names];
}

/** Demo values for common campus-placement placeholders. */
const SAMPLE_MESSAGE_VARS = {
  studentName: 'Aarav Sharma',
  student_name: 'Aarav Sharma',
  firstName: 'Aarav',
  lastName: 'Sharma',
  rollNumber: 'CS2024-042',
  email: 'aarav.sharma@example.edu',
  driveTitle: 'Campus Drive — Software Engineer',
  drive_title: 'Campus Drive — Software Engineer',
  companyName: 'Acme Technologies',
  company_name: 'Acme Technologies',
  jobTitle: 'Software Engineer',
  role: 'Software Engineer',
  collegeName: 'IIT Example',
  college_name: 'IIT Example',
  interviewDate: '28 Jul 2026',
  interviewTime: '10:30 AM IST',
  location: 'Main Auditorium / Online',
  offerDeadline: '5 Aug 2026',
  ctc: '12 LPA',
  package: '12 LPA',
};

/**
 * Build sample substitution map for declared vars + any {{…}} found in subject/body.
 * @param {{ subject?: string, body?: string, variables?: string[] | string }} opts
 * @returns {Record<string, string>}
 */
export function buildSampleMessageTemplateVars(opts = {}) {
  const declared = parseMessageTemplateVariables(opts.variables);
  const found = extractTemplatePlaceholders(opts.subject, opts.body);
  const names = [...new Set([...declared, ...found])];
  /** @type {Record<string, string>} */
  const vars = {};
  for (const name of names) {
    vars[name] =
      SAMPLE_MESSAGE_VARS[name]
      || SAMPLE_MESSAGE_VARS[name.toLowerCase()]
      || `Sample ${name}`;
  }
  return vars;
}

/**
 * Render subject/body with sample data for UI preview.
 * @param {{ name?: string, subject?: string, body?: string, variables?: string[] | string }} opts
 */
export function previewMessageTemplateWithSample(opts = {}) {
  const sampleVars = buildSampleMessageTemplateVars(opts);
  return {
    name: opts.name || 'Template preview',
    sampleVars,
    subject: applyEmailTemplate(opts.subject || '', sampleVars),
    body: applyEmailTemplate(opts.body || '', sampleVars),
  };
}
