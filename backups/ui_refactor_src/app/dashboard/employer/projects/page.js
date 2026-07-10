'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { FolderGit2, Plus, Users, IndianRupee, Activity, FileText, Settings } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

async function swrFetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function EmployerProjectsPage() {
  const { addToast } = useToast();
  const { data: campusData } = useSWR('/api/employer/campuses', swrFetcher, { revalidateOnFocus: true });
  const {
    data: jobData,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateJobs,
  } = useSWR('/api/employer/jobs', swrFetcher, {
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

  const approvedCampuses = useMemo(
    () => (campusData?.colleges || []).filter((c) => c.approval_status === 'approved'),
    [campusData],
  );

  const projects = useMemo(() => {
    const jobs = Array.isArray(jobData?.jobs) ? jobData.jobs : [];
    return jobs.filter((j) => j.type === 'short_project' || j.type === 'hackathon');
  }, [jobData]);

  const openForm = () => {
    const sel = {};
    approvedCampuses.forEach((c) => {
      sel[c.id] = true;
    });
    setSelectedTenantIds(sel);
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
    if (!title.trim()) {
      addToast('Title is required', 'error');
      return;
    }
    const tenantIds = Object.entries(selectedTenantIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!tenantIds.length) {
      addToast('Select at least one approved campus.', 'warning');
      return;
    }
    const sm = stipend === '' ? null : Number(stipend);
    const sx = stipendMax === '' ? null : Number(stipendMax);
    if (stipend !== '' && Number.isNaN(sm)) {
      addToast('Amount must be a number (INR)', 'error');
      return;
    }
    if (stipendMax !== '' && Number.isNaN(sx)) {
      addToast('Max amount must be a number', 'error');
      return;
    }

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
          minCgpa: minCgpa === '' ? null : Number(minCgpa),
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
      setShowForm(false);
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
  ]);

  const openCampusSync = useCallback(
    (jobId) => {
      const sel = {};
      approvedCampuses.forEach((c) => {
        sel[c.id] = true;
      });
      setCampusSyncSelection(sel);
      setCampusSyncJobId(jobId);
    },
    [approvedCampuses],
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
          <button type="button" className="btn btn-primary" onClick={() => (showForm ? setShowForm(false) : openForm())}>
            <Plus size={16} /> {showForm ? 'Close form' : 'Post project'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">New project</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
              ✕ Close
            </button>
          </div>
          <div className="grid grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Target campuses (approved) <span className="required">*</span></label>
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
                  <span className="text-sm text-secondary">No approved campuses. Complete a campus tie-up first.</span>
                ) : (
                  approvedCampuses.map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!selectedTenantIds[c.id]}
                        onChange={() => setSelectedTenantIds((p) => ({ ...p, [c.id]: !p[c.id] }))}
                      />
                      {c.name}
                    </label>
                  ))
                )}
              </div>
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
              <input className="form-input" type="number" value={stipend} onChange={(e) => setStipend(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Max (optional)</label>
              <input className="form-input" type="number" value={stipendMax} onChange={(e) => setStipendMax(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Team slots / openings</label>
              <input className="form-input" type="number" value={vacancies} onChange={(e) => setVacancies(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Min CGPA</label>
              <input className="form-input" type="number" step="0.1" min="0" max="10" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} />
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={publishProject}>
              {submitting ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </div>
      )}

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {jobsLoading && <p className="text-sm text-secondary">Loading…</p>}
        {!jobsLoading && !jobsError && projects.length === 0 && (
          <p className="text-sm text-secondary">No project postings yet. Publish one above.</p>
        )}
        {projects.map((p) => (
          <div key={String(p.id)} className="stats-card stats-card--oneline">
            <div className="stats-card-icon indigo">
              <FolderGit2 size={22} strokeWidth={1.5} />
            </div>
            <p className="stats-card-oneline-text">
              <strong>{p.title}</strong>
              {' · '}
              <span className="badge badge-gray">{p.type === 'hackathon' ? 'Hackathon' : 'Short project'}</span>
              {' · '}
              {p.salaryMin != null || p.salaryMax != null
                ? `${formatCurrency(Number(p.salaryMin ?? p.salaryMax))}${p.salaryMax != null && p.salaryMin != null && Number(p.salaryMax) !== Number(p.salaryMin) ? ` – ${formatCurrency(Number(p.salaryMax))}` : ''}`
                : '—'}
              {' · '}
              Min CGPA {p.cgpa ?? '—'} · {p.vacancies} openings ·{' '}
              <span className={`badge ${p.status === 'published' ? 'badge-success' : 'badge-gray'} badge-dot`}>{p.status}</span>
              {p.createdAt ? ` · ${formatDate(p.createdAt)}` : ''}
            </p>
            <div className="stats-card-oneline-actions">
              {p.status === 'published' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openCampusSync(p.id)}>
                  <Users size={14} style={{ marginRight: '0.25rem' }} /> Sync campuses
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addToast(p.title, 'info')}>
                <FileText size={14} style={{ marginRight: '0.25rem' }} /> Details
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addToast('Editing via API can be added later.', 'info')}>
                <Settings size={14} style={{ marginRight: '0.25rem' }} /> Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {campusSyncJobId && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-header">
            <h3 className="card-title">Campus visibility</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCampusSyncJobId(null)}>
              ✕ Close
            </button>
          </div>
          <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
            Use this if the posting is published but students do not see it. Requires an approved tie-up per campus.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            {approvedCampuses.length === 0 ? (
              <span className="text-sm text-secondary">No approved campuses.</span>
            ) : (
              approvedCampuses.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!campusSyncSelection[c.id]}
                    onChange={() => setCampusSyncSelection((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                  />
                  {c.name}
                </label>
              ))
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" disabled={campusSyncSubmitting} onClick={() => setCampusSyncJobId(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={campusSyncSubmitting} onClick={submitCampusSync}>
              {campusSyncSubmitting ? 'Saving…' : 'Save visibility'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
