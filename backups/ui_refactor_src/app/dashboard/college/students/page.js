'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { formatStatus, getStatusColor } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { ImportCsvSplitButton } from '@/components/import/ImportCsvSplitButton';
import { parseCsv, downloadCsvFromRows } from '@/lib/csvExport';
import {
  CURRENT_ACADEMIC_YEAR,
  CURRENT_SEMESTER,
  STUDENT_CSV_HEADERS,
  studentToCsvRow,
  studentCsvTemplateExampleRow,
  validateStudentCsvHeaders,
  parseStudentRow,
  normalizeStudentRollKey,
} from '@/lib/collegeStudentsCsv';
import { useToast } from '@/components/ToastProvider';

function mergeImportedStudents(prev, imported) {
  const byRoll = new Map(
    prev.map((s) => [normalizeStudentRollKey(s.roll), { ...s, skills: [...s.skills] }]),
  );
  let maxId = prev.reduce((m, s) => Math.max(m, s.id), 0);
  for (const u of imported) {
    const key = normalizeStudentRollKey(u.roll);
    if (byRoll.has(key)) {
      const ex = byRoll.get(key);
      byRoll.set(key, {
        ...ex,
        ...u,
        id: ex.id,
        skills: [...u.skills],
      });
    } else {
      maxId += 1;
      byRoll.set(key, { ...u, id: maxId, skills: [...u.skills] });
    }
  }
  return Array.from(byRoll.values());
}

