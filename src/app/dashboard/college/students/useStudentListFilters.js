'use client';

import { useMemo, useState } from 'react';
import {
  listAdmissionBatchYears,
  normalizeAdmissionBatchLabel,
} from '@/lib/admissionBatchYear';
import {
  SECTION_COMPLETION_FILTER_OPTIONS,
  studentMatchesSectionFilters,
  countStudentsBySectionRange,
} from '@/lib/studentProfileSections';

/** Filter value for students with no joining batch on record. */
export const NO_BATCH_FILTER = '__no_batch__';

export function studentBatchLabel(student) {
  return normalizeAdmissionBatchLabel(student?.batch || student?.joiningAcademicYear || '');
}

export const JOB_STATUS_OPTIONS = [
  { value: 'unplaced', label: 'Unplaced' },
  { value: 'placed', label: 'Placed' },
  { value: 'opted_out', label: 'Opted out' },
  { value: 'higher_studies', label: 'Higher studies' },
];

export const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A → Z)' },
  { value: 'name_desc', label: 'Name (Z → A)' },
  { value: 'cgpa_desc', label: 'CGPA (high → low)' },
  { value: 'cgpa_asc', label: 'CGPA (low → high)' },
  { value: 'roll_asc', label: 'Roll / system ID' },
  { value: 'dept_asc', label: 'Department' },
  { value: 'degree_asc', label: 'Degree pursued' },
  { value: 'batch_asc', label: 'Batch' },
  { value: 'verified_first', label: 'Verified first' },
  { value: 'unverified_first', label: 'Unverified first' },
];

function compareNullableNumber(a, b, dir = 1) {
  const na = a == null ? -Infinity : Number(a);
  const nb = b == null ? -Infinity : Number(b);
  if (na === nb) return 0;
  return na < nb ? -dir : dir;
}

