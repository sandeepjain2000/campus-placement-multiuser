'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Play, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

function defaultFailedBatch(batchYear, graduationYear) {
  const batch = batchYear != null ? Number(batchYear) : null;
  const grad = graduationYear != null ? Number(graduationYear) : null;
  return {
    newBatchYear: batch != null ? String(batch + 1) : '',
    newGraduationYear: grad != null ? String(grad + 1) : '',
  };
}

function rowKey(student) {
  return String(student.studentId);
}

export default function SemesterRolloverPanel() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({});
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const syncEditsFromRoster = useCallback((students) => {
    const next = {};
    for (const s of students || []) {
      next[rowKey(s)] = {
        repeatYear: Boolean(s.repeatYear),
        newBatchYear:
          s.adjustment?.newBatchYear != null
            ? String(s.adjustment.newBatchYear)
            : s.nextBatchYear != null && s.repeatYear
              ? String(s.nextBatchYear)
              : '',
        newGraduationYear:
          s.adjustment?.newGraduationYear != null
            ? String(s.adjustment.newGraduationYear)
            : s.nextGraduationYear != null && s.repeatYear
              ? String(s.nextGraduationYear)
              : '',
        notes: s.notes || s.adjustment?.notes || '',
      };
    }
    setEdits(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/college/students/semester-rollover');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load rollover status');
      setData(json);
      syncEditsFromRoster(json.roster?.students);
    } catch (e) {
      addToast(e.message || 'Failed to load rollover status', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, syncEditsFromRoster]);

  useEffect(() => {
    load();
  }, [load]);

  const setEdit = (studentId, patch) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...patch },
    }));
  };

  const toggleFailed = (student) => {
    const id = rowKey(student);
    const current = edits[id] || {};
    const nextRepeat = !current.repeatYear;
    if (nextRepeat) {
      const defaults = defaultFailedBatch(student.batchYear, student.graduationYear);
      setEdit(id, { repeatYear: true, ...defaults });
    } else {
      setEdit(id, {
        repeatYear: false,
        newBatchYear: '',
        newGraduationYear: '',
        notes: '',
      });
    }
  };

  const saveAdjustments = async ({ silent = false } = {}) => {
    setSaving(true);
    try {
      const adjustments = Object.entries(edits).map(([studentId, row]) => ({
        studentId,
        repeatYear: Boolean(row.repeatYear),
        newBatchYear: row.repeatYear ? row.newBatchYear : null,
        newGraduationYear: row.repeatYear ? row.newGraduationYear : null,
        notes: row.notes || '',
      }));

      const res = await fetch('/api/college/students/semester-rollover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYearLabel: data?.academicYearLabel,
          semesterInYear: data?.semesterInYear,
          adjustments,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save adjustments');
      if (!silent) addToast('Failed-student batch changes saved.', 'success');
      await load();
      return true;
    } catch (e) {
      if (!silent) addToast(e.message || 'Failed to save adjustments', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runRollover = async ({ dryRun = false, force = false } = {}) => {
    setRunning(true);
    try {
      const saved = await saveAdjustments({ silent: true });
      if (!saved) return;
      const res = await fetch('/api/college/students/semester-rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, force }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Rollover failed');

      if (dryRun) {
        addToast(
          `Preview: ${json.studentsUpdated ?? 0} update(s), ${json.failedStudents ?? 0} batch change(s)`,
          'info',
        );
      } else {
        addToast(
          `Rollover complete — ${json.studentsUpdated ?? 0} student(s), ${json.failedStudents ?? 0} batch change(s)`,
          'success',
        );
      }
      await load();
    } catch (e) {
      addToast(e.message || 'Rollover failed', 'error');
    } finally {
      setRunning(false);
    }
  };

  const preview = data?.preview;
  const roster = data?.roster;
  const inWindow = data?.inRolloverWindow;

  const visibleStudents = useMemo(() => {
    let rows = roster?.students || [];
    if (showFailedOnly) rows = rows.filter((s) => edits[rowKey(s)]?.repeatYear);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) =>
          String(s.name || '').toLowerCase().includes(q) ||
          String(s.rollNumber || '').toLowerCase().includes(q) ||
          String(s.email || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [roster?.students, showFailedOnly, edits, search]);

  const failedDraftCount = Object.values(edits).filter((e) => e.repeatYear).length;

  return (
    <section className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Semester rollover (May–June)
          </h2>
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              maxWidth: '52rem',
            }}
          >
            Mark students who failed and update their batch before running rollover. Default for
            failed students shifts batch and graduation year by one so semester progression stays
            aligned while they repeat the year.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={load}
            disabled={loading || running || saving}
          >
            <RefreshCw size={14} style={{ marginRight: '0.25rem' }} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => saveAdjustments()}
            disabled={loading || running || saving}
          >
            <Save size={14} style={{ marginRight: '0.25rem' }} />
            {saving ? 'Saving…' : 'Save failed list'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => runRollover({ dryRun: true, force: true })}
            disabled={loading || running || saving}
          >
            Preview
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => runRollover({ force: !inWindow })}
            disabled={loading || running || saving}
          >
            <Play size={14} style={{ marginRight: '0.25rem' }} />
            {running ? 'Running…' : 'Run rollover'}
          </button>
        </div>
      </div>

      {!inWindow && !loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--warning-50)',
            border: '1px solid var(--warning-100)',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <span>
            Automated rollover is scheduled for <strong>May–June</strong>. Save failed-student
            batch changes first, then preview or run rollover.
          </span>
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>
      ) : preview ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {[
            ['Academic year', preview.academicYearLabel],
            ['Semester in year', preview.semesterInYear],
            ['Students', preview.studentsScanned],
            ['Failed marked', roster?.failedCount ?? failedDraftCount],
            ['Batch changes', preview.failedStudents ?? roster?.pendingBatchChanges ?? 0],
            ['Semester updates', preview.studentsUpdated ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-tertiary)',
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {value ?? '—'}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {roster?.students?.length ? (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <input
              className="form-input"
              placeholder="Search name, roll, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={showFailedOnly}
                onChange={(e) => setShowFailedOnly(e.target.checked)}
              />
              Show failed only ({failedDraftCount})
            </label>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table className="data-table" style={{ fontSize: '0.85rem', minWidth: 920 }}>
              <thead>
                <tr>
                  <th>Failed</th>
                  <th>Student</th>
                  <th>Roll</th>
                  <th>Current batch</th>
                  <th>Grad year</th>
                  <th>Sem</th>
                  <th>New batch</th>
                  <th>New grad</th>
                  <th>After rollover</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => {
                  const id = rowKey(student);
                  const edit = edits[id] || {};
                  const failed = Boolean(edit.repeatYear);
                  return (
                    <tr key={id} style={failed ? { background: 'var(--warning-50)' } : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={failed}
                          onChange={() => toggleFailed(student)}
                          aria-label={`Mark ${student.name || student.rollNumber} as failed`}
                        />
                      </td>
                      <td>{student.name || '—'}</td>
                      <td>{student.rollNumber || '—'}</td>
                      <td>{student.batchYear ?? '—'}</td>
                      <td>{student.graduationYear ?? '—'}</td>
                      <td>{student.previousSemester ?? '—'}</td>
                      <td>
                        <input
                          className="form-input"
                          style={{ width: 88, padding: '0.35rem 0.5rem' }}
                          disabled={!failed}
                          value={edit.newBatchYear ?? ''}
                          onChange={(e) => setEdit(id, { newBatchYear: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ width: 88, padding: '0.35rem 0.5rem' }}
                          disabled={!failed}
                          value={edit.newGraduationYear ?? ''}
                          onChange={(e) => setEdit(id, { newGraduationYear: e.target.value })}
                        />
                      </td>
                      <td>
                        {failed ? (
                          <span>
                            Sem {student.nextSemester ?? '—'}
                            {student.batchChanged ? (
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                                · batch {student.nextBatchYear}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span>Sem {student.nextSemester ?? student.previousSemester ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {Array.isArray(data?.recentRuns) && data.recentRuns.length > 0 ? (
        <>
          <h3
            style={{
              margin: '0 0 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-tertiary)',
            }}
          >
            Recent runs
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Academic year</th>
                  <th>Sem</th>
                  <th>Updated</th>
                  <th>Trigger</th>
                </tr>
              </thead>
              <tbody>
                {data.recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.asOfDate || '—'}</td>
                    <td>{run.academicYearLabel}</td>
                    <td>{run.semesterInYear}</td>
                    <td>
                      {run.studentsUpdated} / {run.studentsScanned}
                    </td>
                    <td>{run.triggeredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