export default function CollegeStudentsPage() {
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('');
  const [internshipStatusFilter, setInternshipStatusFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [detailStudent, setDetailStudent] = useState(null);
  const [importBusy, setImportBusy] = useState(false);

  const reloadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/college/students');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load students');
      setStudents(Array.isArray(json) ? json : []);
    } catch (error) {
      addToast(error.message || 'Failed to load students', 'error');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    reloadStudents();
  }, [reloadStudents]);

  const setStudentVerified = useCallback(
    async (profileId, approve) => {
      try {
        const res = await fetch('/api/college/students/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentProfileId: profileId, approve }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Update failed');
        addToast(approve ? 'Student verified.' : 'Verification cleared.', 'success');
        setStudents((prev) => prev.map((s) => (s.id === profileId ? { ...s, verified: approve } : s)));
        setDetailStudent((d) => (d && d.id === profileId ? { ...d, verified: approve } : d));
      } catch (e) {
        addToast(e.message || 'Failed', 'error');
      }
    },
    [addToast],
  );

  const filtered = useMemo(() => students.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.roll.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && s.dept !== deptFilter) return false;
    if (jobStatusFilter && s.jobStatus !== jobStatusFilter) return false;
    if (internshipStatusFilter && s.internshipStatus !== internshipStatusFilter) return false;
    if (specializationFilter && s.specialization !== specializationFilter) return false;
    if (semesterFilter && s.semester !== semesterFilter) return false;
    if (skillFilter && !s.skills.some((skill) => skill.toLowerCase().includes(skillFilter.toLowerCase()))) return false;
    return true;
  }), [students, search, deptFilter, jobStatusFilter, internshipStatusFilter, specializationFilter, semesterFilter, skillFilter]);

  const getStudentCsv = useCallback((scope) => {
    const list = scope === 'current' ? filtered : students;
    const headers = [...STUDENT_CSV_HEADERS];
    const rows = list.map((s) => studentToCsvRow(s));
    return { headers, rows };
  }, [filtered, students]);

  const uniqueSpecializations = useMemo(
    () => Array.from(new Set(students.map((s) => s.specialization))),
    [students],
  );

  const uniqueDepartments = useMemo(
    () => Array.from(new Set(students.map((s) => s.dept).filter(Boolean))),
    [students],
  );

  const uniqueSemesters = useMemo(
    () => Array.from(new Set(students.map((s) => s.semester).filter(Boolean))),
    [students],
  );

  const downloadTemplate = useCallback(() => {
    downloadCsvFromRows(
      'students_import_template',
      [...STUDENT_CSV_HEADERS],
      [studentCsvTemplateExampleRow()],
    );
  }, []);

  const onImportFile = useCallback(
    async (file) => {
      setImportBusy(true);
      try {
        const text = await file.text();
        const { headers, rows } = parseCsv(text);
        const check = validateStudentCsvHeaders(headers);
        if (!check.ok) {
          addToast(check.error, 'error');
          return;
        }
        const { idx } = check;
        const imported = [];
        const errors = [];
        rows.forEach((cells, i) => {
          const line = i + 2;
          const r = parseStudentRow(cells, idx, line);
          if (!r.ok) errors.push(r.error);
          else imported.push(r.student);
        });
        if (errors.length) {
          addToast(errors.slice(0, 5).join(' · '), 'error');
          if (errors.length > 5) addToast(`…and ${errors.length - 5} more issues`, 'warning');
          return;
        }
        if (imported.length === 0) {
          addToast('No data rows found in CSV', 'warning');
          return;
        }
        const byRollInFile = new Map();
        for (const row of imported) {
          byRollInFile.set(normalizeStudentRollKey(row.roll), row);
        }
        const uniqueImported = Array.from(byRollInFile.values());
        const duplicateRowsInFile = imported.length - uniqueImported.length;

        setStudents((prev) => mergeImportedStudents(prev, uniqueImported));
        const msg =
          duplicateRowsInFile > 0
            ? `Updated roster from ${uniqueImported.length} unique roll number(s); ${duplicateRowsInFile} duplicate row(s) in file used last value per roll`
            : `Imported ${uniqueImported.length} row(s); insert or update by roll number`;
        addToast(msg, duplicateRowsInFile > 0 ? 'warning' : 'success');
      } catch {
        addToast('Could not read CSV file', 'error');
      } finally {
        setImportBusy(false);
      }
    },
    [addToast],
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🎓 Manage Students</h1>
          <p>
            Academic year <strong className="font-mono">{CURRENT_ACADEMIC_YEAR}</strong>
            {' · '}
            Semester <strong className="font-mono">{CURRENT_SEMESTER}</strong>
            {' — '}
            Export and import use the same CSV columns (all fields). Click a row to open the full profile.
          </p>
        </div>
      </div>

      <div
        className="card students-csv-toolbar"
        style={{
          marginBottom: '1rem',
          padding: '0.875rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div className="text-sm text-secondary" style={{ maxWidth: '36rem', lineHeight: 1.45 }}>
          <strong className="text-primary">CSV</strong>
          {' — '}
          Export or import the full roster (job and internship status, diversity category, etc.). Matches filters for export when views differ.
        </div>
        <div className="students-csv-toolbar-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <ExportCsvSplitButton
            filenameBase="students"
            currentCount={filtered.length}
            fullCount={students.length}
            getRows={getStudentCsv}
          />
          <ImportCsvSplitButton
            onFileSelected={onImportFile}
            onDownloadTemplate={downloadTemplate}
            busy={importBusy}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="form-input" placeholder="🔍 Search by name or roll..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
          <input className="form-input" placeholder="💡 Search by skill..." value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} style={{ maxWidth: 180 }} />
          <select className="form-select" style={{ width: 'auto' }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {uniqueDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={specializationFilter} onChange={(e) => setSpecializationFilter(e.target.value)}>
            <option value="">All Specializations</option>
            {uniqueSpecializations.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
            <option value="">All Semesters</option>
            {uniqueSemesters.map((sem) => (
              <option key={sem} value={sem}>{`Semester ${sem}`}</option>
            ))}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)}>
            <option value="">All job statuses</option>
            <option value="unplaced">Job: Unplaced</option>
            <option value="placed">Job: Placed</option>
            <option value="opted_out">Job: Opted out</option>
            <option value="higher_studies">Job: Higher studies</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={internshipStatusFilter} onChange={(e) => setInternshipStatusFilter(e.target.value)}>
            <option value="">All internship statuses</option>
            <option value="none">Internship: None</option>
            <option value="ongoing">Internship: Ongoing</option>
            <option value="completed">Internship: Completed</option>
          </select>
          <div className="text-sm text-secondary">{filtered.length} students</div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>#</th>
              <th>Student</th>
              <th>Roll</th>
              <th>Dept</th>
              <th>Specialization</th>
              <th>Sem</th>
              <th>CGPA</th>
              <th>Job</th>
              <th>Internship</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, index) => (
              <tr
                key={s.id}
                role="button"
                tabIndex={0}
                className="student-row-clickable"
                onClick={() => setDetailStudent(s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailStudent(s);
                  }
                }}
              >
                <td style={{ color: 'var(--text-tertiary)' }}>{index + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {s.photo ? (
                      <img
                        src={s.photo}
                        alt={`${s.name} profile`}
                        width={32}
                        height={32}
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-default)' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--gray-200)',
                          border: '1px solid var(--border-default)',
                        }}
                      />
                    )}
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-tertiary">{s.skills.slice(0, 2).join(', ')}</div>
                    </div>
                  </div>
                </td>
                <td className="text-sm font-mono">{s.roll}</td>
                <td className="text-sm">{s.dept}</td>
                <td><span className="badge badge-indigo">{s.specialization}</span></td>
                <td className="text-sm font-mono">{s.semester || '—'}</td>
                <td><span className="font-bold" style={{ color: s.cgpa >= 8 ? 'var(--success-600)' : 'inherit' }}>{s.cgpa ?? '—'}</span></td>
                <td><span className={`badge badge-${getStatusColor(s.jobStatus)} badge-dot`}>{formatStatus(s.jobStatus)}</span></td>
                <td><span className={`badge badge-${getStatusColor(s.internshipStatus)} badge-dot`}>{formatStatus(s.internshipStatus)}</span></td>
                <td>{s.verified ? <span className="badge badge-green">Verified</span> : <span className="badge badge-amber">Pending</span>}</td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-secondary">No students found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detailStudent && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailStudent(null);
          }}
        >
          <div className="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="student-detail-title">
            <div className="modal-header">
              <h2 className="modal-title" id="student-detail-title">Student record</h2>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setDetailStudent(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                {detailStudent.photo ? (
                  <img
                    src={detailStudent.photo}
                    alt=""
                    width={72}
                    height={72}
                    style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-default)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'var(--gray-200)',
                      border: '1px solid var(--border-default)',
                    }}
                  />
                )}
                <div>
                  <div className="text-lg font-semibold">{detailStudent.name}</div>
                  <div className="text-sm text-secondary font-mono">{detailStudent.roll}</div>
                  <div className="text-sm text-secondary mt-1">
                    {detailStudent.academicYear}
                    {' · '}
                    Semester
                    {' '}
                    {detailStudent.semester}
                  </div>
                </div>
              </div>
              <dl className="student-detail-dl">
                <dt>Department</dt>
                <dd>{detailStudent.dept}</dd>
                <dt>Specialization</dt>
                <dd>{detailStudent.specialization}</dd>
                <dt>CGPA</dt>
                <dd>{detailStudent.cgpa}</dd>
                <dt>Skills</dt>
                <dd>{detailStudent.skills.length ? detailStudent.skills.join(', ') : '—'}</dd>
                <dt>Job status</dt>
                <dd><span className={`badge badge-${getStatusColor(detailStudent.jobStatus)} badge-dot`}>{formatStatus(detailStudent.jobStatus)}</span></dd>
                <dt>Internship status</dt>
                <dd><span className={`badge badge-${getStatusColor(detailStudent.internshipStatus)} badge-dot`}>{formatStatus(detailStudent.internshipStatus)}</span></dd>
                <dt>Verified</dt>
                <dd>{detailStudent.verified ? 'Yes' : 'No'}</dd>
                <dt>Gender</dt>
                <dd>{detailStudent.gender}</dd>
                <dt>Disability status</dt>
                <dd>{detailStudent.disabilityStatus}</dd>
                <dt>Diversity category</dt>
                <dd>{detailStudent.diversityCategory}</dd>
                <dt>Photo URL</dt>
                <dd style={{ wordBreak: 'break-all' }}>{detailStudent.photo}</dd>
              </dl>
            </div>
            <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
              {detailStudent.verified ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStudentVerified(detailStudent.id, false)}
                >
                  Clear verification
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => setStudentVerified(detailStudent.id, true)}
                >
                  Approve / verify student
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setDetailStudent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
