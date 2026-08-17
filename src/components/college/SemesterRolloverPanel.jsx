'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Play, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

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
    <Card className="mt-6">
      <CardHeader>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <CardTitle>
            Semester rollover (May–June)
          </CardTitle>
          <CardDescription className="mt-1 max-w-3xl">
            Mark students who failed and update their batch before running rollover. Default for
            failed students shifts batch and graduation year by one so semester progression stays
            aligned while they repeat the year.
          </CardDescription>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading || running || saving}
          >
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => saveAdjustments()}
            disabled={loading || running || saving}
          >
            <Save data-icon="inline-start" />
            {saving ? 'Saving…' : 'Save failed list'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => runRollover({ dryRun: true, force: true })}
            disabled={loading || running || saving}
          >
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => runRollover({ force: !inWindow })}
            disabled={loading || running || saving}
          >
            <Play data-icon="inline-start" />
            {running ? 'Running…' : 'Run rollover'}
          </Button>
        </div>
      </div>
      </CardHeader>
      <CardContent>

      {!inWindow && !loading ? (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/5">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Outside the scheduled rollover window</AlertTitle>
          <AlertDescription>
            Automated rollover is scheduled for <strong>May–June</strong>. Save failed-student
            batch changes first, then preview or run rollover.
          </AlertDescription>
        </Alert>
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
            <Input
              placeholder="Search name, roll, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Checkbox
                checked={showFailedOnly}
                onCheckedChange={(v) => setShowFailedOnly(!!v)}
              />
              Show failed only ({failedDraftCount})
            </label>
          </div>

          <div className="mb-4">
            <Table className="min-w-[920px] text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Failed</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Current batch</TableHead>
                  <TableHead>Grad year</TableHead>
                  <TableHead>Sem</TableHead>
                  <TableHead>New batch</TableHead>
                  <TableHead>New grad</TableHead>
                  <TableHead>After rollover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleStudents.map((student) => {
                  const id = rowKey(student);
                  const edit = edits[id] || {};
                  const failed = Boolean(edit.repeatYear);
                  return (
                    <TableRow key={id} data-state={failed ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={failed}
                          onCheckedChange={() => toggleFailed(student)}
                          aria-label={`Mark ${student.name || student.rollNumber} as failed`}
                        />
                      </TableCell>
                      <TableCell>{student.name || '—'}</TableCell>
                      <TableCell>{student.rollNumber || '—'}</TableCell>
                      <TableCell>{student.batchYear ?? '—'}</TableCell>
                      <TableCell>{student.graduationYear ?? '—'}</TableCell>
                      <TableCell>{student.previousSemester ?? '—'}</TableCell>
                      <TableCell>
                        <Input
                          className="w-22"
                          disabled={!failed}
                          value={edit.newBatchYear ?? ''}
                          onChange={(e) => setEdit(id, { newBatchYear: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-22"
                          disabled={!failed}
                          value={edit.newGraduationYear ?? ''}
                          onChange={(e) => setEdit(id, { newGraduationYear: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
          <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Academic year</TableHead>
                  <TableHead>Sem</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Trigger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.asOfDate || '—'}</TableCell>
                    <TableCell>{run.academicYearLabel}</TableCell>
                    <TableCell>{run.semesterInYear}</TableCell>
                    <TableCell>
                      {run.studentsUpdated} / {run.studentsScanned}
                    </TableCell>
                    <TableCell>{run.triggeredBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </>
      ) : null}
      </CardContent>
    </Card>
  );
}
