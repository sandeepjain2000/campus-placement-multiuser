'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import PageLoading from '@/components/PageLoading';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import {
  GraduationCap, Plus, Users, IndianRupee, Activity, FileText, Settings,
  LayoutGrid, List, Ban, ArrowRight, Undo2,
} from 'lucide-react';
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import SegmentedDateInput from '@/components/form/SegmentedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import {
  mapEmployerInternshipApiError,
  validateEmployerInternshipForm,
} from '@/lib/employerInternshipFormValidation';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';
import EligibilityGroupPicker from '@/components/employer/EligibilityGroupPicker';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { buildPostingEligibilityChecks } from '@/lib/buildPostingEligibilityChecks';
import {
  buildInternshipDescription,
  formatCommaList,
  formatEligibleBranchesLabel,
  formatInternshipPeriodLabel,
  internshipEligibilityOpportunity,
  parseInternshipAdditionalInfo,
  parseInternshipDescription,
  resolveInternshipDatesFromRow,
} from '@/lib/internshipPostingMeta';
import { buildDefaultTenantSelection } from '@/lib/defaultTestCampus';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { toCsvIsoDate } from '@/lib/csvExport';
import { formatEmployerMinCgpa, formatJobPostingStatus, normalizeEmployerMinCgpa } from '@/lib/employerJobDisplay';
import { useEmployerPostingCampuses } from '@/hooks/useEmployerPostingCampuses';
import EmployerListFormLayout from '@/components/employer/EmployerListFormLayout';
import EmployerCampusSyncDialog from '@/components/employer/EmployerCampusSyncDialog';

async function swrFetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function InternFieldError({ message }) {
  if (!message) return null;
  return (
    <p className="form-error" style={{ margin: '0.35rem 0 0' }}>
      {message}
    </p>
  );
}

