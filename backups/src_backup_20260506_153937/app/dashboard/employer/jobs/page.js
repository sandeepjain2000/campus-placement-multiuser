'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { formatDate, formatStatus, getStatusColor, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

const fetcher = (url) => fetch(url).then((r) => r.json());

const TYPE_LABELS = {
  full_time: 'Full-time',
  internship: 'Internship',
  contract: 'Contract',
  ppo: 'PPO',
};

function buildAutoSections({ title, keywords, type, salaryMin, salaryMax, cgpa, vacancies, headquarters }) {
  const kw = keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const typeLabel = TYPE_LABELS[type] || type;
  const role =
    title.trim().length > 0
      ? `We are hiring a ${title} (${typeLabel}) to own delivery across discovery, implementation, code review, testing, and production support. You will collaborate with product, design, and platform teams to ship reliable user-facing experiences.`
      : 'Enter a job title to generate a role summary.';

  const qualifications =
    cgpa != null && String(cgpa).length
      ? `B.Tech / M.Tech / dual degree (or equivalent) in relevant disciplines; minimum CGPA ${cgpa} on a 10-point scale unless waived by campus policy. Strong problem-solving, communication, and teamwork.`
      : 'B.Tech / M.Tech / dual degree (or equivalent) in relevant disciplines; strong academic record and campus placement eligibility.';

  const skills =
    kw.length > 0
      ? `Core skills we expect: ${kw.join(', ')}. Demonstrable projects, internships, or open-source contributions in these areas are a plus.`
      : 'Add comma-separated keywords above to auto-fill expected skills (e.g. React, Python, SQL).';

  const sm = salaryMin === '' || salaryMin == null ? null : Number(salaryMin);
  const sx = salaryMax === '' || salaryMax == null ? null : Number(salaryMax);
  const compensation =
    sm != null && !Number.isNaN(sm) && sx != null && !Number.isNaN(sx)
      ? `Compensation band: ${formatCurrency(sm)} – ${formatCurrency(sx)} CTC per annum (structure and components per company policy and campus norms). ${vacancies ? `Open headcount: ${vacancies}.` : ''}`
      : 'Set min/max annual compensation (and vacancies) to auto-fill this section.';

  const hq = headquarters != null ? String(headquarters).trim() : '';
  const location = hq
    ? `Location: anchored at ${hq}. Hybrid, office, or remote arrangements follow company policy and are confirmed during hiring.`
    : type === 'internship'
      ? 'Location: add your company headquarters under Employer Profile to auto-fill this line, or edit manually (internship base / hybrid details).'
      : 'Location: add your company headquarters under Employer Profile to auto-fill this line, or edit manually to match where this role is based.';

  return { role, qualifications, skills, compensation, location };
}

function composeJobDescription(sections) {
  return [
    '— Job description (auto-generated from title, keywords, and compensation; edit freely) —',
    '',
    'ROLE',
    sections.role,
    '',
    'QUALIFICATIONS',
    sections.qualifications,
    '',
    'SKILLS',
    sections.skills,
    '',
    'COMPENSATION',
    sections.compensation,
    '',
    'LOCATION',
    sections.location,
  ].join('\n');
}

const emptyForm = {
  title: '',
  keywords: '',
  type: 'full_time',
  salaryMin: '',
  salaryMax: '',
  cgpa: '',
  vacancies: '',
  placementDriveId: '',
  description: '',
};

