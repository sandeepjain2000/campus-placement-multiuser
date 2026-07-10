'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { GraduationCap, Plus, Users, IndianRupee, Activity, FileText, Settings } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

async function swrFetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function buildDescription(durationMonths, notes) {
  const lines = [`Duration: ${durationMonths} months.`];
  if (notes?.trim()) {
    lines.push('', notes.trim());
  }
  return lines.join('\n');
}

export default function EmployerInternshipsPage() {
  const { addToast } = useToast();
  const { data: campusData } = useSWR('/api/employer/campuses', swrFetcher, { revalidateOnFocus: true });
  const {
    data: jobData,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateInternships,
  } = useSWR('/api/employer/jobs?jobType=internship', swrFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [durationMonths, setDurationMonths] = useState('6');
  const [stipend, setStipend] = useState('');
  const [stipendMax, setStipendMax] = useState('');
  const [vacancies, setVacancies] = useState('5');
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

  const internships = Array.isArray(jobData?.jobs) ? jobData.jobs : [];

  const openForm = () => {
    const sel = {};
    approvedCampuses.forEach((c) => {
      sel[c.id] = true;
    });
    setSelectedTenantIds(sel);
    setTitle('');
    setDurationMonths('6');
    setStipend('');
    setStipendMax('');
    setVacancies('5');
    setMinCgpa('');
    setKeywords('');
    setNotes('');
    setShowForm(true);
  };

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

  const publishInternship = useCallback(async () => {
    if (!title.trim()) {
      addToast('Internship title is required', 'error');
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
      addToast('Stipend must be a number (monthly INR)', 'error');
      return;
    }
    if (stipendMax !== '' && Number.isNaN(sx)) {
      addToast('Max stipend must be a number', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const description = buildDescription(durationMonths, notes);
      const res = await fetch('/api/employer/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          jobType: 'internship',
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
      addToast('Internship published to the database. Partner colleges and students were notified.', 'success');
      setShowForm(false);
      await mutateInternships();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    selectedTenantIds,
    stipend,
    stipendMax,
    durationMonths,
    notes,
    minCgpa,
    vacancies,
    keywords,
    addToast,
    mutateInternships,
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
          ? `Campus visibility updated (${json.inserted} new). College and students can refresh.`
          : json.skippedNotApproved > 0
            ? 'No new visibility rows (check tie-ups are approved for selected campuses).'
            : 'Visibility already present for those campuses.';
      addToast(msg, json.inserted > 0 ? 'success' : 'info');
      setCampusSyncJobId(null);
    } catch {
      addToast('Network error', 'error');
    } finally {
      setCampusSyncSubmitting(false);
    }
  }, [campusSyncJobId, campusSyncSelection, addToast]);

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
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={() => (showForm ? setShowForm(false) : openForm())}>
            <Plus size={16} /> {showForm ? 'Close form' : 'Post Internship'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">Post New Internship</h3>
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
                  <span className="text-sm text-secondary">No approved campuses. Request access from the campus directory first.</span>
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
              <label className="form-label">Internship Title <span className="required">*</span></label>
              <input className="form-input" placeholder="e.g., Summer Data Intern" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration <span className="required">*</span></label>
              <select className="form-select" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)}>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Stipend / month (min, INR)</label>
              <input className="form-input" type="number" placeholder="40000" value={stipend} onChange={(e) => setStipend(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Stipend / month (max, optional)</label>
              <input className="form-input" type="number" placeholder="Same as min if empty" value={stipendMax} onChange={(e) => setStipendMax(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Openings</label>
              <input className="form-input" type="number" value={vacancies} onChange={(e) => setVacancies(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Min CGPA</label>
              <input className="form-input" type="number" step="0.1" min="0" max="10" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Skills (comma-separated)</label>
              <input className="form-input" placeholder="Python, SQL, ML" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Additional notes</label>
              <textarea className="form-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Eligibility, location, PPO hint…" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={publishInternship}>
              {submitting ? 'Publishing…' : 'Publish Internship'}
            </button>
          </div>
        </div>
      )}

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {jobsLoading && <p className="text-sm text-secondary">Loading internships…</p>}
        {!jobsLoading && !jobsError && internships.length === 0 && (
          <p className="text-sm text-secondary">No internship postings yet. Publish one above (saved as job_type internship).</p>
        )}
        {internships.map((intern) => (
          <div key={String(intern.id)} className="stats-card stats-card--oneline">
            <div className="stats-card-icon indigo">
              <GraduationCap size={22} strokeWidth={1.5} />
            </div>
            <p className="stats-card-oneline-text">
              <strong>{intern.title}</strong>
              {' · '}
              {stipendLabel(intern.salaryMin, intern.salaryMax)} · Min CGPA {intern.cgpa ?? '—'} · {intern.vacancies} openings ·{' '}
              <span className={`badge ${intern.status === 'published' ? 'badge-success' : 'badge-gray'} badge-dot`}>{intern.status}</span>
              {' · '}
              {intern.createdAt ? formatDate(intern.createdAt) : ''}
            </p>
            <div className="stats-card-oneline-actions">
              {intern.status === 'published' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openCampusSync(intern.id)}>
                  <Users size={14} style={{ marginRight: '0.25rem' }} /> Sync campuses
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addToast(intern.title, 'info')}>
                <FileText size={14} style={{ marginRight: '0.25rem' }} /> Details
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addToast('Manage via Job Postings when edit API is available.', 'info')}>
                <Settings size={14} style={{ marginRight: '0.25rem' }} /> Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="text-sm text-secondary">
          {internships.length} internship posting{internships.length === 1 ? '' : 's'} from your company
        </div>
      </div>

      {campusSyncJobId && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-header">
            <h3 className="card-title">Campus visibility for students &amp; college</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCampusSyncJobId(null)}>
              ✕ Close
            </button>
          </div>
          <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
            If this internship is published but does not appear on the college or student dashboards, add visibility rows for the
            campuses that should see it (approved tie-up required).
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
                    onChange={() => setCampusSyncSelection((p) => ({ ...p, [c.id]: !p[c.id] }))}
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