export default function EmployerInternshipsPage() {
  const { addToast } = useToast();
  const jobsApiPath = '/api/employer/jobs?jobType=internship';
  const { data: campusData } = useSWR('/api/employer/campuses', swrFetcher, { revalidateOnFocus: true });
  const {
    data: jobData,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateInternships,
  } = useSWR(jobsApiPath, swrFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stipend, setStipend] = useState('');
  const [stipendMax, setStipendMax] = useState('');
  const [vacancies, setVacancies] = useState('5');
  const [minCgpa, setMinCgpa] = useState('');
  const [keywords, setKeywords] = useState('');
  const [eligibleBranches, setEligibleBranches] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [maxBacklogs, setMaxBacklogs] = useState('0');
  const [fieldErrors, setFieldErrors] = useState({});
  const [batchYear, setBatchYear] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTenantIds, setSelectedTenantIds] = useState({});
  const [campusSyncJobId, setCampusSyncJobId] = useState(null);
  const [campusSyncSelection, setCampusSyncSelection] = useState({});
  const [campusSyncSubmitting, setCampusSyncSubmitting] = useState(false);
  const [detailInternship, setDetailInternship] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [savedDraftId, setSavedDraftId] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  const approvedCampuses = useEmployerPostingCampuses(campusData, 'internship');

  const internships = Array.isArray(jobData?.jobs) ? jobData.jobs : [];
  const internshipStatusFilterOptions = useMemo(
    () => [
      FILTER_ALL,
      { value: 'published', label: 'Published' },
      { value: 'draft', label: 'Draft' },
      { value: 'closed', label: 'Closed' },
      { value: 'cancelled', label: 'Withdrawn' },
    ],
    [],
  );
  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayInternships,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(internships, {
    getSearchText: (intern) => [intern.title, intern.keywords, intern.status].filter(Boolean).join(' '),
    filterFn: (row, f) => !f || String(row.status || '') === f,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const resetFormFields = useCallback(() => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setStipend('');
    setStipendMax('');
    setVacancies('5');
    setMinCgpa('');
    setKeywords('');
    setEligibleBranches('');
    setSpecializations('');
    setMaxBacklogs('0');
    setFieldErrors({});
    setBatchYear('');
    setNotes('');
    setEditingId(null);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSavedDraftId(null);
    resetFormFields();
  }, [resetFormFields]);

  const openForm = () => {
    resetFormFields();
    setSavedDraftId(null);
    setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses));
    setShowForm(true);
  };

  const openDetails = useCallback((intern) => {
    setDetailInternship(intern);
  }, []);

  const openManage = useCallback(
    (intern) => {
      const parsed = parseInternshipDescription(intern.description || '');
      const dates = resolveInternshipDatesFromRow(intern);
      setSavedDraftId(null);
      setEditingId(intern.id);
      setTitle(intern.title || '');
      setStartDate(dates.startDate || parsed.startDate || '');
      setEndDate(dates.endDate || parsed.endDate || '');
      setStipend(intern.salaryMin ?? '');
      setStipendMax(intern.salaryMax ?? '');
      setVacancies(String(intern.vacancies ?? '5'));
      const cgpaVal = normalizeEmployerMinCgpa(intern.minCgpa ?? intern.cgpa);
      setMinCgpa(cgpaVal != null ? String(cgpaVal) : '');
      setKeywords(intern.keywords || '');
      setEligibleBranches(formatCommaList(intern.branches ?? intern.eligibleBranches));
      setSpecializations(formatCommaList(intern.specializations));
      setMaxBacklogs(intern.maxBacklogs != null ? String(intern.maxBacklogs) : '0');
      setBatchYear(intern.batchYear != null ? String(intern.batchYear) : '');
      setNotes(parsed.notes);
      setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses, intern.tenantIds));
      setShowForm(true);
      setDetailInternship(null);
    },
    [approvedCampuses],
  );

  const closePublishedInternship = useCallback(
    async (intern) => {
      if (!intern?.id) return;
      setClosingId(intern.id);
      try {
        const res = await fetch('/api/employer/jobs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close', id: intern.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(json.error || 'Could not close internship', 'error');
          return;
        }
        addToast('Internship closed. It remains listed under Closed for your records.', 'success');
        setDetailInternship(null);
        if (editingId === intern.id) closeForm();
        await mutateInternships();
      } catch {
        addToast('Network error', 'error');
      } finally {
        setClosingId(null);
      }
    },
    [addToast, mutateInternships, editingId, closeForm],
  );

  const withdrawPublishedInternship = useCallback(
    async (intern) => {
      if (!intern?.id) return;
      setWithdrawingId(intern.id);
      try {
        const res = await fetch('/api/employer/jobs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'withdraw', id: intern.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(json.error || 'Could not withdraw internship', 'error');
          return;
        }
        const n = Number(json.applicationsWithdrawn) || 0;
        addToast(
          n > 0
            ? `Internship withdrawn. ${n} student application${n === 1 ? '' : 's'} moved to Withdrawn.`
            : 'Internship withdrawn. It no longer accepts applications.',
          'success',
        );
        setDetailInternship(null);
        if (editingId === intern.id) closeForm();
        await mutateInternships();
      } catch {
        addToast('Network error', 'error');
      } finally {
        setWithdrawingId(null);
      }
    },
    [addToast, mutateInternships, editingId, closeForm],
  );

  const stats = useMemo(() => {
    const n = internships.length;
    let sum = 0;
    let count = 0;
    internships.filter((j) => j.status === 'published').forEach((j) => {
      const a = j.salaryMin != null ? Number(j.salaryMin) : null;
      const b = j.salaryMax != null ? Number(j.salaryMax) : null;
      if (a != null && b != null) {
        sum += (a + b) / 2;
        count += 1;
      } else if (a != null) {
        sum += a;
        count += 1;
      } else if (b != null) {
        sum += b;
        count += 1;
      }
    });
    return {
      count: n,
      published: internships.filter((j) => j.status === 'published').length,
      avgStipend: count ? Math.round(sum / count) : null,
    };
  }, [internships]);

  const editingInternship = useMemo(
    () => (editingId ? internships.find((i) => i.id === editingId) : null),
    [editingId, internships],
  );

  const submitInternship = useCallback(
    async (asDraft) => {
      const jobId = editingId || savedDraftId;
      const tenantIds = Object.entries(selectedTenantIds)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const validation = validateEmployerInternshipForm({
        title,
        startDate,
        endDate,
        batchYear,
        maxBacklogs,
        minCgpa,
        stipend,
        stipendMax,
        vacancies,
        tenantIds,
        asDraft,
      });

      if (validation.formError || Object.keys(validation.fieldErrors).length) {
        setFieldErrors(validation.fieldErrors);
        addToast(validation.formError || 'Fix the highlighted fields and try again.', 'warning');
        return;
      }

      setFieldErrors({});
      const sm = stipend === '' ? null : Number(stipend);
      const sx = stipendMax === '' ? null : Number(stipendMax);

      const resolveStatus = () => {
        if (asDraft) return 'draft';
        if (editingInternship?.status === 'published' || editingInternship?.status === 'closed') {
          return editingInternship.status;
        }
        return 'published';
      };

      setSubmitting(true);
      try {
        const description = buildInternshipDescription(startDate, endDate, notes);
        const payload = {
          title: title.trim(),
          description,
          jobType: 'internship',
          status: resolveStatus(),
          salaryMin: sm,
          salaryMax: sx != null && !Number.isNaN(sx) ? sx : sm,
          minCgpa: validation.minCgpa,
          vacancies: vacancies === '' ? 1 : vacancies,
          keywords,
          eligibleBranches,
          specializations,
          maxBacklogs: validation.maxBacklogs,
          batchYear: validation.batchYear,
          startDate: startDate || null,
          endDate: endDate || null,
          tenantIds: asDraft ? [] : tenantIds,
        };
        if (jobId) payload.id = jobId;

        const res = await fetch('/api/employer/jobs', {
          method: jobId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const mapped = mapEmployerInternshipApiError(json.error, json.field);
          setFieldErrors(mapped.fieldErrors);
          addToast(mapped.formError || (asDraft ? 'Could not save draft' : jobId ? 'Could not save changes' : 'Could not publish'), 'error');
          return;
        }

        const savedId = json.job?.id || jobId;
        if (asDraft && !editingId && savedId) {
          setSavedDraftId(savedId);
          addToast('Draft saved. Select campuses and click Publish when ready.', 'success');
          await mutateInternships();
          return;
        }

        addToast(
          asDraft
            ? 'Draft saved (not visible to students).'
            : jobId && editingInternship?.status === 'published'
              ? 'Internship updated.'
              : 'Internship published. Partner colleges and students were notified.',
          'success',
        );
        closeForm();
        await mutateInternships();
      } catch {
        addToast('Network error', 'error');
      } finally {
        setSubmitting(false);
      }
    },
    [
      title,
      selectedTenantIds,
      stipend,
      stipendMax,
      startDate,
      endDate,
      notes,
      minCgpa,
      vacancies,
      keywords,
      eligibleBranches,
      specializations,
      maxBacklogs,
      batchYear,
      editingId,
      savedDraftId,
      editingInternship,
      addToast,
      mutateInternships,
      closeForm,
    ],
  );

  const showCampusPicker =
    !editingId || savedDraftId || editingInternship?.status === 'draft';
  const canSaveAsDraft = editingInternship?.status !== 'published' && editingInternship?.status !== 'closed';

  const campusSyncIntern = useMemo(
    () => internships.find((i) => i.id === campusSyncJobId) ?? null,
    [internships, campusSyncJobId],
  );

  const openCampusSync = useCallback(
    (jobId) => {
      if (!approvedCampuses.length) {
        addToast('No approved campuses yet. Ask a college to approve your tie-up first.', 'warning');
        return;
      }
      const intern = internships.find((i) => i.id === jobId);
      setDetailInternship(null);
      setCampusSyncSelection(buildDefaultTenantSelection(approvedCampuses, intern?.tenantIds));
      setCampusSyncJobId(jobId);
    },
    [approvedCampuses, internships, addToast],
  );

  const submitCampusSync = useCallback(async () => {
    if (!campusSyncJobId) return;
    const tenantIds = Object.entries(campusSyncSelection)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!tenantIds.length) {
      addToast('Select at least one approved campus.', 'warning');
      return;
    }
    setCampusSyncSubmitting(true);
    try {
      const res = await fetch('/api/employer/jobs/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: campusSyncJobId, tenantIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json.error || 'Could not sync campuses', 'error');
        return;
      }
      const msg =
        json.inserted > 0
          ? `Campus visibility updated (${json.inserted} new). College and students can refresh.`
          : json.skippedNotApproved > 0
            ? 'No new visibility rows (check tie-ups are approved for selected campuses).'
            : 'Visibility already present for those campuses.';
      addToast(msg, json.inserted > 0 ? 'success' : 'info');
      setCampusSyncJobId(null);
      await mutateInternships();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setCampusSyncSubmitting(false);
    }
  }, [campusSyncJobId, campusSyncSelection, addToast, mutateInternships]);

  const getInternshipsCsv = useCallback(
    (scope) => {
      const list = scope === 'current' ? displayInternships : internships;
      return {
        headers: [
          'id',
          'title',
          'keywords',
          'stipend_min_inr',
          'stipend_max_inr',
          'min_cgpa',
          'openings',
          'status',
          'posted_at',
          'start_date',
          'end_date',
          'campus_tenant_ids',
        ],
        rows: list.map((intern) => {
          const dates = resolveInternshipDatesFromRow(intern);
          const cgpaVal = normalizeEmployerMinCgpa(intern.minCgpa ?? intern.cgpa);
          return [
            intern.id,
            intern.title ?? '',
            intern.keywords ?? '',
            intern.salaryMin != null ? String(intern.salaryMin) : '',
            intern.salaryMax != null ? String(intern.salaryMax) : '',
            cgpaVal != null ? String(cgpaVal) : '',
            intern.vacancies != null ? String(intern.vacancies) : '',
            intern.status ?? '',
            intern.createdAt ? toCsvIsoDate(intern.createdAt) : '',
            dates.startDate ?? '',
            dates.endDate ?? '',
            Array.isArray(intern.tenantIds) ? intern.tenantIds.join(';') : '',
          ];
        }),
      };
    },
    [displayInternships, internships],
  );

  if (showForm) {
    return (
      <EmployerListFormLayout
        title={editingId ? 'Edit Internship' : savedDraftId ? 'Post New Internship (draft saved)' : 'Post New Internship'}
        subtitle={
          editingId
            ? editingInternship?.status === 'draft'
              ? 'Update this draft, save again as draft, or publish to approved campuses.'
              : 'Update stipend, eligibility, and description. Use Sync on the list to add campuses.'
            : savedDraftId
              ? 'Draft is saved. Select campuses and publish when ready, or keep editing.'
              : 'Save as draft to finish later, or publish to approved campuses. Stipend fields are monthly INR.'
        }
        onBack={closeForm}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {editingId && editingInternship?.status === 'published' ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={submitting || closingId === editingId || withdrawingId === editingId}
                  onClick={() => void closePublishedInternship(editingInternship)}
                >
                  {closingId === editingId ? 'Closing…' : 'Close posting'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={submitting || withdrawingId === editingId || closingId === editingId}
                  onClick={() => void withdrawPublishedInternship(editingInternship)}
                  title="Withdraw posting and move student applications to Withdrawn"
                >
                  <Undo2 size={14} aria-hidden style={{ marginRight: '0.25rem' }} />
                  {withdrawingId === editingId ? 'Withdrawing…' : 'Withdraw'}
                </button>
              </div>
            ) : (
              <span />
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" disabled={submitting} onClick={closeForm}>
                Cancel
              </button>
              {canSaveAsDraft ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => void submitInternship(true)}
                >
                  {submitting ? 'Saving…' : 'Save as Draft'}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => void submitInternship(false)}
              >
                {submitting
                  ? editingInternship?.status === 'published'
                    ? 'Saving…'
                    : 'Publishing…'
                  : editingInternship?.status === 'published'
                    ? 'Save changes'
                    : 'Publish Internship'}
              </button>
            </div>
          </div>
        }
      >
        {editingId && editingInternship?.status === 'published' ? (
          <p className="text-sm text-secondary" style={{ marginTop: 0, marginBottom: '1rem' }}>
            Campus visibility is unchanged here. Use <strong>Sync</strong> on a published row to add campuses.
          </p>
        ) : null}
        <div className="grid grid-2">
          {showCampusPicker ? (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <EmployerCampusTargetPicker
                campuses={approvedCampuses}
                selection={selectedTenantIds}
                onSelectionChange={setSelectedTenantIds}
                label="Target campuses (approved)"
                required={!canSaveAsDraft || !!savedDraftId || editingInternship?.status === 'draft'}
                hint={
                  savedDraftId || editingInternship?.status === 'draft'
                    ? 'Required when you publish. Drafts are not visible to students.'
                    : 'Required to publish. Optional if you only Save as Draft.'
                }
                emptyMessage="No approved campuses. Request access from the campus directory first."
              />
              <InternFieldError message={fieldErrors._campuses} />
            </div>
          ) : null}
          <div className="form-group">
            <label className="form-label">Internship Title <span className="required">*</span></label>
            <input
              className={`form-input${fieldErrors.title ? ' input-error' : ''}`}
              placeholder="e.g., Summer Data Intern"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
              }}
            />
            <InternFieldError message={fieldErrors.title} />
          </div>
          <div className="form-group">
            <label className="form-label">Start date <span className="required">*</span></label>
            <SegmentedDateInput
              value={startDate}
              onChange={(v) => {
                setStartDate(v);
                if (fieldErrors.startDate) setFieldErrors((prev) => ({ ...prev, startDate: '' }));
              }}
              aria-label="Internship start date"
            />
            <InternFieldError message={fieldErrors.startDate} />
          </div>
          <div className="form-group">
            <label className="form-label">End date <span className="required">*</span></label>
            <SegmentedDateInput
              value={endDate}
              min={startDate || undefined}
              onChange={(v) => {
                setEndDate(v);
                if (fieldErrors.endDate) setFieldErrors((prev) => ({ ...prev, endDate: '' }));
              }}
              aria-label="Internship end date"
            />
            <InternFieldError message={fieldErrors.endDate} />
          </div>
          <div className="form-group">
            <label className="form-label">Stipend / month (min, INR)</label>
            <ValidatedNumberInput
              fieldId={FIELD_IDS.EMPLOYER_STIPEND_MIN}
              placeholder="40000"
              value={stipend}
              onChange={setStipend}
              stepperStep={1}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Stipend / month (max, optional)</label>
            <ValidatedNumberInput
              fieldId={FIELD_IDS.EMPLOYER_STIPEND_MAX}
              context={{ salaryMin: stipend }}
              placeholder="Same as min if empty"
              value={stipendMax}
              onChange={setStipendMax}
              stepperStep={1}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Openings</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_VACANCIES} value={vacancies} onChange={setVacancies} />
          </div>
          <div className="form-group">
            <label className="form-label">Min CGPA</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_MIN_CGPA} step="0.1" value={minCgpa} onChange={setMinCgpa} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Eligible branches / groups</label>
            <EligibilityGroupPicker value={eligibleBranches} onChange={setEligibleBranches} />
          </div>
          <div className="form-group">
            <label className="form-label">Specializations</label>
            <input
              className="form-input"
              placeholder="AI/ML, Data Science, Cloud"
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max active backlogs</label>
            <ValidatedNumberInput
              fieldId={FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS}
              value={maxBacklogs}
              onChange={(v) => {
                setMaxBacklogs(v);
                if (fieldErrors.maxBacklogs) setFieldErrors((prev) => ({ ...prev, maxBacklogs: '' }));
              }}
              className={fieldErrors.maxBacklogs ? 'input-error' : undefined}
            />
            <p className="text-xs text-secondary" style={{ margin: '0.35rem 0 0' }}>
              0 means students with no active backlogs only. Increase if you allow backlogs.
            </p>
            <InternFieldError message={fieldErrors.maxBacklogs} />
          </div>
          <div className="form-group">
            <label className="form-label">Batch year <span className="required">*</span></label>
            <ValidatedNumberInput
              fieldId={FIELD_IDS.EMPLOYER_INTERNSHIP_BATCH_YEAR}
              value={batchYear}
              step="1"
              placeholder="e.g. 2026"
              context={{ required: !canSaveAsDraft || !!savedDraftId || editingInternship?.status === 'draft' }}
              onChange={(v) => {
                setBatchYear(v);
                if (fieldErrors.batchYear) setFieldErrors((prev) => ({ ...prev, batchYear: '' }));
              }}
              className={fieldErrors.batchYear ? 'form-input input-error' : 'form-input'}
            />
            <p className="text-xs text-secondary" style={{ margin: '0.35rem 0 0' }}>
              Required when publishing. Current year through 4 years ahead (e.g. {new Date().getFullYear()}–{new Date().getFullYear() + 4}).
            </p>
            <InternFieldError message={fieldErrors.batchYear} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Skills (comma-separated)</label>
            <input className="form-input" placeholder="Python, SQL, ML" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Additional notes</label>
            <textarea className="form-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Location, PPO hint, project details…" />
          </div>
        </div>
      </EmployerListFormLayout>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <GraduationCap size={28} className="text-secondary" strokeWidth={1.5} /> Internship Programs
          </h1>
          <p className="text-secondary">
            Post internships to <span className="font-mono text-xs">job_postings</span> (same pipeline as Job Postings). Stipend fields are stored as monthly INR.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {totalCount > 0 ? (
            <ExportCsvSplitButton
              mode="dual"
              filenameBase="employer_internships"
              currentCount={filteredCount}
              fullCount={totalCount}
              getRows={getInternshipsCsv}
            />
          ) : null}
          <button type="button" className="btn btn-primary" onClick={openForm}>
            <Plus size={16} /> Post Internship
          </button>
        </div>
      </div>

      {jobsError && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            Could not load internships: {jobsError.message}. Check login and database configuration.
          </p>
        </div>
      )}

      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <div className="stats-card">
          <div className="stats-card-icon indigo"><Users size={24} strokeWidth={1.5} /></div>
          <div className="stats-card-value">{stats.published}</div>
          <div className="stats-card-label">Published internships</div>
        </div>
        <div className="stats-card green">
          <div className="stats-card-icon green"><IndianRupee size={24} strokeWidth={1.5} /></div>
          <div className="stats-card-value">{stats.avgStipend != null ? formatCurrency(stats.avgStipend) : '—'}</div>
          <div className="stats-card-label">Avg monthly stipend</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-card-icon amber"><Activity size={24} strokeWidth={1.5} /></div>
          <div className="stats-card-value">{stats.count}</div>
          <div className="stats-card-label">All internship records</div>
        </div>
      </div>

      {jobsLoading && <PageLoading message="Loading internships…" variant="skeleton-list" inline />}
      {!jobsLoading && !jobsError && internships.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px dashed var(--border-default)' }}>
          <GraduationCap size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 1rem', opacity: 0.35 }} />
          <p className="text-sm text-secondary" style={{ margin: 0 }}>No internship postings yet. Use Post Internship to publish one.</p>
        </div>
      )}
      {!jobsLoading && !jobsError && totalCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title or keywords…"
              filter={filter}
              onFilterChange={setFilter}
              filterOptions={internshipStatusFilterOptions}
              filterLabel="Status"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '3px', gap: '2px', border: '1px solid var(--border-default)', flexShrink: 0 }}>
            {[{ mode: 'card', icon: LayoutGrid, label: 'Card view' }, { mode: 'list', icon: List, label: 'List view' }].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: viewMode === mode ? 'var(--bg-primary)' : 'transparent',
                  color: viewMode === mode ? 'var(--primary-600)' : 'var(--text-tertiary)',
                  boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon size={15} aria-hidden />
                {mode === 'card' ? 'Cards' : 'List'}
              </button>
            ))}
          </div>
        </div>
      )}
      {!jobsLoading && !jobsError && totalCount > 0 && viewMode === 'card' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {displayInternships.map((intern) => (
            <InternshipCard
              key={String(intern.id)}
              intern={intern}
              closingId={closingId}
              withdrawingId={withdrawingId}
              onCampusSync={openCampusSync}
              onDetails={openDetails}
              onManage={openManage}
              onClosePosting={closePublishedInternship}
              onWithdrawPosting={withdrawPublishedInternship}
            />
          ))}
          {displayInternships.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-default)' }}>
              <GraduationCap size={48} className="text-tertiary" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No internships match</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Try adjusting your search or status filter.</p>
            </div>
          )}
        </div>
      )}
      {!jobsLoading && !jobsError && totalCount > 0 && viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 880 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ paddingLeft: '1.25rem' }}>Title</th>
                  <th>Stipend / month</th>
                  <th>Period</th>
                  <th>Min CGPA</th>
                  <th>Openings</th>
                  <th>Status</th>
                  <th>Posted</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.25rem', width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayInternships.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary">
                      No internships match your search or filters.
                    </td>
                  </tr>
                ) : null}
                {displayInternships.map((intern) => {
                  const listDates = resolveInternshipDatesFromRow(intern);
                  return (
                  <tr key={String(intern.id)}>
                    <td style={{ paddingLeft: '1.25rem', maxWidth: 280 }}>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{intern.title}</div>
                      {intern.keywords ? (
                        <div className="text-xs text-tertiary" style={{ marginTop: '0.2rem' }}>{intern.keywords}</div>
                      ) : null}
                    </td>
                    <td className="text-sm">{stipendLabel(intern.salaryMin, intern.salaryMax)}</td>
                    <td className="text-sm text-secondary">
                      {formatInternshipPeriodLabel(listDates.startDate, listDates.endDate, formatDate) || '—'}
                    </td>
                    <td className="text-sm">{formatEmployerMinCgpa(intern.minCgpa ?? intern.cgpa)}</td>
                    <td className="text-sm">{intern.vacancies ?? '—'}</td>
                    <td>
                      <span className={`badge badge-${getStatusColor(intern.status)} badge-dot`}>{formatJobPostingStatus(intern.status)}</span>
                    </td>
                    <td className="text-sm text-secondary">{intern.createdAt ? formatDate(intern.createdAt) : '—'}</td>
                    <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {intern.status === 'published' ? (
                          <StandardTableIconAction
                            action="sync"
                            variant="ghost"
                            showLabel={false}
                            disabled={campusSyncSubmitting && campusSyncJobId === intern.id}
                            tooltip={
                              campusSyncSubmitting && campusSyncJobId === intern.id
                                ? 'Syncing campuses…'
                                : undefined
                            }
                            onClick={() => openCampusSync(intern.id)}
                          />
                        ) : null}
                        <StandardTableIconAction
                          action="details"
                          variant="ghost"
                          showLabel={false}
                          onClick={() => openDetails(intern)}
                        />
                        <StandardTableIconAction
                          action="manage"
                          variant="ghost"
                          showLabel={false}
                          onClick={() => openManage(intern)}
                        />
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="text-sm text-secondary">
          {internships.length} internship posting{internships.length === 1 ? '' : 's'} from your company
        </div>
      </div>

      {detailInternship ? (
        <InternshipDetailDialog
          internship={detailInternship}
          closingId={closingId}
          withdrawingId={withdrawingId}
          onClose={() => setDetailInternship(null)}
          onManage={openManage}
          onClosePosting={closePublishedInternship}
          onWithdrawPosting={withdrawPublishedInternship}
        />
      ) : null}

      <EmployerCampusSyncDialog
        open={Boolean(campusSyncJobId)}
        jobTitle={campusSyncIntern?.title}
        campuses={approvedCampuses}
        selection={campusSyncSelection}
        onSelectionChange={setCampusSyncSelection}
        submitting={campusSyncSubmitting}
        onClose={() => setCampusSyncJobId(null)}
        onSubmit={() => void submitCampusSync()}
      />
    </div>
  );
}

function InternshipCard({
  intern,
  closingId,
  withdrawingId,
  onCampusSync,
  onDetails,
  onManage,
  onClosePosting,
  onWithdrawPosting,
}) {
  const dates = resolveInternshipDatesFromRow(intern);
  const periodLabel = formatInternshipPeriodLabel(dates.startDate, dates.endDate, formatDate);
  const apps = Number(intern.applications) || 0;

  return (
    <div
      className="card card-hover"
      style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', height: '100%', border: '1px solid var(--border-default)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>
            {intern.title}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className={`badge badge-${getStatusColor(intern.status)}`} style={{ padding: '0.2rem 0.5rem' }}>
              {formatJobPostingStatus(intern.status)}
            </span>
            {periodLabel ? (
              <span className="badge badge-gray" style={{ padding: '0.2rem 0.5rem' }}>
                {periodLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ background: 'var(--success-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
          <GraduationCap size={20} className="text-success-700" />
        </div>
      </div>
      {intern.keywords ? (
        <p className="text-xs" style={{ margin: '0 0 1rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          <span className="font-semibold text-tertiary">Skills:</span> {intern.keywords}
        </p>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: 'auto',
          padding: '1rem 0',
          borderTop: '1px solid var(--border-default)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <IndianRupee size={14} style={{ color: 'var(--text-tertiary)' }} />
            {stipendLabel(intern.salaryMin, intern.salaryMax)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Users size={14} style={{ color: 'var(--text-tertiary)' }} />
            {intern.vacancies ?? '—'} openings
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <GraduationCap size={14} style={{ color: 'var(--text-tertiary)' }} />
            Min CGPA: {formatEmployerMinCgpa(intern.minCgpa ?? intern.cgpa)}
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              color: 'var(--primary-700)',
              fontWeight: 600,
              background: 'var(--primary-50)',
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-sm)',
              width: 'fit-content',
            }}
          >
            <FileText size={14} aria-hidden />
            {apps} App{apps === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '0.6rem' }} onClick={() => onManage(intern)}>
            Manage
          </button>
          <a
            className="btn btn-primary"
            href={`/dashboard/employer/applications?tab=internships&jobId=${intern.id}`}
            style={{ flex: 1, padding: '0.6rem', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
          >
            Pipeline <ArrowRight size={14} aria-hidden />
          </a>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem' }} onClick={() => onDetails(intern)}>
            Details
          </button>
          {intern.status === 'published' && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem' }}
              onClick={() => onCampusSync(intern.id)}
              title="Sync campuses"
            >
              <Users size={14} style={{ marginRight: '0.25rem' }} aria-hidden />
              Sync campuses
            </button>
          )}
        </div>
        {intern.status === 'published' && (
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}
              disabled={closingId === intern.id || withdrawingId === intern.id}
              onClick={() => void onClosePosting(intern)}
            >
              <Ban size={16} aria-hidden />
              {closingId === intern.id ? 'Closing…' : 'Close'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--danger-600)' }}
              disabled={withdrawingId === intern.id || closingId === intern.id}
              onClick={() => void onWithdrawPosting(intern)}
              title="Withdraw posting; students see applications under Withdrawn"
            >
              <Undo2 size={16} aria-hidden />
              {withdrawingId === intern.id ? 'Withdrawing…' : 'Withdraw'}
            </button>
          </div>
        )}
      </div>
      <div className="text-xs text-tertiary" style={{ textAlign: 'center', marginTop: '1rem' }}>
        Posted {intern.createdAt ? formatDate(intern.createdAt) : '—'}
      </div>
    </div>
  );
}

function InternshipDetailDialog({
  internship,
  closingId,
  withdrawingId,
  onClose,
  onManage,
  onClosePosting,
  onWithdrawPosting,
}) {
  const parsed = parseInternshipDescription(internship.description || '');
  const dates = resolveInternshipDatesFromRow(internship);
  const branchLabel = formatEligibleBranchesLabel(internship.branches ?? internship.eligibleBranches);
  const specializationList =
    internship.specializations ??
    parseInternshipAdditionalInfo(internship.additionalInfo).specializations;
  const specializationLabel = specializationList.length ? specializationList.join(', ') : '—';
  const eligibilityChecks = buildPostingEligibilityChecks(internshipEligibilityOpportunity(internship), null, {
    audience: 'college',
    openStatuses: ['published', 'draft', 'closed'],
  }).filter((row) => row.id !== 'status' && row.id !== 'resume' && row.id !== 'placement' && row.id !== 'cgpa');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="internship-detail-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <button
        type="button"
        aria-label="Close details"
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer' }}
        onClick={onClose}
      />
      <div
        className="card animate-slideUp"
        style={{ position: 'relative', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="card-header">
          <h3 id="internship-detail-title" className="card-title">{internship.title}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <DetailRow label="Status">
            <span className={`badge badge-${getStatusColor(internship.status)} badge-dot`}>{formatJobPostingStatus(internship.status)}</span>
          </DetailRow>
          <DetailRow label="Stipend / month">{stipendLabel(internship.salaryMin, internship.salaryMax)}</DetailRow>
          <DetailRow label="Start date">{dates.startDate ? formatDate(dates.startDate) : '—'}</DetailRow>
          <DetailRow label="End date">{dates.endDate ? formatDate(dates.endDate) : '—'}</DetailRow>
          <DetailRow label="Branch">{branchLabel}</DetailRow>
          <DetailRow label="Specialization">{specializationLabel}</DetailRow>
          <DetailRow label="Min CGPA">{formatEmployerMinCgpa(internship.minCgpa ?? internship.cgpa)}</DetailRow>
          <DetailRow label="Openings">{internship.vacancies ?? '—'}</DetailRow>
          <DetailRow label="Posted">{internship.createdAt ? formatDate(internship.createdAt) : '—'}</DetailRow>
          {internship.keywords ? <DetailRow label="Skills">{internship.keywords}</DetailRow> : null}
          {eligibilityChecks.length > 0 ? (
            <div style={{ marginTop: '0.25rem' }}>
              <div className="text-xs font-semibold text-tertiary" style={{ marginBottom: '0.5rem' }}>Eligibility</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {eligibilityChecks.map((row) => (
                  <li key={row.id} className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}:</span>{' '}
                    {row.requirement}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <DetailRow label="Eligibility">Open to all eligible students</DetailRow>
          )}
          {parsed.notes ? <DetailRow label="Notes">{parsed.notes}</DetailRow> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {internship.status === 'published' ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={closingId === internship.id || withdrawingId === internship.id}
                onClick={() => void onClosePosting(internship)}
              >
                {closingId === internship.id ? 'Closing…' : 'Close posting'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={withdrawingId === internship.id || closingId === internship.id}
                onClick={() => void onWithdrawPosting(internship)}
              >
                {withdrawingId === internship.id ? 'Withdrawing…' : 'Withdraw'}
              </button>
            </>
          ) : null}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onManage(internship)}>
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', alignItems: 'start' }}>
      <span className="text-xs font-semibold text-tertiary" style={{ paddingTop: '0.15rem' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function stipendLabel(min, max) {
  if (min == null && max == null) return 'Stipend TBD';
  if (min != null && max != null && Number(min) === Number(max)) {
    return `${formatCurrency(Number(min))}/mo`;
  }
  if (min != null && max != null) {
    return `${formatCurrency(Number(min))}–${formatCurrency(Number(max))}/mo`;
  }
  if (min != null) return `${formatCurrency(Number(min))}/mo`;
  return `${formatCurrency(Number(max))}/mo`;
}
