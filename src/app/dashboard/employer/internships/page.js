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
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import {
  mapEmployerInternshipApiError,
  validateEmployerInternshipForm,
} from '@/lib/employerInternshipFormValidation';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';
import EligibilityGroupPicker from '@/components/employer/EligibilityGroupPicker';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
  return <FieldError>{message}</FieldError>;
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
  const [formTab, setFormTab] = useState('basics'); // basics | eligibility | details

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
    setFormTab('basics');
    resetFormFields();
  }, [resetFormFields]);

  const openForm = () => {
    resetFormFields();
    setSavedDraftId(null);
    setFormTab('basics');
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
      setFormTab('basics');
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
        const errs = validation.fieldErrors || {};
        if (errs.title || errs.startDate || errs.endDate) setFormTab('basics');
        else if (errs.batchYear || errs.maxBacklogs || errs.minCgpa) setFormTab('eligibility');
        else if (errs._campuses) setFormTab('details');
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            {editingId && editingInternship?.status === 'published' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting || closingId === editingId || withdrawingId === editingId}
                  onClick={() => void closePublishedInternship(editingInternship)}
                >
                  {closingId === editingId ? 'Closing…' : 'Close posting'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting || withdrawingId === editingId || closingId === editingId}
                  onClick={() => void withdrawPublishedInternship(editingInternship)}
                  title="Withdraw posting and move student applications to Withdrawn"
                >
                  <Undo2 data-icon="inline-start" />
                  {withdrawingId === editingId ? 'Withdrawing…' : 'Withdraw'}
                </Button>
              </div>
            ) : (
              <span />
            )}
            <div className="ml-auto flex flex-wrap gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={closeForm}>
                Cancel
              </Button>
              {canSaveAsDraft ? (
                <Button type="button" variant="secondary" disabled={submitting} onClick={() => void submitInternship(true)}>
                  {submitting ? 'Saving…' : 'Save as Draft'}
                </Button>
              ) : null}
              <Button type="button" disabled={submitting} onClick={() => void submitInternship(false)}>
                {submitting
                  ? editingInternship?.status === 'published'
                    ? 'Saving…'
                    : 'Publishing…'
                  : editingInternship?.status === 'published'
                    ? 'Save changes'
                    : 'Publish Internship'}
              </Button>
            </div>
          </div>
        }
      >
        {editingId && editingInternship?.status === 'published' ? (
          <p className="text-muted-foreground mb-4 mt-0 text-sm">
            Campus visibility is unchanged here. Use <strong>Sync</strong> on a published row to add campuses.
          </p>
        ) : null}

        <Tabs value={formTab} onValueChange={setFormTab} className="w-full gap-4">
          <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {[
              { id: 'basics', title: 'Basics', sub: 'Title, dates, stipend' },
              { id: 'eligibility', title: 'Eligibility', sub: 'Branches, CGPA, batch' },
              { id: 'details', title: 'Details', sub: 'Skills, campuses, notes' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex h-auto flex-col items-start gap-0.5 px-3 py-2 data-active:shadow-none"
              >
                <span className="text-sm font-medium">{tab.title}</span>
                <span className="text-muted-foreground text-xs font-normal">{tab.sub}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="basics" className="mt-2 outline-none">
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="gap-2 sm:col-span-2" data-invalid={fieldErrors.title ? true : undefined}>
                <FieldLabel>
                  Internship Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  aria-invalid={fieldErrors.title ? true : undefined}
                  placeholder="e.g., Summer Data Intern"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
                  }}
                />
                <InternFieldError message={fieldErrors.title} />
              </Field>
              <Field className="gap-2" data-invalid={fieldErrors.startDate ? true : undefined}>
                <FieldLabel>
                  Start date <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  type="date"
                  aria-invalid={fieldErrors.startDate ? true : undefined}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (fieldErrors.startDate) setFieldErrors((prev) => ({ ...prev, startDate: '' }));
                  }}
                  aria-label="Internship start date"
                />
                <InternFieldError message={fieldErrors.startDate} />
              </Field>
              <Field className="gap-2" data-invalid={fieldErrors.endDate ? true : undefined}>
                <FieldLabel>
                  End date <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  type="date"
                  aria-invalid={fieldErrors.endDate ? true : undefined}
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (fieldErrors.endDate) setFieldErrors((prev) => ({ ...prev, endDate: '' }));
                  }}
                  aria-label="Internship end date"
                />
                <InternFieldError message={fieldErrors.endDate} />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Stipend / month (min, INR)</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_STIPEND_MIN}
                  placeholder="40000"
                  value={stipend}
                  onChange={setStipend}
                  stepperStep={1}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Stipend / month (max, optional)</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_STIPEND_MAX}
                  context={{ salaryMin: stipend }}
                  placeholder="Same as min if empty"
                  value={stipendMax}
                  onChange={setStipendMax}
                  stepperStep={1}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Openings</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_VACANCIES}
                  value={vacancies}
                  onChange={setVacancies}
                />
              </Field>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="eligibility" className="mt-2 outline-none">
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="gap-2">
                <FieldLabel>Min CGPA</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_MIN_CGPA}
                  step="0.1"
                  value={minCgpa}
                  onChange={setMinCgpa}
                />
              </Field>
              <Field className="gap-2" data-invalid={fieldErrors.maxBacklogs ? true : undefined}>
                <FieldLabel>Max active backlogs</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS}
                  value={maxBacklogs}
                  onChange={(v) => {
                    setMaxBacklogs(v);
                    if (fieldErrors.maxBacklogs) setFieldErrors((prev) => ({ ...prev, maxBacklogs: '' }));
                  }}
                  className={fieldErrors.maxBacklogs ? 'input-error' : undefined}
                />
                <FieldDescription>
                  0 means students with no active backlogs only. Increase if you allow backlogs.
                </FieldDescription>
                <InternFieldError message={fieldErrors.maxBacklogs} />
              </Field>
              <Field className="gap-2" data-invalid={fieldErrors.batchYear ? true : undefined}>
                <FieldLabel>
                  Batch year <span className="text-destructive">*</span>
                </FieldLabel>
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
                  className={fieldErrors.batchYear ? 'input-error' : undefined}
                />
                <FieldDescription>
                  Required when publishing. Current year through 4 years ahead (e.g. {new Date().getFullYear()}–
                  {new Date().getFullYear() + 4}).
                </FieldDescription>
                <InternFieldError message={fieldErrors.batchYear} />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Specializations</FieldLabel>
                <Input
                  placeholder="AI/ML, Data Science, Cloud"
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                />
              </Field>
              <Field className="gap-2 sm:col-span-2">
                <FieldLabel>Eligible branches / groups</FieldLabel>
                <EligibilityGroupPicker value={eligibleBranches} onChange={setEligibleBranches} />
              </Field>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="details" className="mt-2 outline-none">
            <FieldGroup className="grid grid-cols-1 gap-4">
              {showCampusPicker ? (
                <Field className="gap-2" data-invalid={fieldErrors._campuses ? true : undefined}>
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
                </Field>
              ) : null}
              <Field className="gap-2">
                <FieldLabel>Skills (comma-separated)</FieldLabel>
                <Input
                  placeholder="Python, SQL, ML"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Additional notes</FieldLabel>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Location, PPO hint, project details…"
                />
              </Field>
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </EmployerListFormLayout>
    );
  }

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <GraduationCap className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Internship Programs
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Post internships to <span className="font-mono text-xs">job_postings</span> (same pipeline as Job Postings).
            Stipend fields are stored as monthly INR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalCount > 0 ? (
            <ExportCsvSplitButton
              mode="dual"
              filenameBase="employer_internships"
              currentCount={filteredCount}
              fullCount={totalCount}
              getRows={getInternshipsCsv}
            />
          ) : null}
          <Button type="button" onClick={openForm}>
            <Plus data-icon="inline-start" />
            Post Internship
          </Button>
        </div>
      </div>

      {jobsError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load internships</AlertTitle>
          <AlertDescription>
            {jobsError.message}. Check login and database configuration.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" strokeWidth={1.5} />
              Published internships
            </CardDescription>
            <CardTitle className="text-2xl">{stats.published}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <IndianRupee className="size-4" strokeWidth={1.5} />
              Avg monthly stipend
            </CardDescription>
            <CardTitle className="text-2xl">
              {stats.avgStipend != null ? formatCurrency(stats.avgStipend) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <Activity className="size-4" strokeWidth={1.5} />
              All internship records
            </CardDescription>
            <CardTitle className="text-2xl">{stats.count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {jobsLoading ? <PageLoading message="Loading internships…" variant="skeleton-list" inline /> : null}

      {!jobsLoading && !jobsError && internships.length === 0 ? (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
              <GraduationCap className="size-7" />
            </div>
            <CardTitle className="mb-1 text-lg">No internship postings yet</CardTitle>
            <CardDescription>Use Post Internship to publish one.</CardDescription>
          </CardContent>
        </Card>
      ) : null}

      {!jobsLoading && !jobsError && totalCount > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Your internship postings</CardTitle>
                <CardDescription>
                  Showing {filteredCount} of {totalCount}
                </CardDescription>
              </div>
              <div
                className="bg-muted flex w-fit items-center gap-0.5 rounded-lg p-[3px]"
                role="group"
                aria-label="View mode"
              >
                {[
                  { mode: 'card', icon: LayoutGrid, label: 'Card view', short: 'Cards' },
                  { mode: 'list', icon: List, label: 'List view', short: 'List' },
                ].map(({ mode, icon: Icon, label, short }) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={viewMode === mode ? 'secondary' : 'ghost'}
                    title={label}
                    aria-label={label}
                    aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    className="h-8 gap-1.5 px-2.5"
                  >
                    <Icon data-icon="inline-start" />
                    {short}
                  </Button>
                ))}
              </div>
            </div>
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
          </CardHeader>
          <CardContent className="p-0">
            {viewMode === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Stipend / month</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Min CGPA</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInternships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                        No internships match your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {displayInternships.map((intern) => {
                    const listDates = resolveInternshipDatesFromRow(intern);
                    return (
                      <TableRow key={String(intern.id)}>
                        <TableCell className="max-w-[16rem]">
                          <div className="font-medium">{intern.title}</div>
                          {intern.keywords ? (
                            <div className="text-muted-foreground mt-0.5 truncate text-xs">{intern.keywords}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{stipendLabel(intern.salaryMin, intern.salaryMax)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatInternshipPeriodLabel(listDates.startDate, listDates.endDate, formatDate) || '—'}
                        </TableCell>
                        <TableCell>{formatEmployerMinCgpa(intern.minCgpa ?? intern.cgpa)}</TableCell>
                        <TableCell>{intern.vacancies ?? '—'}</TableCell>
                        <TableCell className="min-w-[6.5rem]">
                          <StatusBadge status={intern.status || 'draft'} showDot>
                            {formatJobPostingStatus(intern.status) || 'Draft'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {intern.createdAt ? formatDate(intern.createdAt) : '—'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {displayInternships.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <GraduationCap className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
                    <CardTitle className="mb-1 text-lg">No internships match</CardTitle>
                    <CardDescription>Try adjusting your search or status filter.</CardDescription>
                  </div>
                ) : (
                  displayInternships.map((intern) => (
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
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-muted-foreground m-0 text-sm">
        {internships.length} internship posting{internships.length === 1 ? '' : 's'} from your company
      </p>

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
    <Card size="sm" className="h-full gap-3">
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{intern.title}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={intern.status} showDot>
                {formatJobPostingStatus(intern.status)}
              </StatusBadge>
              {periodLabel ? <Badge variant="secondary">{periodLabel}</Badge> : null}
            </div>
          </div>
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <GraduationCap className="size-4" />
          </div>
        </div>
        {intern.keywords ? (
          <CardDescription className="line-clamp-2">
            <span className="font-medium">Skills:</span> {intern.keywords}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <IndianRupee className="size-3.5" />
            {stipendLabel(intern.salaryMin, intern.salaryMax)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {intern.vacancies ?? '—'} openings
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-3.5" />
            Min CGPA: {formatEmployerMinCgpa(intern.minCgpa ?? intern.cgpa)}
          </span>
          <span className="text-primary bg-primary/10 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-semibold">
            <FileText className="size-3.5" aria-hidden />
            {apps} App{apps === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t pt-3">
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onManage(intern)}>
              Manage
            </Button>
            <Button
              className="flex-1"
              render={<a href={`/dashboard/employer/applications?tab=internships&jobId=${intern.id}`} />}
              nativeButton={false}
            >
              Pipeline
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => onDetails(intern)}>
              Details
            </Button>
            {intern.status === 'published' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => onCampusSync(intern.id)}
                title="Sync campuses"
              >
                <Users data-icon="inline-start" />
                Sync campuses
              </Button>
            ) : null}
          </div>
          {intern.status === 'published' ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={closingId === intern.id || withdrawingId === intern.id}
                onClick={() => void onClosePosting(intern)}
              >
                <Ban data-icon="inline-start" />
                {closingId === intern.id ? 'Closing…' : 'Close'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive flex-1"
                disabled={withdrawingId === intern.id || closingId === intern.id}
                onClick={() => void onWithdrawPosting(intern)}
                title="Withdraw posting; students see applications under Withdrawn"
              >
                <Undo2 data-icon="inline-start" />
                {withdrawingId === intern.id ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            </div>
          ) : null}
          <p className="text-muted-foreground m-0 text-center text-xs">
            Posted {intern.createdAt ? formatDate(intern.createdAt) : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
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
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl gap-4" showCloseButton>
        <DialogHeader className="gap-2 pr-8">
          <DialogTitle id="internship-detail-title" className="text-xl font-semibold">
            {internship.title}
          </DialogTitle>
          <DialogDescription>
            <StatusBadge status={internship.status} showDot>
              {formatJobPostingStatus(internship.status)}
            </StatusBadge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailField label="Stipend / month">{stipendLabel(internship.salaryMin, internship.salaryMax)}</DetailField>
            <DetailField label="Start date">{dates.startDate ? formatDate(dates.startDate) : '—'}</DetailField>
            <DetailField label="End date">{dates.endDate ? formatDate(dates.endDate) : '—'}</DetailField>
            <DetailField label="Branch">{branchLabel}</DetailField>
            <DetailField label="Specialization">{specializationLabel}</DetailField>
            <DetailField label="Min CGPA">{formatEmployerMinCgpa(internship.minCgpa ?? internship.cgpa)}</DetailField>
            <DetailField label="Openings">{internship.vacancies ?? '—'}</DetailField>
            <DetailField label="Posted">{internship.createdAt ? formatDate(internship.createdAt) : '—'}</DetailField>
          </div>
          {internship.keywords ? <DetailField label="Skills">{internship.keywords}</DetailField> : null}
          {eligibilityChecks.length > 0 ? (
            <DetailField label="Eligibility">
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {eligibilityChecks.map((row) => (
                  <li key={row.id} className="text-sm leading-relaxed">
                    <span className="font-semibold">{row.label}:</span> {row.requirement}
                  </li>
                ))}
              </ul>
            </DetailField>
          ) : (
            <DetailField label="Eligibility">Open to all eligible students</DetailField>
          )}
          {parsed.notes ? <DetailField label="Notes">{parsed.notes}</DetailField> : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          {internship.status === 'published' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={closingId === internship.id || withdrawingId === internship.id}
                onClick={() => void onClosePosting(internship)}
              >
                {closingId === internship.id ? 'Closing…' : 'Close posting'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={withdrawingId === internship.id || closingId === internship.id}
                onClick={() => void onWithdrawPosting(internship)}
              >
                {withdrawingId === internship.id ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            </>
          ) : null}
          <Button type="button" variant="secondary" size="sm" onClick={() => onManage(internship)}>
            Manage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
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
  return `${formatCurrency(Number(min ?? max))}/mo`;
}
