'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, FolderDot, GraduationCap, Target } from 'lucide-react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';
import { HIRING_RESULT_OPTIONS } from '@/lib/hiringResult';
import {
  campusPayloadFromRow,
  persistActiveCampus,
  readStoredActiveCampus,
} from '@/lib/employerActiveCampus';
import {
  fetchEmployerAssessmentTargetCounts,
  fetchEmployerAssessmentTargets,
  pickDefaultAssessmentTargetId,
} from '@/lib/employerAssessmentTargets';
import { shouldShowFilterCount } from '@/lib/filterBadgeLabel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function EmployerAssessmentUpdateOnlinePage() {
  const { addToast } = useToast();
  const pathname = usePathname();
  const isAlumni = pathname.includes('/alumni');
  const kindTabs = isAlumni
    ? [{ id: 'jobs', label: 'Alumni Jobs', icon: Briefcase }]
    : [
        { id: 'internship', label: 'Internship', icon: GraduationCap },
        { id: 'drive', label: 'Drive', icon: Target },
        { id: 'projects', label: 'Projects', icon: FolderDot },
      ];

  const [kindTab, setKindTab] = useState(isAlumni ? 'jobs' : 'internship');
  const [campusesLoading, setCampusesLoading] = useState(true);
  const [approvedCampuses, setApprovedCampuses] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [targets, setTargets] = useState([]);
  const [targetCounts, setTargetCounts] = useState({ internship: 0, jobs: 0, drive: 0, projects: 0 });
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetByKind, setTargetByKind] = useState({
    internship: '',
    jobs: '',
    drive: '',
    projects: '',
  });
  const selectedTargetId = targetByKind[kindTab] || '';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingResults, setSubmittingResults] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState('draft');
  const [dirtyIds, setDirtyIds] = useState(() => new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCampusesLoading(true);
      try {
        const res = await fetch('/api/employer/campuses');
        const json = await res.json();
        const approved = (Array.isArray(json.colleges) ? json.colleges : []).filter(
          (c) => String(c.approval_status || '').toLowerCase() === 'approved',
        );
        if (!mounted) return;
        setApprovedCampuses(approved);
        if (!selectedTenantId && approved.length) {
          const stored = readStoredActiveCampus();
          const match = stored?.id && approved.find((c) => String(c.id) === String(stored.id));
          if (match) {
            setSelectedTenantId(match.id);
          } else {
            setSelectedTenantId(approved[0].id);
            persistActiveCampus(campusPayloadFromRow(approved[0]));
          }
        }
      } catch {
        if (mounted) setApprovedCampuses([]);
      } finally {
        if (mounted) setCampusesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setTargetCounts({ internship: 0, jobs: 0, drive: 0, projects: 0 });
      return;
    }
    let mounted = true;
    void fetchEmployerAssessmentTargetCounts(selectedTenantId).then((counts) => {
      if (mounted) setTargetCounts(counts);
    });
    return () => {
      mounted = false;
    };
  }, [selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId) {
      setTargets([]);
      setTargetByKind({ internship: '', jobs: '', drive: '', projects: '' });
      return;
    }
    let mounted = true;
    setTargets([]);
    setTargetsLoading(true);
    (async () => {
      try {
        const list = await fetchEmployerAssessmentTargets(selectedTenantId, kindTab);
        if (!mounted) return;
        setTargets(list);
        setTargetCounts((prev) => ({ ...prev, [kindTab]: list.length }));
        setTargetByKind((prev) => ({
          ...prev,
          [kindTab]: pickDefaultAssessmentTargetId(list, prev[kindTab]),
        }));
      } catch (e) {
        if (mounted) {
          setTargets([]);
          addToast(e.message || 'Could not load targets', 'error');
        }
      } finally {
        if (mounted) setTargetsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedTenantId, kindTab, addToast]);

  const driveId = kindTab === 'drive' ? selectedTargetId : '';
  const jobId = kindTab !== 'drive' ? selectedTargetId : '';
  const isSubmitted = submissionStatus === 'submitted';

  const loadRows = useCallback(async () => {
    if (!selectedTenantId || !selectedTargetId || targetsLoading) {
      setRows([]);
      setSubmissionStatus('draft');
      return;
    }
    const targetValid = targets.some((t) => String(t.id) === String(selectedTargetId));
    if (targets.length > 0 && !targetValid) {
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        kind: kindTab,
        tenantId: selectedTenantId,
        ...(driveId ? { driveId } : {}),
        ...(jobId ? { jobId } : {}),
      });
      const res = await fetch(`/api/employer/assessment-update-online?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setRows(Array.isArray(json.rows) ? json.rows : []);
      setSubmissionStatus(json.submission_status || 'draft');
      setDirtyIds(new Set());
    } catch (e) {
      setRows([]);
      addToast(e.message || 'Could not load students', 'error');
    } finally {
      setLoading(false);
    }
  }, [kindTab, selectedTenantId, selectedTargetId, driveId, jobId, targets, targetsLoading, addToast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(rows, {
    getSearchText: (r) =>
      [r.system_id, r.college_roll_no, r.candidate_name, r.hiring_result, r.remarks].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const patchRow = (studentProfileId, field, value) => {
    setRows((prev) => prev.map((r) => (r.student_profile_id === studentProfileId ? { ...r, [field]: value } : r)));
    setDirtyIds((prev) => new Set(prev).add(studentProfileId));
  };

  const saveChanges = async () => {
    const changed = rows.filter((r) => dirtyIds.has(r.student_profile_id));
    if (!changed.length) {
      addToast('No changes to save.', 'warning');
      return;
    }
    if (isSubmitted) {
      addToast('Results are submitted and cannot be edited.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/employer/assessment-update-online', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: kindTab,
          tenantId: selectedTenantId,
          ...(driveId ? { driveId } : {}),
          ...(jobId ? { jobId } : {}),
          rows: changed,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Save failed');
      addToast(`Saved ${json.saved ?? changed.length} row(s).`, 'success');
      await loadRows();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestSubmitResults = () => {
    if (!selectedTenantId || !selectedTargetId) {
      addToast('Select campus and target before submitting.', 'warning');
      return;
    }
    setSubmitConfirmOpen(true);
  };

  const submitResults = async () => {
    setSubmittingResults(true);
    try {
      const res = await fetch('/api/employer/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: kindTab,
          tenantId: selectedTenantId,
          ...(driveId ? { driveId } : {}),
          ...(jobId ? { jobId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submit failed');
      setSubmissionStatus('submitted');
      setSubmitConfirmOpen(false);
      addToast('Results submitted.', 'success');
    } catch (e) {
      addToast(e.message || 'Submit failed', 'error');
    } finally {
      setSubmittingResults(false);
    }
  };

  const dirtyCount = dirtyIds.size;

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Assessment Update Online</h1>
          <p>
            Set <code>hiring_result</code> for campus students. Same data as{' '}
            <Link href="/dashboard/employer/assessment-uploads" style={{ fontWeight: 600 }}>
              Assessment uploads (CSV)
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={saving || dirtyCount === 0 || isSubmitted} onClick={() => void saveChanges()}>
            {saving ? 'Saving…' : dirtyCount > 0 ? `Save changes (${dirtyCount})` : 'Save changes'}
          </Button>
          <Button
            type="button"
            disabled={submittingResults || isSubmitted || !selectedTargetId}
            onClick={requestSubmitResults}
          >
            {isSubmitted ? 'Submitted' : submittingResults ? 'Submitting…' : 'Submit results'}
          </Button>
        </div>
      </div>

      <Card className="mb-4"><CardContent>
        <p className="text-sm text-secondary" style={{ margin: '0 0 1rem' }}>
          {selectedTargetId ? (
            <>
              Hiring results for the selection below:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {isSubmitted ? 'Submitted — edits locked' : 'Open for edits'}
              </strong>
            </>
          ) : (
            <>
              Choose campus and {kindTab === 'drive' ? 'drive' : 'job / posting'} below. Results stay editable until you
              click <strong>Submit results</strong>.
            </>
          )}
        </p>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="online-update-campus">
              Campus
            </FieldLabel>
            <AdminFilterSelect
              id="online-update-campus"
              className="w-full"
              value={selectedTenantId}
              disabled={campusesLoading}
              onValueChange={(id) => {
                setSelectedTenantId(id);
                const campus = approvedCampuses.find((c) => String(c.id) === String(id));
                if (campus) persistActiveCampus(campusPayloadFromRow(campus));
              }}
              emptyMapsToAll={false}
              items={approvedCampuses.map((c) => ({ label: c.name, value: String(c.id) }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="online-update-target">
              {kindTab === 'drive' ? 'Drive' : 'Job / posting'}
            </FieldLabel>
            <AdminFilterSelect
              id="online-update-target"
              className="w-full"
              value={selectedTargetId}
              disabled={targetsLoading || !selectedTenantId}
              onValueChange={(targetId) =>
                setTargetByKind((prev) => ({ ...prev, [kindTab]: targetId }))
              }
              items={[
                { label: targetsLoading ? 'Loading…' : 'Select target…', value: 'all' },
                ...targets.map((t) => ({ label: t.label, value: t.id })),
              ]}
            />
          </Field>
        </FieldGroup>
      </CardContent></Card>

      <Tabs value={kindTab} onValueChange={setKindTab} className="mb-6"><TabsList aria-label="Opportunity type">
        {kindTabs.map((t) => {
          const Icon = t.icon;
          const active = kindTab === t.id;
          const n = targetCounts[t.id] ?? 0;
          return (
            <TabsTrigger
              key={t.id}
              type="button"
              value={t.id}
            >
              <Icon size={16} aria-hidden />
              {t.label}
              {shouldShowFilterCount(n) ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: active ? 0.9 : 0.65 }}>{n}</span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList></Tabs>

      <Alert className="mb-4"><AlertDescription>
        Rows greyed out were confirmed by another employer (FCFS). See{' '}
        <Link href="/dashboard/employer/fcfs-unavailable">Unavailable candidates</Link>.
      </AlertDescription></Alert>

      <Card>
        <CardHeader><CardTitle>Candidate results</CardTitle><CardDescription>Edit results inline, then save before submitting.</CardDescription></CardHeader>
        <CardContent>
        {loading ? (
          <div className="skeleton skeleton-card" style={{ height: 280 }} />
        ) : !selectedTargetId ? (
          <p className="text-secondary">Select a campus and target to load students.</p>
        ) : (
          <>
            {totalCount > 0 ? (
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search roll, name, hiring result…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={totalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                style={{ marginBottom: '1rem' }}
              />
            ) : null}

              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>System ID</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Candidate name</TableHead>
                    <TableHead>Hiring result</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((r) => {
                    const dirty = dirtyIds.has(r.student_profile_id);
                    const rowLocked = isSubmitted || r.fcfs_blocked;
                    return (
                      <TableRow
                        key={r.student_profile_id}
                        className={`${dirty ? 'bg-muted/50' : ''} ${r.fcfs_blocked ? 'opacity-55' : ''}`}
                        title={r.fcfs_blocked ? `Already confirmed by ${r.fcfs_blocked_by || 'another employer'} (FCFS)` : undefined}
                      >
                        <TableCell className="font-mono text-xs">{r.system_id || '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{r.college_roll_no || '—'}</TableCell>
                        <TableCell>
                          <Input
                            style={{ minWidth: 120, fontSize: '0.8rem' }}
                            value={r.candidate_name || ''}
                            disabled={rowLocked}
                            onChange={(e) => patchRow(r.student_profile_id, 'candidate_name', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <AdminFilterSelect
                            className="min-w-32 text-xs"
                            value={r.hiring_result || ''}
                            disabled={rowLocked}
                            emptyMapsToAll={false}
                            onValueChange={(v) => patchRow(r.student_profile_id, 'hiring_result', v)}
                            items={HIRING_RESULT_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            style={{ minWidth: 140, fontSize: '0.8rem', minHeight: 40 }}
                            value={r.remarks || ''}
                            disabled={rowLocked}
                            onChange={(e) => patchRow(r.student_profile_id, 'remarks', e.target.value)}
                            rows={2}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {displayRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {totalCount === 0 ? 'No students for this campus and academic year.' : 'No rows match your search.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </>
        )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={submitConfirmOpen}
        title="Submit assessment results?"
        message={
          dirtyCount > 0
            ? `You have ${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}. Save first if you want them included.\n\nAfter Submit, further edits will not be permitted for this campus and ${kindTab === 'drive' ? 'drive' : 'posting'}. Contact your campus partner if you need to reopen.`
            : 'After Submit, further edits will not be permitted for this campus and posting. Contact your campus partner if you need to reopen.'
        }
        confirmLabel="Submit results"
        cancelLabel="Cancel"
        confirmTone="primary"
        loading={submittingResults}
        onCancel={() => {
          if (!submittingResults) setSubmitConfirmOpen(false);
        }}
        onConfirm={() => void submitResults()}
      />
    </div>
  );
}
