'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import PageLoading from '@/components/PageLoading';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import { formatDate, formatStatus, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import {
  Briefcase,
  Plus,
  DollarSign,
  Users,
  FileText,
  ArrowRight,
  Ban,
  LayoutGrid,
  List,
  Undo2,
  GitBranch,
  IndianRupee,
  Activity,
} from 'lucide-react';
import { formatJobPostingStatus } from '@/lib/employerJobDisplay';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import CurrencyAmountInput from '@/components/form/CurrencyAmountInput';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { buildDefaultTenantSelection } from '@/lib/defaultTestCampus';
import {
  ALUMNI_EMPLOYMENT_TYPE_LABELS,
  ALUMNI_EDUCATION_LEVELS,
  ALUMNI_SENIORITY_LEVELS,
  ALUMNI_WORK_MODES,
  buildAlumniJobDescription,
  validateAlumniJobPostingPayload,
} from '@/lib/alumniJobPosting';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';
import { useEmployerPostingCampuses } from '@/hooks/useEmployerPostingCampuses';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { toCsvIsoDate } from '@/lib/csvExport';
import EmployerListFormLayout from '@/components/employer/EmployerListFormLayout';
import EmployerCampusSyncDialog from '@/components/employer/EmployerCampusSyncDialog';

async function swrFetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const SELECT_CN =
  'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

const emptyForm = {
  title: '',
  keywords: '',
  type: 'full_time',
  salaryMin: '',
  salaryMax: '',
  vacancies: '1',
  minExperience: '',
  maxExperience: '',
  workMode: 'hybrid',
  noticePeriodDays: '',
  seniorityLevel: 'mid',
  educationLevel: 'bachelors',
  location: '',
  industry: '',
  description: '',
};

function salaryLabel(min, max) {
  if (min != null && max != null) return `${formatCurrency(Number(min))} – ${formatCurrency(Number(max))}`;
  if (min != null) return formatCurrency(Number(min));
  if (max != null) return formatCurrency(Number(max));
  return 'Salary TBD';
}

