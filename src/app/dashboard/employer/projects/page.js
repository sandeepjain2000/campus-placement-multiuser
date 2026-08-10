'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import PageLoading from '@/components/PageLoading';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import { FolderGit2, Plus, Users, IndianRupee, Activity } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { buildDefaultTenantSelection } from '@/lib/defaultTestCampus';
import { formatEmployerMinCgpa } from '@/lib/employerJobDisplay';
import { validateAndResolveEmployerJobSubmit } from '@/lib/employerJobSubmitValidation';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';
import { useEmployerPostingCampuses } from '@/hooks/useEmployerPostingCampuses';
import EmployerListFormLayout from '@/components/employer/EmployerListFormLayout';
import EmployerCampusSyncDialog from '@/components/employer/EmployerCampusSyncDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Textarea } from '@/components/ui/textarea';

const SELECT_CN =
  'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

function projectPrizeLabel(min, max) {
  if (min == null && max == null) return '—';
  if (min != null && max != null && Number(min) !== Number(max)) {
    return `${formatCurrency(Number(min))} – ${formatCurrency(Number(max))}`;
  }
  return formatCurrency(Number(min ?? max));
}

async function swrFetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function EmployerProjectsPage() {
  const { addToast } = useToast();
  const jobsApiPath = '/api/employer/jobs?scope=programs';
  const { data: campusData } = useSWR('/api/employer/campuses', swrFetcher, { revalidateOnFocus: true });
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
  const [submitting, setSubmitting] = useState(false);
  const [projectKind, setProjectKind] = useState('short_project');
  const [title, setTitle] = useState('');
  const [stipend, setStipend] = useState('');
  const [stipendMax, setStipendMax] = useState('');
  const [vacancies, setVacancies] = useState('4');
  const [minCgpa, setMinCgpa] = useState('');
  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTenantIds, setSelectedTenantIds] = useState({});
  const [campusSyncJobId, setCampusSyncJobId] = useState(null);
  const [campusSyncSelection, setCampusSyncSelection] = useState({});
  const [campusSyncSubmitting, setCampusSyncSubmitting] = useState(false);
  const [formTab, setFormTab] = useState('basics');
  const [detailProject, setDetailProject] = useState(null);

  const approvedCampuses = useEmployerPostingCampuses(campusData, 'projects');

  const projects = useMemo(() => {
    const jobs = Array.isArray(jobData?.jobs) ? jobData.jobs : [];
    return jobs.filter((j) => j.type === 'short_project' || j.type === 'hackathon');
  }, [jobData]);

  const projectStatusFilterOptions = useMemo(
    () => [
      FILTER_ALL,
      { value: 'published', label: 'Published' },
      { value: 'draft', label: 'Draft' },
      { value: 'closed', label: 'Closed' },
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
    filtered: displayProjects,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(projects, {
    getSearchText: (p) => [p.title, p.keywords, p.type, p.status].filter(Boolean).join(' '),
    filterFn: (row, f) => !f || String(row.status || '') === f,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const closeForm = useCallback(() => {
    setShowForm(false);
    setFormTab('basics');
  }, []);

  const openForm = () => {
    setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses));
    setProjectKind('short_project');
    setTitle('');
    setStipend('');
    setStipendMax('');
    setVacancies('4');
    setMinCgpa('');
    setKeywords('');
    setNotes('');
    setFormTab('basics');
    setShowForm(true);
  };

  const stats = useMemo(() => {
    const published = projects.filter((j) => j.status === 'published');
    return {
      count: projects.length,
      published: published.length,
    };
  }, [projects]);

  const publishProject = useCallback(async () => {
    const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, title, { label: 'Project title' });
    if (titleErr) {
      addToast(titleErr, 'error');
      setFormTab('basics');
      return;
    }
    const tenantIds = Object.entries(selectedTenantIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!tenantIds.length) {
      addToast('Select at least one approved campus.', 'warning');
      setFormTab('details');
      return;
    }
    const validated = validateAndResolveEmployerJobSubmit({
      salaryMin: stipend,
      salaryMax: stipendMax,
      minCgpa,
      vacancies,
      jobType: projectKind,
    });
    if (validated.error) {
      addToast(validated.error, 'warning');
      return;
    }
    const sm = stipend === '' ? null : Number(stipend);
    const sx = stipendMax === '' ? null : Number(stipendMax);

    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: notes.trim() || '',
          jobType: projectKind,
          status: 'published',
          salaryMin: sm,
          salaryMax: sx != null && !Number.isNaN(sx) ? sx : sm,
          minCgpa: validated.minCgpa,
          vacancies: vacancies === '' ? 1 : vacancies,
          keywords,
          tenantIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json.error || 'Could not publish', 'error');
        return;
      }
      addToast('Project published. Students at selected campuses can apply.', 'success');
      closeForm();
      await mutateJobs();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    notes,
    projectKind,
    selectedTenantIds,
    stipend,
    stipendMax,
    minCgpa,
    vacancies,
    keywords,
    addToast,
    mutateJobs,
    closeForm,
  ]);

  const campusSyncProject = useMemo(
    () => projects.find((j) => j.id === campusSyncJobId) ?? null,
    [projects, campusSyncJobId],
  );

  const openCampusSync = useCallback(
    (jobId) => {
      if (!approvedCampuses.length) {
        addToast('No approved campuses yet. Ask a college to approve your tie-up first.', 'warning');
        return;
      }
      const job = projects.find((j) => j.id === jobId);
      setDetailProject(null);
      setCampusSyncSelection(buildDefaultTenantSelection(approvedCampuses, job?.tenantIds));
      setCampusSyncJobId(jobId);
    },
    [approvedCampuses, projects, addToast],
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
          ? `Campus visibility updated (${json.inserted} new). Students can refresh.`
          : json.skippedNotApproved > 0
            ? 'No new visibility rows (check tie-ups are approved).'
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

  if (showForm) {
    return (
      <EmployerListFormLayout
        title="Post New Project"
        subtitle="Publish a short project or hackathon to approved campuses."
        onBack={closeForm}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" disabled={submitting} onClick={closeForm}>
              Cancel
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void publishProject()}>
              {submitting ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        }
      >
        <Tabs value={formTab} onValueChange={setFormTab} className="w-full gap-4">
          <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {[
              { id: 'basics', title: 'Basics', sub: 'Type, title, reward' },
              { id: 'details', title: 'Details', sub: 'Campuses, skills, brief' },
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
              <Field className="gap-2">
                <FieldLabel>Project type</FieldLabel>
                <AdminFilterSelect
                  className={SELECT_CN}
                  value={projectKind}
                  emptyMapsToAll={false}
                  onValueChange={setProjectKind}
                  aria-label="Project type"
                  items={[
                    { label: 'Short project', value: 'short_project' },
                    { label: 'Hackathon', value: 'hackathon' },
                  ]}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>
                  Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 48h GenAI sprint"
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Prize / stipend min (INR, optional)</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_STIPEND_MIN}
                  value={stipend}
                  onChange={setStipend}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Prize / stipend max (optional)</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_STIPEND_MAX}
                  context={{ salaryMin: stipend }}
                  value={stipendMax}
                  onChange={setStipendMax}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Team slots / openings</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_VACANCIES}
                  value={vacancies}
                  onChange={setVacancies}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Min CGPA</FieldLabel>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.EMPLOYER_MIN_CGPA}
                  step="0.1"
                  value={minCgpa}
                  onChange={setMinCgpa}
                />
              </Field>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="details" className="mt-2 outline-none">
            <FieldGroup className="grid grid-cols-1 gap-4">
              <Field className="gap-2">
                <EmployerCampusTargetPicker
                  campuses={approvedCampuses}
                  selection={selectedTenantIds}
                  onSelectionChange={setSelectedTenantIds}
                  label="Target campuses (approved)"
                  required
                  hint="Students at the selected approved campuses will be able to view and apply."
                  emptyMessage="No approved campuses. Complete a campus tie-up first."
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Skills</FieldLabel>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="React, Python…"
                />
                <FieldDescription>Enter comma-separated skills.</FieldDescription>
              </Field>
              <Field className="gap-2">
                <FieldLabel>Description / brief</FieldLabel>
                <Textarea
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the project scope, expected outcomes, and participation details."
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
            <FolderGit2 className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Projects & Hackathons
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Publish short projects and hackathons to students at approved campuses.
          </p>
        </div>
        <Button type="button" onClick={openForm}>
          <Plus data-icon="inline-start" />
          Post Project
        </Button>
      </div>

      {jobsError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load projects</AlertTitle>
          <AlertDescription>{jobsError.message}. Check your connection and try again.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" strokeWidth={1.5} />
              Published projects
            </CardDescription>
            <CardTitle className="text-2xl">{stats.published}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <IndianRupee className="size-4" strokeWidth={1.5} />
              All project records
            </CardDescription>
            <CardTitle className="text-2xl">{stats.count}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="gap-2">
          <CardHeader className="gap-1 px-4">
            <CardDescription className="flex items-center gap-2">
              <Activity className="size-4" strokeWidth={1.5} />
              Approved campuses
            </CardDescription>
            <CardTitle className="text-2xl">{approvedCampuses.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {jobsLoading ? <PageLoading message="Loading projects…" variant="skeleton-list" inline /> : null}

      {!jobsLoading && !jobsError && projects.length === 0 ? (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
              <FolderGit2 className="size-7" />
            </div>
            <CardTitle className="mb-1 text-lg">No project postings yet</CardTitle>
            <CardDescription>Post a project or hackathon to start receiving applications.</CardDescription>
          </CardContent>
        </Card>
      ) : null}

      {!jobsLoading && !jobsError && totalCount > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div>
              <CardTitle className="text-base">Your project postings</CardTitle>
              <CardDescription>
                Showing {filteredCount} of {totalCount}
              </CardDescription>
            </div>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, skills, or type…"
              filter={filter}
              onFilterChange={setFilter}
              filterOptions={projectStatusFilterOptions}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Prize / stipend</TableHead>
                  <TableHead>Min CGPA</TableHead>
                  <TableHead>Openings</TableHead>
                  <TableHead className="min-w-[6.5rem]">Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                      No projects match your search or filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {displayProjects.map((p) => (
                  <TableRow key={String(p.id)}>
                    <TableCell className="max-w-[17rem]">
                      <div className="font-medium">{p.title || 'Untitled project'}</div>
                      {p.keywords ? (
                        <div className="text-muted-foreground mt-0.5 truncate text-xs">{p.keywords}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.type === 'hackathon' ? 'Hackathon' : 'Short project'}</Badge>
                    </TableCell>
                    <TableCell>{projectPrizeLabel(p.salaryMin, p.salaryMax)}</TableCell>
                    <TableCell>{formatEmployerMinCgpa(p.minCgpa ?? p.cgpa)}</TableCell>
                    <TableCell>{p.vacancies ?? '—'}</TableCell>
                    <TableCell className="min-w-[6.5rem]">
                      <StatusBadge status={p.status || 'draft'} showDot>
                        {formatStatus(p.status) || 'Draft'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.createdAt ? formatDate(p.createdAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        {p.status === 'published' ? (
                          <StandardTableIconAction
                            action="sync"
                            variant="ghost"
                            showLabel={false}
                            disabled={campusSyncSubmitting && campusSyncJobId === p.id}
                            tooltip={
                              campusSyncSubmitting && campusSyncJobId === p.id
                                ? 'Syncing campuses…'
                                : undefined
                            }
                            onClick={() => openCampusSync(p.id)}
                          />
                        ) : null}
                        <StandardTableIconAction
                          action="details"
                          variant="ghost"
                          showLabel={false}
                          onClick={() => setDetailProject(p)}
                        />
                        <StandardTableIconAction
                          action="manage"
                          variant="ghost"
                          showLabel={false}
                          onClick={() => addToast('Editing via API can be added later.', 'info')}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-muted-foreground m-0 text-sm">
        {projects.length} project posting{projects.length === 1 ? '' : 's'} from your company
      </p>

      {detailProject ? (
        <ProjectDetailDialog
          project={detailProject}
          onClose={() => setDetailProject(null)}
          onManage={() => addToast('Editing via API can be added later.', 'info')}
        />
      ) : null}

      <EmployerCampusSyncDialog
        open={Boolean(campusSyncJobId)}
        jobTitle={campusSyncProject?.title}
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

function ProjectDetailDialog({ project, onClose, onManage }) {
  const typeLabel = project.type === 'hackathon' ? 'Hackathon' : 'Short project';

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="gap-4 sm:max-w-xl" showCloseButton>
        <DialogHeader className="gap-2 pr-8">
          <DialogTitle id="project-detail-title" className="text-xl font-semibold">
            {project.title || 'Untitled project'}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status || 'draft'} showDot>
              {formatStatus(project.status) || 'Draft'}
            </StatusBadge>
            <Badge variant="secondary">{typeLabel}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ProjectDetailField label="Prize / stipend">
              {projectPrizeLabel(project.salaryMin, project.salaryMax)}
            </ProjectDetailField>
            <ProjectDetailField label="Min CGPA">
              {formatEmployerMinCgpa(project.minCgpa ?? project.cgpa)}
            </ProjectDetailField>
            <ProjectDetailField label="Openings">{project.vacancies ?? '—'}</ProjectDetailField>
            <ProjectDetailField label="Posted">
              {project.createdAt ? formatDate(project.createdAt) : '—'}
            </ProjectDetailField>
            <ProjectDetailField label="Campuses">
              {Array.isArray(project.tenantIds) && project.tenantIds.length > 0
                ? project.tenantIds.length
                : '—'}
            </ProjectDetailField>
          </div>
          {project.keywords ? <ProjectDetailField label="Skills">{project.keywords}</ProjectDetailField> : null}
          {project.description ? (
            <ProjectDetailField label="Description">
              <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">{project.description}</p>
            </ProjectDetailField>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="button" size="sm" onClick={onManage}>
            Manage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}
