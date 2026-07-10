'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatDate, formatStatus, getStatusColor, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import { Briefcase, Plus, DollarSign, Users, FileText, ArrowRight, X, Building2, AlignLeft, CheckCircle2, Ban, LayoutGrid, List, Undo2, GitBranch } from 'lucide-react';
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
import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load alumni jobs');
  return json;
};

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

export default function EmployerJobsPage() {
  const { addToast } = useToast();
  const { data: jobData, error: jobsError, mutate: mutateJobs } = useSWR('/api/employer/jobs?scope=alumni', fetcher, { revalidateOnFocus: true });
  const { data: campusData } = useSWR('/api/employer/campuses', fetcher, { revalidateOnFocus: true });
  const { data: profileData } = useSWR('/api/employer/profile', fetcher, { revalidateOnFocus: true });

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [savedDraftId, setSavedDraftId] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedTenantIds, setSelectedTenantIds] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [closingJobId, setClosingJobId] = useState(null);
  const [withdrawingJobId, setWithdrawingJobId] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  const jobsList = Array.isArray(jobData?.jobs) ? jobData.jobs : [];
  const approvedCampuses = useEmployerPostingCampuses(campusData, 'alumni_jobs');

  const filtered = jobsList.filter((j) => !filter || j.status === filter);

  const tabCounts = useMemo(
    () => ({
      all: jobsList.length,
      published: jobsList.filter((j) => j.status === 'published').length,
      draft: jobsList.filter((j) => j.status === 'draft').length,
      closed: jobsList.filter((j) => j.status === 'closed').length,
      withdrawn: jobsList.filter((j) => j.status === 'cancelled').length,
    }),
    [jobsList],
  );

  const profileHeadquarters = profileData?.profile?.headquarters;

  useEffect(() => {
    if (!showModal) return;
    setForm((prev) => {
      const location = prev.location?.trim() ? prev.location : (profileHeadquarters || '');
      return {
        ...prev,
        location,
        description: buildAlumniJobDescription({ ...prev, location }),
      };
    });
  }, [
    showModal,
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

  const openCreate = () => {
    setModalMode('create');
    setSavedDraftId(null);
    setEditingJob(null);
    setForm({ ...emptyForm, type: 'full_time' });
    setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses));
    setShowModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleEdit = (job) => {
    setModalMode('edit');
    setSavedDraftId(null);
    setEditingJob(job);
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
    setShowModal(true);
    document.body.style.overflow = 'hidden';
  };

  const resetTenantSelection = useCallback(() => {
    setSelectedTenantIds(buildDefaultTenantSelection(approvedCampuses));
  }, [approvedCampuses]);

  const closeModal = () => {
    setShowModal(false);
    setModalMode('create');
    setSavedDraftId(null);
    setEditingJob(null);
    setForm({ ...emptyForm });
    resetTenantSelection();
    document.body.style.overflow = '';
  };

  const setField = useCallback((key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const submitJob = async (asDraft) => {
    const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, form.title, { label: 'Job title' });
    if (titleErr) {
      addToast(titleErr, 'error');
      return;
    }
    const tenantIds = Object.entries(selectedTenantIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!asDraft && !tenantIds.length) {
      addToast('Select at least one approved campus so notifications are created for that college.', 'warning');
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
      const jobId = modalMode === 'edit' ? editingJob?.id : savedDraftId;
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
      if (asDraft && modalMode === 'create' && savedId) {
        setSavedDraftId(savedId);
        addToast('Draft saved. Select campuses and click Publish when ready.', 'success');
        mutateJobs();
        return;
      }
      addToast(
        modalMode === 'edit'
          ? 'Job updated successfully.'
          : asDraft
            ? 'Draft saved to the database (no alerts sent).'
            : 'Alumni job published. College admins were notified for each selected campus.',
        'success',
      );
      closeModal();
      mutateJobs();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closePublishedJob = async (job) => {
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
      mutateJobs();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setClosingJobId(null);
    }
  };

  const withdrawPublishedJob = async (job) => {
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
      mutateJobs();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setWithdrawingJobId(null);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* High-Fidelity Glassmorphic Hero Banner */}
      <div 
        style={{
          position: 'relative',
          background: 'var(--banner-gradient)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          color: 'white',
          overflow: 'hidden',
          marginBottom: '2.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        {/* Decorative Elements */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Alumni Job Postings
            {jobsList.length > 0 && (
              <span style={{ fontSize: '0.875rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '999px', backdropFilter: 'blur(4px)' }}>
                {jobsList.length} Total
              </span>
            )}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
            Post lateral roles for alumni — experienced hire openings shared with your campus network.
          </p>
        </div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button className="btn banner-cta-solid" type="button" onClick={openCreate} style={{ fontSize: '1.05rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Create Job
          </button>
        </div>
      </div>

      {jobsError && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-danger-border, #fecaca)',
            background: 'var(--color-danger-bg, #fef2f2)',
            color: 'var(--color-danger-text, #991b1b)',
          }}
        >
          Could not load alumni jobs: {jobsError.message}. If this persists on production, run database migration{' '}
          <code>npm run db:migrate:075</code> and refresh.
        </div>
      )}

      {/* Filter Tabs + View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { id: '', label: 'All Alumni Jobs', count: tabCounts.all },
            { id: 'published', label: 'Published', count: tabCounts.published },
            { id: 'draft', label: 'Drafts', count: tabCounts.draft },
            { id: 'closed', label: 'Closed', count: tabCounts.closed },
            { id: 'cancelled', label: 'Withdrawn', count: tabCounts.withdrawn },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                background: filter === t.id ? 'var(--primary-600)' : 'var(--bg-secondary)',
                color: filter === t.id ? 'white' : 'var(--text-secondary)',
                boxShadow: filter === t.id ? '0 4px 10px rgba(79, 70, 229, 0.2)' : 'none',
              }}
            >
              {formatFilterBadgeLabelParen(t.label, t.count)}
            </button>
          ))}
        </div>
        {/* View Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '3px', gap: '2px', border: '1px solid var(--border-default)' }}>
          {[{ mode: 'card', icon: LayoutGrid, label: 'Card view' }, { mode: 'list', icon: List, label: 'List view' }].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              title={label}
              aria-label={label}
              onClick={() => setViewMode(mode)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.85rem', borderRadius: '7px', border: 'none',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                transition: 'all 0.15s ease',
                background: viewMode === mode ? 'var(--bg-primary)' : 'transparent',
                color: viewMode === mode ? 'var(--primary-600)' : 'var(--text-tertiary)',
                boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={15} />
              <span style={{ display: 'none' }}>{label}</span>
              {mode === 'card' ? 'Cards' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Card View ── */}
      {viewMode === 'card' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filtered.map((job) => (
            <div key={job.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', height: '100%', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>{job.title}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className={`badge badge-${getStatusColor(job.status)}`} style={{ padding: '0.2rem 0.5rem' }}>{formatJobPostingStatus(job.status)}</span>
                    <span className="badge badge-gray" style={{ padding: '0.2rem 0.5rem' }}>{formatStatus(job.type)}</span>
                  </div>
                </div>
                <div style={{ background: 'var(--primary-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                  <Briefcase size={20} className="text-primary-600" />
                </div>
              </div>
              {job.keywords ? (
                <p className="text-xs" style={{ margin: '0 0 1rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <span className="font-semibold text-tertiary">Keywords:</span> {job.keywords}
                </p>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', padding: '1rem 0', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <DollarSign size={14} style={{ color: 'var(--text-tertiary)' }} />
                    {job.salaryMin != null && job.salaryMax != null ? `${formatCurrency(job.salaryMin)} – ${formatCurrency(job.salaryMax)}` : 'Salary TBD'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Users size={14} style={{ color: 'var(--text-tertiary)' }} />
                    {job.vacancies} vacancies
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Briefcase size={14} style={{ color: 'var(--text-tertiary)' }} />
                    Exp: {job.experienceLabel || '—'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--primary-700)', fontWeight: 600, background: 'var(--primary-50)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
                    <FileText size={14} />
                    {job.applications} Apps
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleEdit(job); }}>Edit Job</button>
                  <a className="btn btn-primary" href={`/dashboard/employer/applications?tab=jobs&jobId=${job.id}`} style={{ flex: 1, padding: '0.6rem', textAlign: 'center' }}>View Pipeline</a>
                </div>
                {job.status === 'published' && (
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }} disabled={closingJobId === job.id || withdrawingJobId === job.id} onClick={(e) => { e.stopPropagation(); void closePublishedJob(job); }}>
                      <Ban size={16} aria-hidden />{closingJobId === job.id ? 'Closing…' : 'Close'}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--danger-600)' }} disabled={withdrawingJobId === job.id || closingJobId === job.id} onClick={(e) => { e.stopPropagation(); void withdrawPublishedJob(job); }} title="Withdraw job; students see applications under Withdrawn">
                      <Undo2 size={16} aria-hidden />{withdrawingJobId === job.id ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-tertiary" style={{ textAlign: 'center', marginTop: '1rem' }}>Created {job.createdAt ? formatDate(job.createdAt) : '—'}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-default)' }}>
              <Briefcase size={48} className="text-tertiary" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No alumni jobs yet</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Create your first lateral role for alumni. Internships and campus programs are managed on their own pages.</p>
            </div>
          )}
        </div>
      )}

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 1.1fr 0.6fr 0.6fr 0.5fr auto', gap: '0', background: 'var(--bg-secondary)', padding: '0.65rem 1.25rem', borderBottom: '1px solid var(--border-default)' }}>
            {['Job Title', 'Type', 'Status', 'Salary', 'Experience', 'Location', 'Apps', 'Actions'].map((h) => (
              <span key={h} style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{h}</span>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <Briefcase size={40} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block', color: 'var(--text-tertiary)' }} />
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No alumni jobs match this filter.</p>
            </div>
          )}

          {filtered.map((job, idx) => (
            <div
              key={job.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.7fr 0.7fr 1.1fr 0.6fr 0.6fr 0.5fr auto',
                gap: '0',
                alignItems: 'center',
                padding: '0.9rem 1.25rem',
                borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-default)' : 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Title + keywords */}
              <div style={{ minWidth: 0, paddingRight: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                {job.keywords && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.keywords}</div>
                )}
              </div>

              {/* Type */}
              <span className="badge badge-gray" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{formatStatus(job.type)}</span>

              {/* Status */}
              <span className={`badge badge-${getStatusColor(job.status)}`} style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{formatJobPostingStatus(job.status)}</span>

              {/* Salary */}
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {job.salaryMin != null && job.salaryMax != null ? `${formatCurrency(job.salaryMin)} – ${formatCurrency(job.salaryMax)}` : '—'}
              </span>

              {/* Experience */}
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {job.experienceLabel || '—'}
              </span>

              {/* Location */}
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {job.location || '—'}
              </span>

              {/* Apps */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-700)', background: 'var(--primary-50)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap' }}>
                <FileText size={12} />{job.applications}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: '0.75rem' }}>
                <StandardTableIconAction action="edit" onClick={(e) => { e.stopPropagation(); handleEdit(job); }} />
                <Link
                  href={`/dashboard/employer/applications?tab=jobs&jobId=${job.id}`}
                  className="btn btn-primary btn-icon btn-sm"
                  title="View pipeline"
                  aria-label="View pipeline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GitBranch size={16} strokeWidth={2} aria-hidden />
                </Link>
                {job.status === 'published' && (
                  <>
                    <button
                      type="button"
                      title="Close posting"
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.5rem', color: 'var(--text-tertiary)' }}
                      disabled={closingJobId === job.id || withdrawingJobId === job.id}
                      onClick={(e) => { e.stopPropagation(); void closePublishedJob(job); }}
                    >
                      <Ban size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Withdraw posting"
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.5rem', color: 'var(--danger-600)' }}
                      disabled={withdrawingJobId === job.id || closingJobId === job.id}
                      onClick={(e) => { e.stopPropagation(); void withdrawPublishedJob(job); }}
                    >
                      <Undo2 size={15} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* High-Fidelity Job Creation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }} onClick={closeModal} />
          
          <div className="animate-slideUp" style={{ position: 'relative', width: '100%', maxWidth: '1200px', maxHeight: '90vh', background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-100)', color: 'var(--primary-700)', borderRadius: 'var(--radius-md)' }}>
                  <Briefcase size={20} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {modalMode === 'edit' ? 'Edit Job Posting' : 'Create New Job Posting'}
                </h2>
                {modalMode === 'create' && savedDraftId ? (
                  <span className="badge badge-warning badge-dot" style={{ marginLeft: '0.25rem' }}>
                    Draft saved
                  </span>
                ) : null}
              </div>
              <button onClick={closeModal} className="btn btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                <X size={24} className="text-secondary" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              {/* Form Fields Section */}
              <div style={{ flex: '1 1 500px', padding: '2rem', borderRight: '1px solid var(--border-default)' }}>
                <div className="grid grid-2" style={{ gap: '1.5rem' }}>
                  
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <EmployerCampusTargetPicker
                      campuses={approvedCampuses}
                      selection={selectedTenantIds}
                      onSelectionChange={setSelectedTenantIds}
                      label={(
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                          <Building2 size={16} className="text-primary-600" aria-hidden />
                          Target campuses
                        </span>
                      )}
                      required
                      hint="Campuses will receive notifications when this job is published."
                      emptyMessage="No approved campuses yet. Request access from the campus directory first."
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label font-bold">Job Title <span className="required">*</span></label>
                    <input className="form-input" placeholder="e.g. Software Development Engineer" value={form.title} onChange={(e) => setField('title', e.target.value)} style={{ fontSize: '1.1rem', padding: '0.75rem' }} />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label font-bold">Key skills</label>
                    <input className="form-input" placeholder="e.g. Java, AWS, stakeholder management, system design" value={form.keywords} onChange={(e) => setField('keywords', e.target.value)} />
                    <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>Comma-separated skills (like Naukri / Monster key skills).</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Employment type <span className="required">*</span></label>
                    <select className="form-select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                      {Object.entries(ALUMNI_EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Seniority band</label>
                    <select className="form-select" value={form.seniorityLevel} onChange={(e) => setField('seniorityLevel', e.target.value)}>
                      {ALUMNI_SENIORITY_LEVELS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Min experience (years)</label>
                    <ValidatedNumberInput
                      fieldId={FIELD_IDS.EMPLOYER_MIN_EXPERIENCE}
                      placeholder="2"
                      value={form.minExperience}
                      onChange={(v) => setField('minExperience', v)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Max experience (years)</label>
                    <ValidatedNumberInput
                      fieldId={FIELD_IDS.EMPLOYER_MAX_EXPERIENCE}
                      context={{ minExperience: form.minExperience }}
                      placeholder="8"
                      value={form.maxExperience}
                      onChange={(v) => setField('maxExperience', v)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Work mode</label>
                    <select className="form-select" value={form.workMode} onChange={(e) => setField('workMode', e.target.value)}>
                      {ALUMNI_WORK_MODES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Job location</label>
                    <input className="form-input" placeholder="e.g. Bengaluru, Chennai" value={form.location} onChange={(e) => setField('location', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Industry / function</label>
                    <input className="form-input" placeholder="e.g. IT Services, Product Engineering" value={form.industry} onChange={(e) => setField('industry', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Education</label>
                    <select className="form-select" value={form.educationLevel} onChange={(e) => setField('educationLevel', e.target.value)}>
                      {ALUMNI_EDUCATION_LEVELS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Notice period (days)</label>
                    <ValidatedNumberInput
                      fieldId={FIELD_IDS.EMPLOYER_NOTICE_PERIOD}
                      placeholder="30"
                      value={form.noticePeriodDays}
                      onChange={(v) => setField('noticePeriodDays', v)}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label font-bold">Min salary (annual CTC)</label>
                    <CurrencyAmountInput
                      fieldId={FIELD_IDS.EMPLOYER_SALARY_MIN}
                      placeholder="800000"
                      value={form.salaryMin}
                      onChange={(v) => setField('salaryMin', v)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Max salary (annual CTC)</label>
                    <CurrencyAmountInput
                      fieldId={FIELD_IDS.EMPLOYER_SALARY_MAX}
                      context={{ salaryMin: form.salaryMin }}
                      placeholder="1500000"
                      value={form.salaryMax}
                      onChange={(v) => setField('salaryMax', v)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Openings</label>
                    <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_VACANCIES} placeholder="10" value={form.vacancies} onChange={(v) => setField('vacancies', v)} />
                  </div>
                </div>
              </div>

              {/* Preview & Editor Section */}
              <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <AlignLeft size={18} className="text-secondary" /> Job Description Preview
                  </h3>
                  <p className="text-xs text-secondary" style={{ margin: '0.25rem 0 0' }}>
                    Auto-generated from fields. Edit below to refine.
                  </p>
                </div>
                
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <textarea
                    className="form-textarea"
                    style={{ flex: 1, minHeight: '400px', fontSize: '0.95rem', lineHeight: 1.6, padding: '1.25rem', fontFamily: 'var(--font-mono, monospace)', background: 'var(--bg-primary)' }}
                    placeholder="Description is generated from the fields…"
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-primary)' }}>
              <button className="btn btn-ghost" type="button" disabled={submitting} onClick={closeModal} style={{ fontWeight: 600 }}>
                Cancel
              </button>
              <button className="btn btn-secondary" type="button" disabled={submitting} onClick={() => submitJob(true)} style={{ fontWeight: 600 }}>
                Save as Draft
              </button>
              <button className="btn btn-primary" type="button" disabled={submitting} onClick={() => submitJob(false)} style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} />
                {modalMode === 'edit' && editingJob?.status === 'published'
                  ? 'Update Published Job'
                  : submitting
                    ? 'Publishing…'
                    : 'Publish Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
