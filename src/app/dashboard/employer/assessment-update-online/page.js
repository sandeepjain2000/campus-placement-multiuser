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
  const [selectedTargetId, setSelectedTargetId] = useState('');
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
      setSelectedTargetId('');
      return;
    }
    let mounted = true;
    setTargets([]);
    setSelectedTargetId('');
    setTargetsLoading(true);
    (async () => {
      try {
        const list = await fetchEmployerAssessmentTargets(selectedTenantId, kindTab);
        if (!mounted) return;
        setTargets(list);
        setTargetCounts((prev) => ({ ...prev, [kindTab]: list.length }));
        setSelectedTargetId((prev) => pickDefaultAssessmentTargetId(list, prev));
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
    if (!selectedTenantId || !selectedTargetId) {
      setRows([]);
      setSubmissionStatus('draft');
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
  }, [kindTab, selectedTenantId, selectedTargetId, driveId, jobId, addToast]);

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
      <div className="page-header">
        <div className="page-header-left">
          <h1>Assessment Update Online</h1>
          <p>
            Set <code>hiring_result</code> for campus students. Same data as{' '}
            <Link href="/dashboard/employer/assessment-uploads" style={{ fontWeight: 600 }}>
              Assessment uploads (CSV)
            </Link>
            .
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" disabled={saving || dirtyCount === 0 || isSubmitted} onClick={() => void saveChanges()}>
            {saving ? 'Saving…' : dirtyCount > 0 ? `Save changes (${dirtyCount})` : 'Save changes'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={submittingResults || isSubmitted || !selectedTargetId}
            onClick={requestSubmitResults}
          >
            {isSubmitted ? 'Submitted' : submittingResults ? 'Submitting…' : 'Submit results'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
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
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="online-update-campus">
              Campus
            </label>
            <select
              id="online-update-campus"
              className="form-select"
              value={selectedTenantId}
              disabled={campusesLoading}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedTenantId(id);
                const campus = approvedCampuses.find((c) => String(c.id) === String(id));
                if (campus) persistActiveCampus(campusPayloadFromRow(campus));
              }}
            >
              {approvedCampuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="online-update-target">
              {kindTab === 'drive' ? 'Drive' : 'Job / posting'}
            </label>
            <select
              id="online-update-target"
              className="form-select"
              value={selectedTargetId}
              disabled={targetsLoading || !selectedTenantId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
            >
              <option value="">{targetsLoading ? 'Loading…' : 'Select target…'}</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Opportunity type" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {kindTabs.map((t) => {
          const Icon = t.icon;
          const active = kindTab === t.id;
          const n = targetCounts[t.id] ?? 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKindTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--primary-600)' : 'var(--bg-secondary)',
                color: active ? 'white' : 'var(--text-secondary)',
              }}
            >
              <Icon size={16} aria-hidden />
              {t.label}
              {shouldShowFilterCount(n) ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: active ? 0.9 : 0.65 }}>{n}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
        Rows greyed out were confirmed by another employer (FCFS). See{' '}
        <Link href="/dashboard/employer/fcfs-unavailable">Unavailable candidates</Link>.
      </p>

      <div className="card">
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

            <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
              <table className="data-table" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th>System ID</th>
                    <th>Roll</th>
                    <th>Candidate name</th>
                    <th>Hiring result</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => {
                    const dirty = dirtyIds.has(r.student_profile_id);
                    const rowLocked = isSubmitted || r.fcfs_blocked;
                    return (
                      <tr
                        key={r.student_profile_id}
                        style={{
                          ...(dirty ? { background: 'var(--surface-subtle, #f8fafc)' } : undefined),
                          ...(r.fcfs_blocked ? { opacity: 0.55 } : undefined),
                        }}
                        title={r.fcfs_blocked ? `Already confirmed by ${r.fcfs_blocked_by || 'another employer'} (FCFS)` : undefined}
                      >
                        <td className="font-mono text-xs">{r.system_id || '—'}</td>
                        <td className="font-mono text-sm">{r.college_roll_no || '—'}</td>
                        <td>
                          <input
                            className="form-input"
                            style={{ minWidth: 120, fontSize: '0.8rem' }}
                            value={r.candidate_name || ''}
                            disabled={rowLocked}
                            onChange={(e) => patchRow(r.student_profile_id, 'candidate_name', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{ minWidth: 130, fontSize: '0.8rem' }}
                            value={r.hiring_result || ''}
                            disabled={rowLocked}
                            onChange={(e) => patchRow(r.student_profile_id, 'hiring_result', e.target.value)}
                          >
                            {HIRING_RESULT_OPTIONS.map((o) => (
                              <option key={o.value || 'empty'} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <textarea
                            className="form-input"
                            style={{ minWidth: 140, fontSize: '0.8rem', minHeight: 40 }}
                            value={r.remarks || ''}
                            disabled={rowLocked}
                            onChange={(e) => patchRow(r.student_profile_id, 'remarks', e.target.value)}
                            rows={2}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {displayRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary">
                        {totalCount === 0 ? 'No students for this campus and academic year.' : 'No rows match your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

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
