'use client';

import { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import { Briefcase, ClipboardList, FolderDot, GraduationCap } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';

const TABS = [
  { id: 'jobs', label: 'Jobs', shortLabel: 'Jobs', icon: Briefcase, desc: 'Applications to your placement drives (full-time, PPO, etc.).' },
  { id: 'internships', label: 'Internships', shortLabel: 'Internships', icon: GraduationCap, desc: 'Students who applied to your published internship postings.' },
  { id: 'projects', label: 'Projects', shortLabel: 'Projects', icon: FolderDot, desc: 'Short projects and hackathons students applied to.' },
];

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function jobTypeLabel(t) {
  if (!t || t === 'placement_drive') return 'Drive';
  return String(t).replace(/_/g, ' ');
}

export default function EmployerApplicationsPage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('jobs');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, error, isLoading } = useSWR(`/api/employer/applications?tab=${tab}`, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  const items = data?.items || [];
  const counts = data?.counts || { jobs: 0, internships: 0, projects: 0 };

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = [a.studentName, a.email, a.collegeName, a.openingTitle, a.branch].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, search]);

  const tabMeta = TABS.find((t) => t.id === tab) || TABS[0];

  const getApplicationsCsv = useCallback(
    (scope) => {
      const list = scope === 'current' ? filtered : items;
      const headers = ['Student', 'Email', 'College', 'Branch', 'CGPA', 'Opening', 'Type', 'Status', 'Applied', 'Source'];
      const rows = list.map((a) => [
        a.studentName,
        a.email,
        a.collegeName,
        a.branch,
        a.cgpa != null ? String(a.cgpa) : '',
        a.openingTitle,
        jobTypeLabel(a.jobType),
        a.status,
        a.appliedAt ? formatDate(a.appliedAt) : '',
        a.sourceKind === 'drive' ? 'Placement drive' : 'Program',
      ]);
      return { headers, rows };
    },
    [filtered, items],
  );

  const openResume = (url, name) => {
    if (!url) {
      addToast('No resume on file for this student.', 'info');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={26} className="text-secondary" strokeWidth={1.5} aria-hidden />
            Applications
          </h1>
          <p className="text-secondary" style={{ margin: '0.25rem 0 0' }}>
            Review candidates by pipeline: placement drives (Jobs), internship postings, and project postings — all from the database.
          </p>
        </div>
        <div className="page-header-actions">
          <ExportCsvSplitButton
            filenameBase={`employer-applications-${tab}`}
            currentCount={filtered.length}
            fullCount={items.length}
            getRows={getApplicationsCsv}
          />
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Application type" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const n = counts[t.id] ?? 0;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`tab ${active ? 'active' : ''}`}
              onClick={() => {
                setTab(t.id);
                setStatusFilter('');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              {t.shortLabel}
              <span className="text-xs opacity-80">({n})</span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-secondary" style={{ margin: '0.75rem 0 0' }}>
        {tabMeta.desc}
      </p>

      {error && (
        <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            {error.message}
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Search name, email, college, opening…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 220, flex: '1 1 200px' }}
          />
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All statuses</option>
            <option value="applied">Applied</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="in_progress">In progress</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="on_hold">On hold</option>
          </select>
          <span className="text-sm text-secondary">
            {filtered.length} of {items.length} in this tab
          </span>
        </div>
      </div>

      {isLoading && <p className="text-sm text-secondary" style={{ marginTop: '1rem' }}>Loading…</p>}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="text-secondary" style={{ margin: 0 }}>
            No applications in this tab yet. Students apply from drives (Jobs) or from Internships / Projects under Placements.
          </p>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>College</th>
                <th>Branch</th>
                <th>CGPA</th>
                <th>Opening</th>
                <th>Type</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={`${app.sourceKind}-${app.id}`}>
                  <td>
                    <div className="font-semibold text-sm">{app.studentName}</div>
                    <div className="text-xs text-tertiary">{app.email}</div>
                  </td>
                  <td className="text-sm">{app.collegeName}</td>
                  <td className="text-sm">{app.branch}</td>
                  <td>{app.cgpa != null ? <span className="font-medium">{app.cgpa}</span> : '—'}</td>
                  <td className="text-sm" style={{ maxWidth: 220 }}>
                    {app.openingTitle}
                  </td>
                  <td>
                    <span className="badge badge-gray">{jobTypeLabel(app.jobType)}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${getStatusColor(app.status)} badge-dot`}>{formatStatus(app.status)}</span>
                  </td>
                  <td className="text-sm text-tertiary">{app.appliedAt ? formatDate(app.appliedAt) : '—'}</td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openResume(app.resumeUrl, app.studentName)}>
                      Resume
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
