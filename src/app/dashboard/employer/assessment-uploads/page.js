'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Briefcase, Download, FolderDot, GraduationCap, Target } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { AssessmentCsvUploadForm } from '@/components/employer/AssessmentSpreadsheetUploadPanel';
import AssessmentWorkflowStepper from '@/components/employer/AssessmentWorkflowStepper';
import { assessmentExportFilename } from '@/lib/assessmentUploadStarterCsv';
import { HIRING_RESULT_OPTIONS } from '@/lib/hiringResult';
import { isUuid } from '@/lib/tenantContext';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { swrFetcher } from '@/lib/fetchJson';
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
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

const KIND_TABS = [
  { id: 'internship', label: 'Internship', icon: GraduationCap },
  { id: 'drive', label: 'Drive', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderDot },
];

function EmployerAssessmentUploadsContent() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const kindFromUrl = searchParams.get('kind');
  const [kindTab, setKindTab] = useState(() =>
    KIND_TABS.some((t) => t.id === kindFromUrl) ? kindFromUrl : 'internship',
  );
  const [campusesLoading, setCampusesLoading] = useState(true);
  const [approvedCampuses, setApprovedCampuses] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [targetByKind, setTargetByKind] = useState({
    internship: '',
    jobs: '',
    drive: '',
    projects: '',
  });
  const selectedTargetId = targetByKind[kindTab] || '';
  const [targets, setTargets] = useState([]);
  const [targetCounts, setTargetCounts] = useState({ internship: 0, jobs: 0, drive: 0, projects: 0 });
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('draft');
  const [submittingResults, setSubmittingResults] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastUploadResult, setLastUploadResult] = useState(null);
  const [showAllUploadErrors, setShowAllUploadErrors] = useState(false);
  const [editorUploadId, setEditorUploadId] = useState(null);
  const [draftRows, setDraftRows] = useState([]);
  const [savingRows, setSavingRows] = useState(false);
  const [addRoll, setAddRoll] = useState('');
  const [addRemarks, setAddRemarks] = useState('');
  const [addingRow, setAddingRow] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCampusesLoading(true);
      try {
        const res = await fetch('/api/employer/campuses');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load campuses');
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
      setTargets([]);
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

  useEffect(() => {
    if (!selectedTenantId || !selectedTargetId) {
      setSubmissionStatus('draft');
      return;
    }
    let mounted = true;
    const qs = new URLSearchParams({
      kind: kindTab,
      tenantId: selectedTenantId,
      ...(kindTab === 'drive' ? { driveId: selectedTargetId } : { jobId: selectedTargetId }),
    });
    (async () => {
      try {
        const res = await fetch(`/api/employer/assessments/submit?${qs}`);
        const json = await res.json();
        if (!mounted) return;
        setSubmissionStatus(json.submission_status || 'draft');
      } catch {
        if (mounted) setSubmissionStatus('draft');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedTenantId, selectedTargetId, kindTab]);

  const isSubmitted = submissionStatus === 'submitted';
  const driveId = kindTab === 'drive' ? selectedTargetId : '';
  const jobId = kindTab !== 'drive' ? selectedTargetId : '';

  const { data: uploadsData, mutate: mutateUploads, error, isLoading } = useSWR('/api/employer/assessments?limit=50', swrFetcher);
  const { data: pendingImportsData, mutate: mutatePendingImports } = useSWR(
    '/api/employer/assessments/import',
    swrFetcher,
    { revalidateOnFocus: true },
  );
  const {
    data: detailData,
    mutate: mutateDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useSWR(editorUploadId ? `/api/employer/assessments/${editorUploadId}` : null, swrFetcher, {
    revalidateOnFocus: false,
  });

  const rowsSig = useMemo(() => {
    if (!editorUploadId || !detailData?.upload?.id || detailData.upload.id !== editorUploadId || !Array.isArray(detailData.rows)) {
      return '';
    }
    return `${detailData.rows.length}:${detailData.rows.map((r) => r.id).join('|')}`;
  }, [editorUploadId, detailData?.upload?.id, detailData?.rows]);

  useEffect(() => {
    if (!editorUploadId) {
      setDraftRows([]);
      return;
    }
    if (!detailData?.upload?.id || detailData.upload.id !== editorUploadId) {
      setDraftRows([]);
      return;
    }
    if (!Array.isArray(detailData.rows)) return;
    setDraftRows(detailData.rows.map((r) => ({ ...r })));
  }, [editorUploadId, rowsSig, detailData?.upload?.id, detailData?.rows]);

  useEffect(() => {
    const edit = searchParams.get('edit');
    if (edit && isUuid(edit)) {
      setEditorUploadId(edit);
      setAddRoll('');
      setAddRemarks('');
    }
  }, [searchParams]);

  const {
    data: auditData,
    error: auditError,
    isLoading: auditLoading,
    mutate: mutateAudit,
  } = useSWR(editorUploadId ? `/api/employer/assessments/${editorUploadId}/audit` : null, swrFetcher, {
    revalidateOnFocus: false,
  });
  const auditEntries = auditData?.entries || [];

  const submitResults = async () => {
    if (!selectedTenantId || !selectedTargetId) {
      addToast('Select campus and target before submitting.', 'warning');
      return;
    }
    if (!window.confirm('Submit results? You will not be able to edit hiring results after submission.')) return;
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
      addToast('Results submitted.', 'success');
    } catch (e) {
      addToast(e.message || 'Submit failed', 'error');
    } finally {
      setSubmittingResults(false);
    }
  };

  const exportCsv = async () => {
    if (!selectedTenantId) {
      addToast('Select a campus before exporting.', 'warning');
      return;
    }
    if (!selectedTargetId) {
      addToast(
        kindTab === 'drive'
          ? 'Select a placement drive above before exporting the template.'
          : 'Select a job posting above before exporting the template.',
        'warning',
      );
      return;
    }
    setExporting(true);
    try {
      const qs = new URLSearchParams({
        kind: kindTab,
        tenantId: selectedTenantId,
        ...(driveId ? { driveId } : {}),
        ...(jobId ? { jobId } : {}),
      });
      await downloadCsvFromApi(`/api/employer/assessments/export?${qs}`, assessmentExportFilename(kindTab));
      addToast('CSV exported — fill hiring_result and upload.', 'success');
    } catch (e) {
      addToast(e?.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const patchDraft = (rowId, field, value) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
  };

  const saveDraftRows = async () => {
    if (!editorUploadId || draftRows.length === 0) {
      addToast('Nothing to save.', 'warning');
      return;
    }
    if (isSubmitted) {
      addToast('Results are submitted and cannot be edited.', 'warning');
      return;
    }
    setSavingRows(true);
    try {
      const res = await fetch(`/api/employer/assessments/${editorUploadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: draftRows.map((r) => ({
            id: r.id,
            hiring_result: r.hiring_result,
            remarks: r.remarks,
            candidate_name: r.candidate_name,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Save failed');
      addToast('Assessment rows saved.', 'success');
      await mutateDetail();
      await mutateUploads();
      await mutateAudit();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingRows(false);
    }
  };

  const addManualRow = async () => {
    if (!editorUploadId || !addRoll.trim()) {
      addToast('Enter a system ID or roll number.', 'warning');
      return;
    }
    setAddingRow(true);
    try {
      const res = await fetch(`/api/employer/assessments/${editorUploadId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_roll_no: addRoll.trim(),
          remarks: addRemarks.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not add row');
      addToast(json.created ? 'Student added to this upload.' : 'Student updated in this upload.', 'success');
      setAddRoll('');
      setAddRemarks('');
      await mutateDetail();
      await mutateUploads();
      await mutateAudit();
    } catch (e) {
      addToast(e.message || 'Could not add row', 'error');
    } finally {
      setAddingRow(false);
    }
  };

  const allUploads = uploadsData?.uploads || [];
  const tabUploads = useMemo(
    () => allUploads.filter((u) => (u.opportunity_kind || 'jobs') === kindTab),
    [allUploads, kindTab],
  );

  const pendingImportCounts = pendingImportsData?.counts || {
    internship: 0,
    jobs: 0,
    drive: 0,
    projects: 0,
  };
  const pendingForTab = pendingImportCounts[kindTab] ?? 0;

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayUploads,
    filteredCount,
    totalCount: uploadsTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(tabUploads, {
    getSearchText: (u) => [u.original_file_name, u.drive_id, u.job_id, u.id].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Assessment uploads (CSV)</h1>
          <p>
            Export all campus students for the current academic year, set <code>hiring_result</code>, and upload. View summaries in{' '}
            <Link href="/dashboard/employer/hiring-assessment" style={{ fontWeight: 600 }}>
              Hiring Results Dashboard
            </Link>
            .
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={submittingResults || isSubmitted || !selectedTargetId}
            onClick={() => void submitResults()}
          >
            {isSubmitted ? 'Submitted' : submittingResults ? 'Submitting…' : 'Submit results'}
          </button>
        </div>
      </div>

      <AssessmentWorkflowStepper />

      <div
        role="tablist"
        aria-label="Opportunity type"
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}
      >
        {KIND_TABS.map((t) => {
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
                transition: 'background 0.2s ease-out, color 0.2s ease-out, box-shadow 0.2s ease-out',
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--primary-600, #2563eb)' : 'var(--surface-subtle, #f3f4f6)',
                color: active ? '#fff' : 'var(--text-primary, #111827)',
                boxShadow: active ? '0 1px 3px rgba(37, 99, 235, 0.35)' : 'none',
              }}
            >
              <Icon size={16} aria-hidden />
              {t.label}
              {shouldShowFilterCount(n) ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    opacity: active ? 0.9 : 0.65,
                    marginLeft: '0.15rem',
                  }}
                >
                  {n}
                </span>
              ) : null}
            </button>
          );
        })}
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
            <label className="form-label" htmlFor="assessment-upload-campus">
              Campus
            </label>
            <select
              id="assessment-upload-campus"
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
              {approvedCampuses.length === 0 ? (
                <option value="">{campusesLoading ? 'Loading…' : 'No approved campuses'}</option>
              ) : (
                approvedCampuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="assessment-upload-target">
              {kindTab === 'drive' ? 'Drive' : 'Job / posting'}
            </label>
            <select
              id="assessment-upload-target"
              className="form-select"
              value={selectedTargetId}
              disabled={targetsLoading || !selectedTenantId}
              onChange={(e) =>
                setTargetByKind((prev) => ({ ...prev, [kindTab]: e.target.value }))
              }
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

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          padding: '0.85rem 1rem',
          borderRadius: '0.5rem',
          background: pendingForTab > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-subtle, #f9fafb)',
          border: pendingForTab > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-subtle, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flex: '1 1 16rem' }}>
          {pendingForTab > 0 ? <AlertCircle size={18} aria-hidden style={{ color: 'var(--danger-600)', marginTop: 2 }} /> : null}
          <div>
            <p className="text-sm font-semibold" style={{ margin: 0 }}>
              CSV import corrections — {KIND_TABS.find((t) => t.id === kindTab)?.label}
            </p>
            <p className="text-sm text-secondary" style={{ margin: '0.25rem 0 0' }}>
              {pendingForTab > 0
                ? `${pendingForTab} import(s) need fixes before they can be accepted.`
                : 'If a CSV upload fails validation, open the correction screen here to fix rows online.'}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/employer/assessment-uploads/review?kind=${kindTab}`}
          className={pendingForTab > 0 ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {pendingForTab > 0 ? `Review & correct (${pendingForTab})` : 'Open correction screen'}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div
          className="card-header"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}
        >
          <h3 className="card-title" style={{ margin: 0 }}>
            CSV
          </h3>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exporting || !selectedTenantId || !selectedTargetId}
            title={
              !selectedTargetId
                ? kindTab === 'drive'
                  ? 'Select a placement drive first'
                  : 'Select a job posting first'
                : undefined
            }
            onClick={() => void exportCsv()}
          >
            <Download size={16} aria-hidden style={{ marginRight: '0.35rem', verticalAlign: '-2px' }} />
            {exporting ? 'Exporting…' : 'Export CSV template'}
          </button>
        </div>
        <div
          className="text-sm"
          role="note"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary-200, #bfdbfe)',
            background: 'color-mix(in srgb, var(--primary-50, #eff6ff) 85%, transparent)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Drive / job selector vs CSV columns:</strong> Use the{' '}
          {kindTab === 'drive' ? 'Drive' : 'Job'} dropdown above to export a template — it pre-fills{' '}
          <code>{kindTab === 'drive' ? 'placement_drive_id' : 'job_id'}</code> on every row.
          {kindTab !== 'drive' ? (
            <>
              {' '}
              Exports also pre-fill <code>placement_drive_id</code> with the same posting UUID so the placement ID
              column is never blank.
            </>
          ) : null}{' '}
          If those columns in your file differ from the selected target, upload will fail with a row-level error. Keep
          them the same or leave the column as exported.
        </div>
        {kindTab === 'drive' && !selectedTargetId && !targetsLoading && targets.length > 0 ? (
          <p className="text-sm" style={{ marginBottom: '1rem', color: 'var(--warning-700, #b45309)' }}>
            Choose your placement drive in the list above, then export or upload.
          </p>
        ) : null}
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
          Select campus and {kindTab === 'drive' ? 'drive' : 'job'} above first. The exported CSV is pre-filled for the
          current academic year (not a blank template): every row includes{' '}
          <code>placement_drive_id</code>
          {kindTab !== 'drive' ? (
            <>
              {' '}
              and <code>job_id</code> (same posting UUID)
            </>
          ) : null}
          , student identifiers, and empty hiring columns for you to complete. Students who do not meet this{' '}
          {kindTab === 'drive' ? 'drive' : 'posting'}&apos;s
          eligibility rules (CGPA, backlogs, branch, batch, CV, placement lock, and internship FCFS lock when applicable)
          are omitted. Allowed <code>hiring_result</code> values: Shortlist, Reject, Select, Decline, Withdraw (blank =
          no decision).
        </p>
        <AssessmentCsvUploadForm
          kind={kindTab}
          tenantId={selectedTenantId}
          driveId={driveId}
          jobId={jobId}
          targetId={selectedTargetId}
          disabled={isSubmitted}
          onUploaded={async (json) => {
            setLastUploadResult(json);
            setShowAllUploadErrors(false);
            await mutateUploads();
            await mutatePendingImports();
            if (json?.uploadId && isUuid(json.uploadId)) {
              setEditorUploadId(json.uploadId);
              setAddRoll('');
              setAddRemarks('');
            }
          }}
          onNeedsReview={async () => {
            await mutatePendingImports();
          }}
        />
      </div>

      {lastUploadResult && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">Latest upload summary</h3>
          <p>
            Total: <strong>{lastUploadResult.totalRows}</strong> | Accepted: <strong>{lastUploadResult.acceptedRows}</strong> | Rejected:{' '}
            <strong>{lastUploadResult.rejectedRows}</strong>
          </p>
          {Array.isArray(lastUploadResult.errors) && lastUploadResult.errors.length > 0 && (
            <div className="text-sm text-secondary" style={{ marginTop: '0.5rem', maxHeight: 160, overflowY: 'auto' }}>
              {(showAllUploadErrors ? lastUploadResult.errors : lastUploadResult.errors.slice(0, 20)).map((e) => (
                <div key={e}>• {e}</div>
              ))}
              {lastUploadResult.errors.length > 20 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setShowAllUploadErrors((v) => !v)}
                >
                  {showAllUploadErrors ? 'Show less' : `Show all ${lastUploadResult.errors.length} errors`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
          Upload history
        </h3>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
          Use <strong>View / edit</strong> to adjust hiring results after a successful upload. Accepted and Rejected
          counts reflect current hiring results after you save edits.
        </p>
        {error && <p style={{ color: 'var(--danger-600)' }}>{error.message}</p>}
        {isLoading ? (
          <div className="skeleton skeleton-card" style={{ height: 180 }} />
        ) : (
          <>
            {uploadsTotalCount > 0 ? (
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search file name or target…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={uploadsTotalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                style={{ marginBottom: '1rem' }}
              />
            ) : null}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Target</th>
                    <th>File</th>
                    <th>Total</th>
                    <th>Accepted</th>
                    <th>Rejected</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {displayUploads.length === 0 && uploadsTotalCount > 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-secondary">
                        No uploads match your search.
                      </td>
                    </tr>
                  ) : null}
                  {displayUploads.map((u) => (
                    <tr key={u.id}>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                      <td>{u.drive_id ? `Drive (${String(u.drive_id).slice(0, 8)}…)` : `Job (${String(u.job_id).slice(0, 8)}…)`}</td>
                      <td>{u.original_file_name}</td>
                      <td>{u.total_rows}</td>
                      <td>{u.accepted_rows}</td>
                      <td>{u.rejected_rows}</td>
                      <td>
                        <StandardTableIconAction
                          action={editorUploadId === u.id ? 'close' : 'edit'}
                          loading={false}
                          onClick={() => {
                            if (editorUploadId === u.id) {
                              setEditorUploadId(null);
                              return;
                            }
                            setEditorUploadId(u.id);
                            setAddRoll('');
                            setAddRemarks('');
                          }}
                          tooltip={editorUploadId === u.id ? 'Close editor' : 'View and edit hiring results'}
                        />
                      </td>
                    </tr>
                  ))}
                  {uploadsTotalCount === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No uploads for this tab yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editorUploadId && (
        <>
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <h3 className="card-title">Results for this upload — edit &amp; save</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditorUploadId(null)}>
                  Close editor
                </button>
                <button type="button" className="btn btn-primary" disabled={savingRows || draftRows.length === 0} onClick={saveDraftRows}>
                  {savingRows ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
            {detailError && <p style={{ color: 'var(--danger-600)' }}>{detailError.message}</p>}
            {detailLoading ? (
              <div className="skeleton skeleton-card" style={{ height: 200 }} />
            ) : (
              <>
                <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                  Edit hiring results below. You can add one student by roll at the bottom if needed.
                </p>
                <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
                  <table className="data-table" style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th>System ID</th>
                        <th>Roll</th>
                        <th>Account name</th>
                        <th>Candidate (override)</th>
                        <th>Hiring result</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRows.map((r) => (
                        <tr key={r.id}>
                          <td className="font-mono text-sm">{r.system_id || '—'}</td>
                          <td className="font-mono text-sm">{r.roll_number || '—'}</td>
                          <td className="text-sm">{r.account_name || '—'}</td>
                          <td>
                            <input
                              className="form-input"
                              style={{ minWidth: 120, fontSize: '0.8rem' }}
                              value={r.candidate_name || ''}
                              disabled={isSubmitted}
                              onChange={(e) => patchDraft(r.id, 'candidate_name', e.target.value)}
                              placeholder="Optional"
                            />
                          </td>
                          <td>
                            <select
                              className="form-select"
                              style={{ minWidth: 120, fontSize: '0.8rem' }}
                              value={r.hiring_result || ''}
                              disabled={isSubmitted}
                              onChange={(e) => patchDraft(r.id, 'hiring_result', e.target.value)}
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
                              style={{ minWidth: 160, fontSize: '0.8rem', minHeight: 48 }}
                              value={r.remarks || ''}
                              disabled={isSubmitted}
                              onChange={(e) => patchDraft(r.id, 'remarks', e.target.value)}
                              rows={2}
                            />
                          </td>
                        </tr>
                      ))}
                      {draftRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-secondary">
                            No accepted rows for this upload yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle, #e5e7eb)' }}>
                  <h4 className="text-sm font-semibold" style={{ marginBottom: '0.5rem' }}>
                    Optional: add one student by roll
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', maxWidth: 480 }}>
                    <input
                      className="form-input"
                      style={{ maxWidth: 220 }}
                      placeholder="System ID or roll no."
                      value={addRoll}
                      onChange={(e) => setAddRoll(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary" disabled={addingRow} onClick={addManualRow}>
                      {addingRow ? 'Adding…' : 'Add to upload'}
                    </button>
                  </div>
                  <textarea
                    className="form-input"
                    style={{ minHeight: 56, fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: 480 }}
                    placeholder="Optional remarks"
                    value={addRemarks}
                    onChange={(e) => setAddRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
              Activity log
            </h3>
            {auditError && <p style={{ color: 'var(--danger-600)' }}>{auditError.message}</p>}
            {auditLoading ? (
              <div className="skeleton skeleton-card" style={{ height: 140 }} />
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Summary</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((e) => (
                      <tr key={e.id}>
                        <td>{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</td>
                        <td>
                          <code className="text-sm">{e.action}</code>
                        </td>
                        <td className="text-sm">{e.summary}</td>
                        <td className="text-sm">{(e.actor_name && e.actor_name.trim()) || e.actor_email || '—'}</td>
                      </tr>
                    ))}
                    {auditEntries.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No activity logged yet for this upload.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function EmployerAssessmentUploadsPage() {
  return (
    <Suspense fallback={<div className="skeleton skeleton-card" style={{ height: 320, marginTop: '1rem' }} />}>
      <EmployerAssessmentUploadsContent />
    </Suspense>
  );
}