export default function EmployerJobsPage() {
  const { addToast } = useToast();
  const jobsApiPath = '/api/employer/jobs?scope=alumni';
  const { data: campusData } = useSWR('/api/employer/campuses', swrFetcher, { revalidateOnFocus: true });
  const { data: profileData } = useSWR('/api/employer/profile', swrFetcher, { revalidateOnFocus: true });
  const {
    data: jobData,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateJobs,
  } = useSWR(jobsApiPath, swrFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedTenantIds, setSelectedTenantIds] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [closingJobId, setClosingJobId] = useState(null);
  const [withdrawingJobId, setWithdrawingJobId] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [formTab, setFormTab] = useState('basics');
  const [detailJob, setDetailJob] = useState(null);
  const [campusSyncJobId, setCampusSyncJobId] = useState(null);
  const [campusSyncSelection, setCampusSyncSelection] = useState({});
  const [campusSyncSubmitting, setCampusSyncSubmitting] = useState(false);

  const jobsList = Array.isArray(jobData?.jobs) ? jobData.jobs : [];
  const approvedCampuses = useEmployerPostingCampuses(campusData, 'alumni_jobs');

  const jobStatusFilterOptions = useMemo(
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
    filtered: displayJobs,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(jobsList, {
    getSearchText: (j) => [j.title, j.keywords, j.status, j.location, j.type].filter(Boolean).join(' '),
    filterFn: (row, f) => !f || String(row.status || '') === f,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const profileHeadquarters = profileData?.profile?.headquarters;

  const editingJob = useMemo(
    () => (editingId ? jobsList.find((j) => j.id === editingId) : null),
    [editingId, jobsList],
  );

  const stats = useMemo(() => {
    let sum = 0;
    let count = 0;
    jobsList.filter((j) => j.status === 'published').forEach((j) => {
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
      count: jobsList.length,
      published: jobsList.filter((j) => j.status === 'published').length,
      avgSalary: count ? Math.round(sum / count) : null,
    };
  }, [jobsList]);

  useEffect(() => {
    if (!showForm) return;
    setForm((prev) => {
      const location = prev.location?.trim() ? prev.location : profileHeadquarters || '';
      return {
        ...prev,
        location,
        description: buildAlumniJobDescription({ ...prev, location }),
      };
    });
  }, [
    showForm,
    form.title,
    form.keywords,
    form.type,
    form.salaryMin,
    form.salaryMax,
    form.vacancies,
    form.minExperience,
    form.maxExperience,
    form.workMode,
    form.noticePeriodDays,
    form.seniorityLevel,
    form.educationLevel,
    form.industry,
    profileHeadquarters,
  ]);

  const resetFormFields = useCallback(() => {
    setForm({ ...emptyForm });
    setEditingId(null);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSavedDraftId(null);
    setFormTab('basics');
    resetFormFields();
    setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses));
  }, [approvedCampuses, resetFormFields]);

  const openCreate = () => {
    resetFormFields();
    setSavedDraftId(null);
    setFormTab('basics');
    setForm({ ...emptyForm, type: 'full_time' });
    setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses));
    setShowForm(true);
  };

  const openManage = useCallback(
    (job) => {
      setSavedDraftId(null);
      setEditingId(job.id);
      setForm({
        title: job.title,
        keywords: job.keywords || '',
        type: job.type === 'contract' ? 'contract' : 'full_time',
        salaryMin: job.salaryMin ?? '',
        salaryMax: job.salaryMax ?? '',
        vacancies: job.vacancies ?? '1',
        minExperience: job.minExperience ?? '',
        maxExperience: job.maxExperience ?? '',
        workMode: job.workMode || 'hybrid',
        noticePeriodDays: job.noticePeriodDays ?? '',
        seniorityLevel: job.seniorityLevel || 'mid',
        educationLevel: job.educationLevel || 'bachelors',
        location: job.location || '',
        industry: job.industry || '',
        description: job.description || '',
      });
      setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses, job.tenantIds));
      setFormTab('basics');
      setShowForm(true);
      setDetailJob(null);
    },
    [approvedCampuses],
  );

  const openDetails = useCallback((job) => {
    setDetailJob(job);
  }, []);

  const setField = useCallback((key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const submitJob = async (asDraft) => {
    const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, form.title, { label: 'Job title' });
    if (titleErr) {
      addToast(titleErr, 'error');
      setFormTab('basics');
      return;
    }
    const tenantIds = Object.entries(selectedTenantIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!asDraft && !tenantIds.length) {
      addToast('Select at least one approved campus so notifications are created for that college.', 'warning');
      setFormTab('details');
      return;
    }
    const validated = validateAlumniJobPostingPayload({
      salaryMin: form.salaryMin,
      salaryMax: form.salaryMax,
      minExperience: form.minExperience,
      maxExperience: form.maxExperience,
      noticePeriodDays: form.noticePeriodDays,
      jobType: form.type,
    });
    if (validated.error) {
      addToast(validated.error, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const jobId = editingId || savedDraftId;
      const res = await fetch('/api/employer/jobs', {
        method: jobId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          title: form.title.trim(),
          description: form.description,
          jobType: form.type,
          status: asDraft ? 'draft' : 'published',
          salaryMin: form.salaryMin,
          salaryMax: form.salaryMax,
          vacancies: form.vacancies,
          keywords: form.keywords,
          minExperience: form.minExperience,
          maxExperience: form.maxExperience,
          workMode: form.workMode,
          noticePeriodDays: form.noticePeriodDays,
          seniorityLevel: form.seniorityLevel,
          educationLevel: form.educationLevel,
          location: form.location,
          industry: form.industry,
          tenantIds: asDraft ? [] : tenantIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json.error || (jobId ? 'Update failed' : 'Save failed'), 'error');
        return;
      }
      const savedId = json.job?.id || jobId;
      if (asDraft && !editingId && savedId) {
        setSavedDraftId(savedId);
        addToast('Draft saved. Select campuses and click Publish when ready.', 'success');
        mutateJobs();
        return;
      }
      addToast(
        editingId
          ? 'Job updated successfully.'
          : asDraft
            ? 'Draft saved to the database (no alerts sent).'
            : 'Alumni job published. College admins were notified for each selected campus.',
        'success',
      );
      closeForm();
      mutateJobs();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closePublishedJob = useCallback(
    async (job) => {
      if (!job?.id) return;
      setClosingJobId(job.id);
      try {
        const res = await fetch('/api/employer/jobs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close', id: job.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(json.error || 'Could not close job', 'error');
          return;
        }
        addToast('Job posting closed. It will stay visible under Closed for your records.', 'success');
        setDetailJob(null);
        if (editingId === job.id) closeForm();
        await mutateJobs();
      } catch {
        addToast('Network error', 'error');
      } finally {
        setClosingJobId(null);
      }
    },
    [addToast, mutateJobs, editingId, closeForm],
  );

  const withdrawPublishedJob = useCallback(
    async (job) => {
      if (!job?.id) return;
      setWithdrawingJobId(job.id);
      try {
        const res = await fetch('/api/employer/jobs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'withdraw', id: job.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(json.error || 'Could not withdraw job', 'error');
          return;
        }
        const n = Number(json.applicationsWithdrawn) || 0;
        addToast(
          n > 0
            ? `Job withdrawn. ${n} student application${n === 1 ? '' : 's'} moved to Withdrawn.`
            : 'Job withdrawn. It no longer accepts applications.',
          'success',
        );
        setDetailJob(null);
        if (editingId === job.id) closeForm();
        await mutateJobs();
      } catch {
        addToast('Network error', 'error');
      } finally {
        setWithdrawingJobId(null);
      }
    },
    [addToast, mutateJobs, editingId, closeForm],
  );

  const campusSyncJob = useMemo(
    () => jobsList.find((j) => j.id === campusSyncJobId) ?? null,
    [jobsList, campusSyncJobId],
  );

  const openCampusSync = useCallback(
    (jobId) => {
      if (!approvedCampuses.length) {
        addToast('No approved campuses yet. Ask a college to approve your tie-up first.', 'warning');
        return;
      }
      const job = jobsList.find((j) => j.id === jobId);
      setDetailJob(null);
      setCampusSyncSelection(buildDefaultTenantSelection(approvedCampuses, job?.tenantIds));
      setCampusSyncJobId(jobId);
    },
    [approvedCampuses, jobsList, addToast],
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
      await mutateJobs();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setCampusSyncSubmitting(false);
    }
  }, [campusSyncJobId, campusSyncSelection, addToast, mutateJobs]);

  const getJobsCsv = useCallback(
    (scope) => {
      const list = scope === 'current' ? displayJobs : jobsList;
      return {
        headers: [
          'id',
          'title',
          'keywords',
          'type',
          'salary_min_inr',
          'salary_max_inr',
          'min_experience',
          'max_experience',
          'work_mode',
          'location',
          'vacancies',
          'status',
          'posted_at',
          'campus_tenant_ids',
        ],
        rows: list.map((job) => [
          job.id,
          job.title ?? '',
          job.keywords ?? '',
          job.type ?? '',
          job.salaryMin != null ? String(job.salaryMin) : '',
          job.salaryMax != null ? String(job.salaryMax) : '',
          job.minExperience != null ? String(job.minExperience) : '',
          job.maxExperience != null ? String(job.maxExperience) : '',
          job.workMode ?? '',
          job.location ?? '',
          job.vacancies != null ? String(job.vacancies) : '',
          job.status ?? '',
          job.createdAt ? toCsvIsoDate(job.createdAt) : '',
          Array.isArray(job.tenantIds) ? job.tenantIds.join(';') : '',
        ]),
      };
    },
    [displayJobs, jobsList],
  );

  const showCampusPicker = !editingId || savedDraftId || editingJob?.status === 'draft';
  const canSaveAsDraft = editingJob?.status !== 'published' && editingJob?.status !== 'closed';

  if (showForm) {
    return (
      <EmployerListFormLayout
        title={
          editingId
            ? 'Edit Job Posting'
            : savedDraftId
              ? 'Create New Job Posting (draft saved)'
              : 'Create New Job Posting'
        }
        subtitle={
          editingId
            ? editingJob?.status === 'draft'
              ? 'Update this draft, save again as draft, or publish to approved campuses.'
              : 'Update role details and compensation. Use Sync on the list to add campuses.'
            : savedDraftId
              ? 'Draft is saved. Select campuses and publish when ready, or keep editing.'
              : 'Post lateral roles for alumni — experienced hire openings shared with your campus network.'
        }
        onBack={closeForm}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            {editingId && editingJob?.status === 'published' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting || closingJobId === editingId || withdrawingJobId === editingId}
                  onClick={() => void closePublishedJob(editingJob)}
                >
                  {closingJobId === editingId ? 'Closing…' : 'Close posting'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting || withdrawingJobId === editingId || closingJobId === editingId}
                  onClick={() => void withdrawPublishedJob(editingJob)}
                  title="Withdraw posting and move student applications to Withdrawn"
                >
                  <Undo2 data-icon="inline-start" />
                  {withdrawingJobId === editingId ? 'Withdrawing…' : 'Withdraw'}
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
                <Button type="button" variant="secondary" disabled={submitting} onClick={() => void submitJob(true)}>
                  {submitting ? 'Saving…' : 'Save as Draft'}
                </Button>
              ) : null}
              <Button type="button" disabled={submitting} onClick={() => void submitJob(false)}>
                {submitting
                  ? editingJob?.status === 'published'
                    ? 'Saving…'
                    : 'Publishing…'
                  : editingJob?.status === 'published'
                    ? 'Update Published Job'
                    : 'Publish Job'}
              </Button>
            </div>
          </div>
        }
      >
        {editingId && editingJob?.status === 'published' ? (
          <p className="text-muted-foreground mb-4 mt-0 text-sm">
            Campus visibility is unchanged here. Use <strong>Sync</strong> on a published row to add campuses.
          </p>
        ) : null}

        <Tabs value={formTab} onValueChange={setFormTab} className="w-full gap-4">
          <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {[
              { id: 'basics', title: 'Basics', sub: 'Title, type, compensation' },
              { id: 'eligibility', title: 'Eligibility', sub: 'Experience, education' },
              { id: 'details', title: 'Details', sub: 'Campuses, skills, description' },
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
              <Field className="gap-2 sm:col-span-2">
                <FieldLabel>
                  Job Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  placeholder="e.g. Software Development Engineer"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>
                  Employment type <span className="text-destructive">*</span>
                </FieldLabel>
                <AdminFilterSelect
                  className={SELECT_CN}
                  value={form.type}
                  emptyMapsToAll={false}
                  onValueChange={(v) => setField('type', v)}
                  aria-label="Employment type"
                  items={Object.entries(ALUMNI_EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({ label, value }))}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Seniority band</FieldLabel>
                <AdminFilterSelect
                  className={SELECT_CN}
                  value={form.seniorityLevel}
                  emptyMapsToAll={false}
                  onValueChange={(v) => setField('seniorityLevel', v)}
                  aria-label="Seniority band"
                  items={ALUMNI_SENIORITY_LEVELS.map((o) => ({ label: o.label, value: o.value }))}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Work mode</FieldLabel>
                <AdminFilterSelect
                  className={SELECT_CN}
                  value={form.workMode}
                  emptyMapsToAll={false}
                  onValueChange={(v) => setField('workMode', v)}
                  aria-label="Work mode"
                  items={ALUMNI_WORK_MODES.map((o) => ({ label: o.label, value: o.value }))}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Job location</FieldLabel>
                <Input
                  placeholder="e.g. Bengaluru, Chennai"
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Industry / function</FieldLabel>
                <Input
                  placeholder="e.g. IT Services, Product Engineering"
                  value={form.industry}
                  onChange={(e) => setField('industry', e.target.value)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Min salary (annual CTC)</FieldLabel>
                <CurrencyAmountInput
                  fieldId={FIELD_IDS.EMPLOYER_SALARY_MIN}
                  placeholder="800000"
                  value={form.salaryMin}
                  onChange={(v) => setField('salaryMin', v)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Max salary (annual CTC)</FieldLabel>
                <CurrencyAmountInput
                  fieldId={FIELD_IDS.EMPLOYER_SALARY_MAX}
                  context={{ salaryMin: form.salaryMin }}
                  placeholder="1500000"
                  value={form.salaryMax}
                  onChange={(v) => setField('salaryMax', v)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Openings</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_VACANCIES}
                  placeholder="10"
                  value={form.vacancies}
                  onChange={(v) => setField('vacancies', v)}
                />
              </Field>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="eligibility" className="mt-2 outline-none">
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="gap-2">
                <FieldLabel>Min experience (years)</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_MIN_EXPERIENCE}
                  placeholder="2"
                  value={form.minExperience}
                  onChange={(v) => setField('minExperience', v)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Max experience (years)</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_MAX_EXPERIENCE}
                  context={{ minExperience: form.minExperience }}
                  placeholder="8"
                  value={form.maxExperience}
                  onChange={(v) => setField('maxExperience', v)}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Education</FieldLabel>
                <AdminFilterSelect
                  className={SELECT_CN}
                  value={form.educationLevel}
                  emptyMapsToAll={false}
                  onValueChange={(v) => setField('educationLevel', v)}
                  aria-label="Education level"
                  items={ALUMNI_EDUCATION_LEVELS.map((o) => ({ label: o.label, value: o.value }))}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Notice period (days)</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_NOTICE_PERIOD}
                  placeholder="30"
                  value={form.noticePeriodDays}
                  onChange={(v) => setField('noticePeriodDays', v)}
                />
              </Field>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="details" className="mt-2 outline-none">
            <FieldGroup className="grid grid-cols-1 gap-4">
              {showCampusPicker ? (
                <Field className="gap-2">
                  <EmployerCampusTargetPicker
                    campuses={approvedCampuses}
                    selection={selectedTenantIds}
                    onSelectionChange={setSelectedTenantIds}
                    label="Target campuses (approved)"
                    required={!canSaveAsDraft || !!savedDraftId || editingJob?.status === 'draft'}
                    hint={
                      savedDraftId || editingJob?.status === 'draft'
                        ? 'Required when you publish. Drafts are not visible to students.'
                        : 'Required to publish. Optional if you only Save as Draft.'
                    }
                    emptyMessage="No approved campuses yet. Request access from the campus directory first."
                  />
                </Field>
              ) : null}
              <Field className="gap-2">
                <FieldLabel>Key skills</FieldLabel>
                <Input
                  placeholder="e.g. Java, AWS, stakeholder management, system design"
                  value={form.keywords}
                  onChange={(e) => setField('keywords', e.target.value)}
                />
                <FieldDescription>Comma-separated skills (like Naukri / Monster key skills).</FieldDescription>
              </Field>
              <Field className="gap-2">
                <FieldLabel>Job description</FieldLabel>
                <FieldDescription>
                  Auto-generated from fields above. Edit below to refine before publishing.
                </FieldDescription>
                <Textarea
                  rows={12}
                  className="font-mono text-sm leading-relaxed"
                  placeholder="Description is generated from the fields…"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
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
            <Briefcase className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Alumni Job Postings
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Post lateral roles for alumni — experienced hire openings shared with your campus network.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalCount > 0 ? (
            <ExportCsvSplitButton
              mode="dual"
              filenameBase="employer_alumni_jobs"
              currentCount={filteredCount}
              fullCount={totalCount}
              getRows={getJobsCsv}
            />
          ) : null}
          <Button type="button" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Create Job
          </Button>
        </div>
      </div>

      {jobsError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load alumni jobs</AlertTitle>
          <AlertDescription>
            {jobsError.message}. If this persists on production, run database migration{' '}
            <code className="text-xs">npm run db:migrate:075</code> and refresh.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" strokeWidth={1.5} />
              Published jobs
            </CardDescription>
            <CardTitle className="text-2xl">{stats.published}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <IndianRupee className="size-4" strokeWidth={1.5} />
              Avg annual CTC
            </CardDescription>
            <CardTitle className="text-2xl">
              {stats.avgSalary != null ? formatCurrency(stats.avgSalary) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <Activity className="size-4" strokeWidth={1.5} />
              All job records
            </CardDescription>
            <CardTitle className="text-2xl">{stats.count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {jobsLoading ? <PageLoading message="Loading alumni jobs…" variant="skeleton-list" inline /> : null}

      {!jobsLoading && !jobsError && jobsList.length === 0 ? (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
              <Briefcase className="size-7" />
            </div>
            <CardTitle className="mb-1 text-lg">No alumni jobs yet</CardTitle>
            <CardDescription>
              Create your first lateral role for alumni. Internships and campus programs are managed on their own pages.
            </CardDescription>
          </CardContent>
        </Card>
      ) : null}

      {!jobsLoading && !jobsError && totalCount > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Your alumni job postings</CardTitle>
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
              searchPlaceholder="Search title, keywords, or location…"
              filter={filter}
              onFilterChange={setFilter}
              filterOptions={jobStatusFilterOptions}
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
                    <TableHead>Job Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="min-w-[6.5rem]">Status</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Apps</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                        No alumni jobs match your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {displayJobs.map((job) => (
                    <TableRow key={String(job.id)}>
                      <TableCell className="max-w-[16rem]">
                        <div className="font-medium">{job.title}</div>
                        {job.keywords ? (
                          <div className="text-muted-foreground mt-0.5 truncate text-xs">{job.keywords}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatStatus(job.type) || '—'}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[6.5rem]" data-label="Status">
                        <StatusBadge status={job.status || 'draft'} showDot>
                          {formatJobPostingStatus(job.status) || 'Draft'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {salaryLabel(job.salaryMin, job.salaryMax)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{job.experienceLabel || '—'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[8rem] truncate">
                        {job.location || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-primary bg-primary/10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold">
                          <FileText className="size-3.5" aria-hidden />
                          {job.applications ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {job.status === 'published' ? (
                            <StandardTableIconAction
                              action="sync"
                              variant="ghost"
                              showLabel={false}
                              disabled={campusSyncSubmitting && campusSyncJobId === job.id}
                              tooltip={
                                campusSyncSubmitting && campusSyncJobId === job.id
                                  ? 'Syncing campuses…'
                                  : undefined
                              }
                              onClick={() => openCampusSync(job.id)}
                            />
                          ) : null}
                          <StandardTableIconAction
                            action="details"
                            variant="ghost"
                            showLabel={false}
                            onClick={() => openDetails(job)}
                          />
                          <StandardTableIconAction
                            action="manage"
                            variant="ghost"
                            showLabel={false}
                            onClick={() => openManage(job)}
                          />
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            title="View pipeline"
                            aria-label="View pipeline"
                            nativeButton={false}
                            render={
                              <Link href={`/dashboard/employer/applications?tab=jobs&jobId=${job.id}`} />
                            }
                          >
                            <GitBranch aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {displayJobs.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <Briefcase className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
                    <CardTitle className="mb-1 text-lg">No alumni jobs match</CardTitle>
                    <CardDescription>Try adjusting your search or status filter.</CardDescription>
                  </div>
                ) : (
                  displayJobs.map((job) => (
                    <JobCard
                      key={String(job.id)}
                      job={job}
                      closingJobId={closingJobId}
                      withdrawingJobId={withdrawingJobId}
                      onCampusSync={openCampusSync}
                      onDetails={openDetails}
                      onManage={openManage}
                      onClosePosting={closePublishedJob}
                      onWithdrawPosting={withdrawPublishedJob}
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-muted-foreground m-0 text-sm">
        {jobsList.length} alumni job posting{jobsList.length === 1 ? '' : 's'} from your company
      </p>

      {detailJob ? (
        <JobDetailDialog
          job={detailJob}
          closingJobId={closingJobId}
          withdrawingJobId={withdrawingJobId}
          onClose={() => setDetailJob(null)}
          onManage={openManage}
          onClosePosting={closePublishedJob}
          onWithdrawPosting={withdrawPublishedJob}
        />
      ) : null}

      <EmployerCampusSyncDialog
        open={Boolean(campusSyncJobId)}
        jobTitle={campusSyncJob?.title}
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

function JobCard({
  job,
  closingJobId,
  withdrawingJobId,
  onCampusSync,
  onDetails,
  onManage,
  onClosePosting,
  onWithdrawPosting,
}) {
  const apps = Number(job.applications) || 0;

  return (
    <Card size="sm" className="h-full gap-3">
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{job.title}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={job.status || 'draft'} showDot>
                {formatJobPostingStatus(job.status) || 'Draft'}
              </StatusBadge>
              <Badge variant="secondary">{formatStatus(job.type) || '—'}</Badge>
            </div>
          </div>
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <Briefcase className="size-4" />
          </div>
        </div>
        {job.keywords ? (
          <CardDescription className="line-clamp-2">
            <span className="font-medium">Keywords:</span> {job.keywords}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <DollarSign className="size-3.5" />
            {salaryLabel(job.salaryMin, job.salaryMax)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {job.vacancies ?? '—'} vacancies
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="size-3.5" />
            Exp: {job.experienceLabel || '—'}
          </span>
          <span className="text-primary bg-primary/10 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-semibold">
            <FileText className="size-3.5" aria-hidden />
            {apps} App{apps === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t pt-3">
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onManage(job)}>
              Edit Job
            </Button>
            <Button
              className="flex-1"
              render={<a href={`/dashboard/employer/applications?tab=jobs&jobId=${job.id}`} />}
              nativeButton={false}
            >
              Pipeline
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => onDetails(job)}>
              Details
            </Button>
            {job.status === 'published' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => onCampusSync(job.id)}
                title="Sync campuses"
              >
                <Users data-icon="inline-start" />
                Sync campuses
              </Button>
            ) : null}
          </div>
          {job.status === 'published' ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={closingJobId === job.id || withdrawingJobId === job.id}
                onClick={() => void onClosePosting(job)}
              >
                <Ban data-icon="inline-start" />
                {closingJobId === job.id ? 'Closing…' : 'Close'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive flex-1"
                disabled={withdrawingJobId === job.id || closingJobId === job.id}
                onClick={() => void onWithdrawPosting(job)}
                title="Withdraw job; students see applications under Withdrawn"
              >
                <Undo2 data-icon="inline-start" />
                {withdrawingJobId === job.id ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            </div>
          ) : null}
          <p className="text-muted-foreground m-0 text-center text-xs">
            Created {job.createdAt ? formatDate(job.createdAt) : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function JobDetailDialog({
  job,
  closingJobId,
  withdrawingJobId,
  onClose,
  onManage,
  onClosePosting,
  onWithdrawPosting,
}) {
  const workModeLabel =
    ALUMNI_WORK_MODES.find((o) => o.value === job.workMode)?.label || job.workMode || '—';
  const seniorityLabel =
    ALUMNI_SENIORITY_LEVELS.find((o) => o.value === job.seniorityLevel)?.label || job.seniorityLevel || '—';
  const educationLabel =
    ALUMNI_EDUCATION_LEVELS.find((o) => o.value === job.educationLevel)?.label || job.educationLevel || '—';

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="gap-4 sm:max-w-xl" showCloseButton>
        <DialogHeader className="gap-2 pr-8">
          <DialogTitle id="job-detail-title" className="text-xl font-semibold">
            {job.title}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status || 'draft'} showDot>
              {formatJobPostingStatus(job.status) || 'Draft'}
            </StatusBadge>
            <Badge variant="secondary">{formatStatus(job.type) || '—'}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailField label="Salary (annual CTC)">{salaryLabel(job.salaryMin, job.salaryMax)}</DetailField>
            <DetailField label="Experience">{job.experienceLabel || '—'}</DetailField>
            <DetailField label="Seniority">{seniorityLabel}</DetailField>
            <DetailField label="Work mode">{workModeLabel}</DetailField>
            <DetailField label="Location">{job.location || '—'}</DetailField>
            <DetailField label="Openings">{job.vacancies ?? '—'}</DetailField>
            <DetailField label="Education">{educationLabel}</DetailField>
            <DetailField label="Industry">{job.industry || '—'}</DetailField>
            <DetailField label="Posted">{job.createdAt ? formatDate(job.createdAt) : '—'}</DetailField>
          </div>
          {job.keywords ? <DetailField label="Key skills">{job.keywords}</DetailField> : null}
          {job.description ? (
            <DetailField label="Description">
              <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">{job.description}</p>
            </DetailField>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          {job.status === 'published' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={closingJobId === job.id || withdrawingJobId === job.id}
                onClick={() => void onClosePosting(job)}
              >
                {closingJobId === job.id ? 'Closing…' : 'Close posting'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={withdrawingJobId === job.id || closingJobId === job.id}
                onClick={() => void onWithdrawPosting(job)}
              >
                {withdrawingJobId === job.id ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            render={<Link href={`/dashboard/employer/applications?tab=jobs&jobId=${job.id}`} />}
            nativeButton={false}
          >
            View pipeline
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onManage(job)}>
            Edit Job
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
