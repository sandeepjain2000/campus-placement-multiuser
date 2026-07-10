'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import PageLoading from '@/components/PageLoading';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import { FolderGit2, Plus, Users, IndianRupee, Activity, FileText, Settings } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
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
      return;
    }
    const tenantIds = Object.entries(selectedTenantIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!tenantIds.length) {
      addToast('Select at least one approved campus.', 'warning');
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" disabled={submitting} onClick={closeForm}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={publishProject}>
              {submitting ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        }
      >
        <div className="grid grid-2">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <EmployerCampusTargetPicker
              campuses={approvedCampuses}
              selection={selectedTenantIds}
              onSelectionChange={setSelectedTenantIds}
              label="Target campuses (approved)"
              required
              emptyMessage="No approved campuses. Complete a campus tie-up first."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={projectKind} onChange={(e) => setProjectKind(e.target.value)}>
              <option value="short_project">Short project</option>
              <option value="hackathon">Hackathon</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Title <span className="required">*</span></label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., 48h GenAI sprint" />
          </div>
          <div className="form-group">
            <label className="form-label">Prize / stipend min (INR, optional)</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_STIPEND_MIN} value={stipend} onChange={setStipend} />
          </div>
          <div className="form-group">
            <label className="form-label">Max (optional)</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_STIPEND_MAX} context={{ salaryMin: stipend }} value={stipendMax} onChange={setStipendMax} />
          </div>
          <div className="form-group">
            <label className="form-label">Team slots / openings</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_VACANCIES} value={vacancies} onChange={setVacancies} />
          </div>
          <div className="form-group">
            <label className="form-label">Min CGPA</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_MIN_CGPA} step="0.1" value={minCgpa} onChange={setMinCgpa} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Skills (comma-separated)</label>
            <input className="form-input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="React, Python…" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description / brief</label>
            <textarea className="form-textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
            <FolderGit2 size={28} className="text-secondary" strokeWidth={1.5} /> Projects
          </h1>
          <p className="text-secondary">
            Post short projects and hackathons as <span className="font-mono text-xs">job_postings</span>. Select campuses so only
            those students see listings.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openForm}>
            <Plus size={16} /> Post project
          </button>
        </div>
      </div>

      {jobsError && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            Could not load projects: {jobsError.message}
          </p>
        </div>
      )}

      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <div className="stats-card">
          <div className="stats-card-icon indigo">
            <Users size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.published}</div>
          <div className="stats-card-label">Published</div>
        </div>
        <div className="stats-card green">
          <div className="stats-card-icon green">
            <IndianRupee size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.count}</div>
          <div className="stats-card-label">All records</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-card-icon amber">
            <Activity size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{approvedCampuses.length}</div>
          <div className="stats-card-label">Approved campuses</div>
        </div>
      </div>

      {jobsLoading && <PageLoading message="Loading projects…" variant="skeleton-list" inline />}
      {!jobsLoading && !jobsError && projects.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px dashed var(--border-default)' }}>
          <FolderGit2 size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 1rem', opacity: 0.35 }} />
          <p className="text-sm text-secondary" style={{ margin: 0 }}>No project postings yet. Use Post project to publish one.</p>
        </div>
      )}
      {!jobsLoading && !jobsError && totalCount > 0 && (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search title or type…"
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
      )}
      {!jobsLoading && !jobsError && totalCount > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 880 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ paddingLeft: '1.25rem' }}>Title</th>
                  <th>Type</th>
                  <th>Prize / stipend</th>
                  <th>Min CGPA</th>
                  <th>Openings</th>
                  <th>Status</th>
                  <th>Posted</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.25rem', width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-secondary">
                      No projects match your search or filters.
                    </td>
                  </tr>
                ) : null}
                {displayProjects.map((p) => (
                  <tr key={String(p.id)}>
                    <td style={{ paddingLeft: '1.25rem', maxWidth: 280 }}>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.title}</div>
                      {p.keywords ? (
                        <div className="text-xs text-tertiary" style={{ marginTop: '0.2rem' }}>{p.keywords}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="badge badge-gray">{p.type === 'hackathon' ? 'Hackathon' : 'Short project'}</span>
                    </td>
                    <td className="text-sm">{projectPrizeLabel(p.salaryMin, p.salaryMax)}</td>
                    <td className="text-sm">{formatEmployerMinCgpa(p.minCgpa ?? p.cgpa)}</td>
                    <td className="text-sm">{p.vacancies ?? '—'}</td>
                    <td>
                      <span className={`badge badge-${getStatusColor(p.status)} badge-dot`}>{formatStatus(p.status)}</span>
                    </td>
                    <td className="text-sm text-secondary">{p.createdAt ? formatDate(p.createdAt) : '—'}</td>
                    <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
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
                          onClick={() => addToast(p.title, 'info')}
                        />
                        <StandardTableIconAction
                          action="manage"
                          variant="ghost"
                          showLabel={false}
                          onClick={() => addToast('Editing via API can be added later.', 'info')}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