export default function EmployerJobsPage() {
  const { addToast } = useToast();
  const { data: jobData, mutate: mutateJobs } = useSWR('/api/employer/jobs', fetcher, { revalidateOnFocus: true });
  const { data: campusData } = useSWR('/api/employer/campuses', fetcher, { revalidateOnFocus: true });
  const { data: drivesData } = useSWR('/api/employer/drives', fetcher, { revalidateOnFocus: true });
  const { data: profileData } = useSWR('/api/employer/profile', fetcher, { revalidateOnFocus: true });

  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedTenantIds, setSelectedTenantIds] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const showNotReady = (label) => {
    addToast(`${label} is not available yet in this build.`, 'info');
  };

  const jobsList = Array.isArray(jobData?.jobs) ? jobData.jobs : [];
  const placementDrives = useMemo(() => {
    const live = Array.isArray(drivesData?.drives)
      ? drivesData.drives.map((d) => ({
          id: d.id,
          name: `${d.college || 'Campus'} · ${d.role || 'Drive'}${d.date ? ` (${formatDate(d.date)})` : ''}`,
        }))
      : [];
    return [{ id: '', name: '— Not linked —' }, ...live];
  }, [drivesData]);

  const driveLabel = useCallback(
    (id) => {
      const d = placementDrives.find((x) => x.id === id);
      return d?.name || '';
    },
    [placementDrives],
  );

  const approvedCampuses = useMemo(
    () => (campusData?.colleges || []).filter((c) => c.approval_status === 'approved'),
    [campusData],
  );

  const filtered = jobsList.filter((j) => !filter || j.status === filter);

  const tabCounts = useMemo(
    () => ({
      all: jobsList.length,
      published: jobsList.filter((j) => j.status === 'published').length,
      draft: jobsList.filter((j) => j.status === 'draft').length,
      closed: jobsList.filter((j) => j.status === 'closed').length,
    }),
    [jobsList],
  );

  const profileHeadquarters = profileData?.profile?.headquarters;

  const autoSections = useMemo(
    () => buildAutoSections({ ...form, headquarters: profileHeadquarters }),
    [form, profileHeadquarters],
  );

  useEffect(() => {
    if (!showForm) return;
    setForm((prev) => ({
      ...prev,
      description: composeJobDescription(buildAutoSections({ ...prev, headquarters: profileHeadquarters })),
    }));
  }, [showForm, form.title, form.keywords, form.type, form.salaryMin, form.salaryMax, form.cgpa, form.vacancies, profileHeadquarters]);

  const openCreate = () => {
    setEditingJob(null);
    setForm({ ...emptyForm, type: 'full_time' });
    const sel = {};
    approvedCampuses.forEach((c) => {
      sel[c.id] = true;
    });
    setSelectedTenantIds(sel);
    setShowForm(true);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setForm({
      title: job.title,
      keywords: job.keywords || '',
      type: job.type,
      salaryMin: job.salaryMin ?? '',
      salaryMax: job.salaryMax ?? '',
      cgpa: job.cgpa ?? '',
      vacancies: job.vacancies ?? '',
      placementDriveId: job.placementDriveId ?? '',
      description: '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingJob(null);
    setForm(emptyForm);
  };

  const setField = useCallback((key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const submitJob = async (asDraft) => {
    if (!form.title.trim()) {
      addToast('Job title is required', 'error');
      return;
    }
    const tenantIds = Object.entries(selectedTenantIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!asDraft && !tenantIds.length) {
      addToast('Select at least one approved campus so notifications are created for that college.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/jobs', {
        method: editingJob ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingJob?.id,
          title: form.title.trim(),
          description: form.description,
          jobType: form.type,
          status: asDraft ? 'draft' : 'published',
          salaryMin: form.salaryMin,
          salaryMax: form.salaryMax,
          minCgpa: form.cgpa,
          vacancies: form.vacancies,
          keywords: form.keywords,
          tenantIds: asDraft ? [] : tenantIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json.error || 'Save failed', 'error');
        return;
      }
      addToast(
        editingJob
          ? 'Job updated successfully.'
          : asDraft
            ? 'Draft saved to the database (no alerts sent).'
            : 'Job published. College admins were notified one-by-one; internship posts also notify students per campus.',
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

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>💼 Job Postings</h1>
          <p>
            Publishing with selected campuses saves the job to the database first, then creates notification rows: college admins
            are notified one at a time per campus; internship posts also notify all students on those campuses.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => (showForm ? closeForm() : openCreate())}>
          {showForm ? 'Close form' : '+ Create Job Posting'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">{editingJob ? 'Edit Job Posting' : 'Create New Job Posting'}</h3>
            <button className="btn btn-ghost btn-sm" type="button" onClick={closeForm}>
              ✕ Close
            </button>
          </div>
          <div className="grid grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Target campuses (approved only) <span className="required">*</span></label>
              <p className="text-xs text-tertiary" style={{ marginBottom: '0.5rem' }}>
                Used when you publish — each selected campus gets database notifications after the job row is inserted.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '0.75rem',
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                {approvedCampuses.length === 0 ? (
                  <span className="text-sm text-secondary">No approved campuses yet. Request access from the campus directory first.</span>
                ) : (
                  approvedCampuses.map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!selectedTenantIds[c.id]}
                        onChange={() =>
                          setSelectedTenantIds((p) => ({
                            ...p,
                            [c.id]: !p[c.id],
                          }))
                        }
                      />
                      {c.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Keywords (comma-separated)</label>
              <input
                className="form-input"
                placeholder="e.g. React, TypeScript, AWS, System design"
                value={form.keywords}
                onChange={(e) => setField('keywords', e.target.value)}
              />
              <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
                Used with the job title to auto-fill <strong>Role</strong>, <strong>Skills</strong>, and the <strong>Job description</strong> below.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Placement drive (optional)</label>
              <select className="form-select" value={form.placementDriveId} onChange={(e) => setField('placementDriveId', e.target.value)}>
                {placementDrives.map((d) => (
                  <option key={d.id || 'none'} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Job Title <span className="required">*</span>
              </label>
              <input className="form-input" placeholder="e.g., Software Development Engineer" value={form.title} onChange={(e) => setField('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">
                Job Type <span className="required">*</span>
              </label>
              <select className="form-select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option value="full_time">Full Time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
                <option value="ppo">PPO</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Min Salary (Annual)</label>
              <input className="form-input" type="number" placeholder="₹ 800,000" value={form.salaryMin} onChange={(e) => setField('salaryMin', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Salary (Annual)</label>
              <input className="form-input" type="number" placeholder="₹ 1,500,000" value={form.salaryMax} onChange={(e) => setField('salaryMax', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Min CGPA</label>
              <input className="form-input" type="number" step="0.1" min="0" max="10" placeholder="6.0" value={form.cgpa} onChange={(e) => setField('cgpa', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vacancies</label>
              <input className="form-input" type="number" placeholder="10" value={form.vacancies} onChange={(e) => setField('vacancies', e.target.value)} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Auto-filled sections</label>
              <p className="text-xs text-secondary" style={{ margin: '0 0 0.5rem' }}>
                Updates when you change title, keywords, CGPA, compensation, vacancies, or job type.
              </p>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {[
                  { k: 'Role', v: autoSections.role },
                  { k: 'Qualifications', v: autoSections.qualifications },
                  { k: 'Skills', v: autoSections.skills },
                  { k: 'Compensation', v: autoSections.compensation },
                  { k: 'Location', v: autoSections.location },
                ].map((block) => (
                  <div
                    key={block.k}
                    style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div className="text-xs font-bold text-tertiary" style={{ letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      {block.k}
                    </div>
                    <div className="text-sm" style={{ lineHeight: 1.5 }}>
                      {block.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Job description</label>
              <textarea
                className="form-textarea"
                rows={14}
                placeholder="Description is generated from the fields above…"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" type="button" disabled={submitting} onClick={() => submitJob(true)}>
              Save as Draft
            </button>
            <button className="btn btn-primary" type="button" disabled={submitting} onClick={() => submitJob(false)}>
              {editingJob ? 'Update Job' : submitting ? 'Publishing…' : 'Publish Job'}
            </button>
          </div>
        </div>
      )}

      <div className="tabs">
        <button type="button" className={`tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>
          All ({tabCounts.all})
        </button>
        <button type="button" className={`tab ${filter === 'published' ? 'active' : ''}`} onClick={() => setFilter('published')}>
          Published
        </button>
        <button type="button" className={`tab ${filter === 'draft' ? 'active' : ''}`} onClick={() => setFilter('draft')}>
          Drafts
        </button>
        <button type="button" className={`tab ${filter === 'closed' ? 'active' : ''}`} onClick={() => setFilter('closed')}>
          Closed
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((job) => (
          <div key={job.id} className="card card-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{job.title}</h3>
                  <span className={`badge badge-${getStatusColor(job.status)}`}>{formatStatus(job.status)}</span>
                  <span className="badge badge-gray">{formatStatus(job.type)}</span>
                  {job.placementDriveId ? (
                    <span className="badge badge-indigo" title={driveLabel(job.placementDriveId)}>
                      Drive: {driveLabel(job.placementDriveId).replace(/^— Not linked —$/, '—')}
                    </span>
                  ) : (
                    <span className="badge badge-gray">No drive linked</span>
                  )}
                </div>
                {job.keywords ? (
                  <p className="text-xs text-secondary" style={{ margin: '0.25rem 0 0' }}>
                    <span className="text-tertiary">Keywords:</span> {job.keywords}
                  </p>
                ) : null}
                <div className="text-sm text-secondary" style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span>
                    💰{' '}
                    {job.salaryMin != null && job.salaryMax != null
                      ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`
                      : '—'}
                  </span>
                  <span>👥 {job.vacancies} vacancies</span>
                  <span>📝 {job.applications} applications</span>
                  <span>🎓 Min CGPA: {job.cgpa ?? '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(job);
                  }}
                >
                  Edit
                </button>
                <a className="btn btn-primary btn-sm" href={`/dashboard/employer/applications?jobId=${job.id}`}>
                  View Pipeline
                </a>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {(job.branches || []).map((b) => (
                <span key={b} className="badge badge-indigo">
                  {b}
                </span>
              ))}
              <span className="text-xs text-tertiary" style={{ marginLeft: 'auto' }}>
                Created {job.createdAt ? formatDate(job.createdAt) : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
