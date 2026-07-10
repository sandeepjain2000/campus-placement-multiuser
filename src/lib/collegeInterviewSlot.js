import { toDateOnlyString } from '@/lib/dateOnly';

export function parseCollegeInterviewMeta(description) {
  if (!description) {
    return {
      company: '',
      round: '',
      startTime: '',
      endTime: '',
      interviewer: '',
      panelNames: '',
      students: [],
      createdBy: 'TPO',
    };
  }
  try {
    const parsed = JSON.parse(description);
    return {
      company: parsed.company || '',
      round: parsed.round || '',
      startTime: parsed.startTime || '',
      endTime: parsed.endTime || '',
      interviewer: parsed.interviewer || '',
      panelNames: parsed.panelNames || '',
      students: Array.isArray(parsed.students) ? parsed.students : [],
      createdBy: parsed.createdBy || 'TPO',
    };
  } catch {
    return {
      company: '',
      round: '',
      startTime: '',
      endTime: '',
      interviewer: '',
      panelNames: '',
      students: [],
      createdBy: 'TPO',
    };
  }
}

export function mapCollegeInterviewRow(row) {
  const meta = parseCollegeInterviewMeta(row.description);
  return {
    id: row.id,
    company: meta.company || row.title || '',
    round: meta.round || '',
    date: toDateOnlyString(row.start_date),
    startTime: meta.startTime,
    endTime: meta.endTime,
    interviewer: meta.interviewer,
    panelNames: meta.panelNames,
    students: meta.students,
    createdBy: meta.createdBy,
  };
}

export function buildCollegeInterviewDescription(fields) {
  const {
    company,
    round,
    startTime,
    endTime,
    interviewer,
    panelNames,
    students,
    createdBy,
  } = fields;
  return JSON.stringify({
    company,
    round,
    startTime,
    endTime,
    interviewer,
    panelNames,
    students,
    createdBy,
  });
}