export function sortStudents(list, sortBy) {
  const items = [...list];
  items.sort((a, b) => {
    switch (sortBy) {
      case 'name_desc':
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      case 'cgpa_desc':
        return compareNullableNumber(b.cgpa, a.cgpa);
      case 'cgpa_asc':
        return compareNullableNumber(a.cgpa, b.cgpa);
      case 'roll_asc': {
        const ar = (a.systemId || a.roll || '').toLowerCase();
        const br = (b.systemId || b.roll || '').toLowerCase();
        return ar.localeCompare(br, undefined, { numeric: true });
      }
      case 'dept_asc':
        return (a.dept || '').localeCompare(b.dept || '', undefined, { sensitivity: 'base' });
      case 'degree_asc':
        return (a.degreePursued || '').localeCompare(b.degreePursued || '', undefined, { sensitivity: 'base' });
      case 'batch_asc':
        return studentBatchLabel(a).localeCompare(studentBatchLabel(b), undefined, {
          sensitivity: 'base',
          numeric: true,
        });
      case 'verified_first':
        return Number(b.verified) - Number(a.verified);
      case 'unverified_first':
        return Number(a.verified) - Number(b.verified);
      case 'name_asc':
      default:
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
  });
  return items;
}

export function useStudentListFilters(students) {
  const [search, setSearch] = useState('');
  const [deptFilters, setDeptFilters] = useState([]);
  const [degreeFilters, setDegreeFilters] = useState([]);
  const [batchFilters, setBatchFilters] = useState([]);
  const [jobStatusFilters, setJobStatusFilters] = useState([]);
  const [sectionFilters, setSectionFilters] = useState([]);
  const [sortBy, setSortBy] = useState('name_asc');
  const [sortOpen, setSortOpen] = useState(false);

  const uniqueDepartments = useMemo(() => {
    const seen = new Map();
    for (const s of students) {
      const d = (s.dept || '').trim();
      if (!d) continue;
      const key = d.toLowerCase();
      if (!seen.has(key)) seen.set(key, d);
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [students]);

  const departmentOptions = useMemo(
    () => uniqueDepartments.map((d) => ({ value: d, label: d })),
    [uniqueDepartments],
  );

  const uniqueDegrees = useMemo(() => {
    const seen = new Map();
    for (const s of students) {
      const d = (s.degreePursued || '').trim();
      if (!d) continue;
      const key = d.toLowerCase();
      if (!seen.has(key)) seen.set(key, d);
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [students]);

  const degreeOptions = useMemo(
    () => uniqueDegrees.map((d) => ({ value: d, label: d })),
    [uniqueDegrees],
  );

  const uniqueBatches = useMemo(() => {
    const seen = new Map();
    const add = (raw) => {
      const b = normalizeAdmissionBatchLabel(raw);
      if (!b) return;
      if (!seen.has(b)) seen.set(b, b);
    };
    for (const year of listAdmissionBatchYears()) add(String(year));
    for (const s of students) add(studentBatchLabel(s));
    return Array.from(seen.values()).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  const hasUnbatchedStudents = useMemo(
    () => students.some((s) => !studentBatchLabel(s)),
    [students],
  );

  const batchOptions = useMemo(() => {
    const opts = uniqueBatches.map((b) => ({ value: b, label: b }));
    if (hasUnbatchedStudents) {
      opts.push({ value: NO_BATCH_FILTER, label: 'No batch set' });
    }
    return opts;
  }, [uniqueBatches, hasUnbatchedStudents]);

  const filtered = useMemo(() => {
    const matched = students.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        const hitName = s.name.toLowerCase().includes(q);
        const hitRoll = (s.roll || '').toLowerCase().includes(q);
        const hitId = (s.systemId || '').toLowerCase().includes(q);
        const hitDegree = (s.degreePursued || '').toLowerCase().includes(q);
        const hitBatch = studentBatchLabel(s).toLowerCase().includes(q);
        if (!hitName && !hitRoll && !hitId && !hitDegree && !hitBatch) return false;
      }
      if (deptFilters.length && !deptFilters.includes(s.dept)) return false;
      if (degreeFilters.length && !degreeFilters.includes(s.degreePursued)) return false;
      if (batchFilters.length) {
        const label = studentBatchLabel(s);
        const matchBatch = label && batchFilters.includes(label);
        const matchUnbatched = batchFilters.includes(NO_BATCH_FILTER) && !label;
        if (!matchBatch && !matchUnbatched) return false;
      }
      if (jobStatusFilters.length && !jobStatusFilters.includes(s.jobStatus)) return false;
      if (!studentMatchesSectionFilters(s, sectionFilters)) return false;
      return true;
    });
    return sortStudents(matched, sortBy);
  }, [students, search, deptFilters, degreeFilters, batchFilters, jobStatusFilters, sectionFilters, sortBy]);

  const sectionRangeCounts = useMemo(
    () => countStudentsBySectionRange(students),
    [students],
  );

  const hasFilters =
    Boolean(search) ||
    deptFilters.length > 0 ||
    degreeFilters.length > 0 ||
    batchFilters.length > 0 ||
    jobStatusFilters.length > 0 ||
    sectionFilters.length > 0;

  const clearFilters = () => {
    setSearch('');
    setDeptFilters([]);
    setDegreeFilters([]);
    setBatchFilters([]);
    setJobStatusFilters([]);
    setSectionFilters([]);
  };

  return {
    search,
    setSearch,
    deptFilters,
    setDeptFilters,
    degreeFilters,
    setDegreeFilters,
    batchFilters,
    setBatchFilters,
    batchOptions,
    jobStatusFilters,
    setJobStatusFilters,
    sectionFilters,
    setSectionFilters,
    sectionFilterOptions: SECTION_COMPLETION_FILTER_OPTIONS,
    sectionRangeCounts,
    sortBy,
    setSortBy,
    sortOpen,
    setSortOpen,
    uniqueDepartments,
    departmentOptions,
    degreeOptions,
    filtered,
    hasFilters,
    clearFilters,
  };
}
