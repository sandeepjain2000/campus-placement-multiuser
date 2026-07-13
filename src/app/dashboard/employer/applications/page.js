'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  FolderDot,
  GraduationCap,
  Search,
} from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';
import EmployerStudentProfileModal from '@/components/employer/EmployerStudentProfileModal';
import EmployerApplicationRowActions from '@/components/employer/EmployerApplicationRowActions';
import {
  EMPLOYER_ALUMNI_APPLICATIONS_PATH,
  isEmployerAlumniDashboardPath,
} from '@/lib/employerAlumniRoutes';
import {
  countApplicationStatusPills,
  formatFilterBadgeLabel,
  shouldShowFilterCount,
} from '@/lib/filterBadgeLabel';

const ALL_TABS = [
  { id: 'drives', label: 'Placement drives', shortLabel: 'Drives', icon: Building2, desc: 'Students who registered for your campus placement drives.' },
  { id: 'jobs', label: 'Alumni Jobs', shortLabel: 'Alumni Jobs', icon: Briefcase, desc: 'Alumni who applied to your published full-time and contract job postings.' },
  { id: 'internships', label: 'Internships', shortLabel: 'Internships', icon: GraduationCap, desc: 'Students who applied to your published internship postings.' },
  { id: 'projects', label: 'Projects', shortLabel: 'Projects', icon: FolderDot, desc: 'Short projects and hackathons students applied to.' },
];

const STATUS_PILLS = [
  { key: '', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'selected', label: 'Selected' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'withdrawn', label: 'Withdrawn' },
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

function profileApplicationContext(profileContext) {
  if (!profileContext) return null;
  const {
    studentId: _studentId,
    openingTitle,
    status,
    appliedAt,
    currentRound,
    jobType,
    notes,
    sourceKind,
  } = profileContext;
  return { openingTitle, status, appliedAt, currentRound, jobType, notes, sourceKind };
}

export default function EmployerApplicationsPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const isAlumniScope = isEmployerAlumniDashboardPath(pathname);
  const applicationsBasePath = isAlumniScope ? EMPLOYER_ALUMNI_APPLICATIONS_PATH : '/dashboard/employer/applications';
  const visibleTabs = useMemo(
    () => (isAlumniScope ? ALL_TABS.filter((t) => t.id === 'jobs') : ALL_TABS.filter((t) => t.id !== 'jobs')),
    [isAlumniScope],
  );
  const searchParams = useSearchParams();
  const driveIdFromUrl = String(searchParams.get('driveId') || '').trim();
  const jobIdFromUrl = String(searchParams.get('jobId') || '').trim();
  const [tab, setTab] = useState(isAlumniScope ? 'jobs' : 'drives');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  const [profileContext, setProfileContext] = useState(null);
  const [updatingAppKey, setUpdatingAppKey] = useState(null);
  const profileStudentId = profileContext?.studentId ?? null;
  const profileApplication = useMemo(
    () => profileApplicationContext(profileContext),
    [profileContext],
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (isAlumniScope) {
      if (tabParam && tabParam !== 'jobs') {
        router.replace(EMPLOYER_ALUMNI_APPLICATIONS_PATH);
        return;
      }
      setTab('jobs');
      return;
    }
    if (tabParam === 'jobs') {
      router.replace(EMPLOYER_ALUMNI_APPLICATIONS_PATH);
      return;
    }
    if (tabParam === 'drives' || tabParam === 'internships' || tabParam === 'projects') {
      setTab(tabParam);
      return;
    }
    if (jobIdFromUrl && !tabParam) {
      router.replace(`${EMPLOYER_ALUMNI_APPLICATIONS_PATH}?jobId=${encodeURIComponent(jobIdFromUrl)}`);
      return;
    }
    if (driveIdFromUrl && !tabParam) {
      setTab('drives');
    }
  }, [searchParams, jobIdFromUrl, driveIdFromUrl, isAlumniScope, router]);

  const applicationsBaseUrl = useMemo(() => {
    const params = new URLSearchParams({ tab });
    if (driveIdFromUrl && tab === 'drives') params.set('driveId', driveIdFromUrl);
    if (jobIdFromUrl && (tab === 'jobs' || tab === 'internships' || tab === 'projects')) {
      params.set('jobId', jobIdFromUrl);
    }
    return `/api/employer/applications?${params.toString()}`;
  }, [tab, driveIdFromUrl, jobIdFromUrl]);

  const { data, error, isLoading, mutate } = useSWR(applicationsBaseUrl, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });
  const {
    data: profileData,
    error: profileError,
    isLoading: profileLoading,
  } = useSWR(
    profileStudentId
      ? `/api/employer/applications/student-profile?studentId=${encodeURIComponent(profileStudentId)}${
          profileContext?.applicationId
            ? `&applicationId=${encodeURIComponent(profileContext.applicationId)}&source=${encodeURIComponent(profileContext.sourceKind || '')}`
            : ''
        }`
      : null,
    fetcher,
  );

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const counts = data?.counts || { drives: 0, jobs: 0, internships: 0, projects: 0 };
  const statusCounts = useMemo(
    () => countApplicationStatusPills(items, STATUS_PILLS),
    [items],
  );

  const filtered = useMemo(() => {
    const result = items.filter((a) => {
      if (statusFilter === 'withdrawn') {
        if (a.status !== 'withdrawn') return false;
      } else if (statusFilter) {
        if (a.status !== statusFilter) return false;
      } else if (a.status === 'withdrawn') {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const blob = [a.studentName, a.systemId, a.rollNumber, a.email, a.collegeName, a.openingTitle, a.branch]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortOption === 'date_desc') return new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0);
      if (sortOption === 'date_asc') return new Date(a.appliedAt || 0) - new Date(b.appliedAt || 0);
      if (sortOption === 'cgpa_desc') return (Number(b.cgpa) || 0) - (Number(a.cgpa) || 0);
      if (sortOption === 'name_asc') return (a.studentName || '').localeCompare(b.studentName || '');
      return 0;
    });
  }, [items, statusFilter, search, sortOption]);

  const tabMeta = visibleTabs.find((t) => t.id === tab) || visibleTabs[0] || ALL_TABS[0];

  const getApplicationsCsv = useCallback(
    (scope) => {
      const list = scope === 'current' ? filtered : items;
      const headers = isAlumniScope
        ? [
            'Opening',
            'College',
            'Student',
            'System ID',
            'Email',
            'Branch',
            'CGPA',
            'Type',
            'Status',
            'Applied',
            'Source',
          ]
        : [
            'Student',
            'System ID',
            'Roll number',
            'Email',
            'College',
            'Branch',
            'CGPA',
            'Opening',
            'Type',
            'Status',
            'Applied',
            'Source',
          ];
      const rows = list.map((a) =>
        isAlumniScope
          ? [
              a.openingTitle,
              a.collegeName,
              a.studentName,
              a.systemId || '',
              a.email,
              a.branch,
              a.cgpa != null ? String(a.cgpa) : '',
              jobTypeLabel(a.jobType),
              a.status,
              a.appliedAt ? formatDate(a.appliedAt) : '',
              a.sourceKind === 'drive' ? 'Placement drive' : 'Program',
            ]
          : [
              a.studentName,
              a.systemId || '',
              a.rollNumber || '',
              a.email,
              a.collegeName,
              a.branch,
              a.cgpa != null ? String(a.cgpa) : '',
              a.openingTitle,
              jobTypeLabel(a.jobType),
              a.status,
              a.appliedAt ? formatDate(a.appliedAt) : '',
              a.sourceKind === 'drive' ? 'Placement drive' : 'Program',
            ],
      );
      return { headers, rows };
    },
    [filtered, items, isAlumniScope],
  );

  const openResume = (url) => {
    if (!url) { addToast('No resume on file for this student.', 'info'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadResume = (url) => {
    if (!url) { addToast('No resume on file for this student.', 'info'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const updateStatus = async (app, status) => {
    const appKey = `${app.sourceKind}-${app.id}`;
    if (updatingAppKey === appKey) return;
    setUpdatingAppKey(appKey);
    try {
      const res = await fetch('/api/employer/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, sourceKind: app.sourceKind, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to update status');
      await mutate();
      addToast(`Application marked as ${formatStatus(status)}.`, 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingAppKey(null);
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
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={28} /> {isAlumniScope ? 'Alumni Applications' : 'Applications Pipeline'}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            {tabMeta.desc}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', margin: '0.5rem 0 0' }}>
            Students confirmed by another employer (FCFS) are hidden here — see{' '}
            <Link href="/dashboard/employer/fcfs-unavailable" style={{ color: '#fff', textDecoration: 'underline' }}>
              Unavailable candidates
            </Link>
            .
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <ExportCsvSplitButton
            filenameBase={`employer-applications-${tab}`}
            currentCount={filtered.length}
            fullCount={items.length}
            getRows={getApplicationsCsv}
          />
        </div>
      </div>

      {driveIdFromUrl && tab === 'drives' && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            padding: '0.85rem 1.1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            background: 'var(--primary-50)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
          }}
        >
          <span>
            <strong>{items.length}</strong> applicant{items.length === 1 ? '' : 's'} for this placement drive
            {statusFilter || search ? ` (${filtered.length} shown with current filters)` : ''}.
            Use the shortlist icon on each row to move candidates forward.
          </span>
          <Link href="/dashboard/employer/applications?tab=drives" className="btn btn-ghost btn-sm">
            Show all drives
          </Link>
        </div>
      )}

      {jobIdFromUrl && !driveIdFromUrl && (tab === 'jobs' || tab === 'internships' || tab === 'projects') && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            padding: '0.85rem 1.1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            background: 'var(--primary-50)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
          }}
        >
          <span>
            <strong>{items.length}</strong> applicant{items.length === 1 ? '' : 's'} for this opening
            {statusFilter || search ? ` (${filtered.length} shown with current filters)` : ''}.
          </span>
          <Link href={`${applicationsBasePath}?tab=${tab}`} className="btn btn-ghost btn-sm">
            Show all {tab === 'internships' ? 'internships' : tab === 'projects' ? 'projects' : 'alumni jobs'}
          </Link>
        </div>
      )}

      {visibleTabs.length > 1 ? (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const n = counts[t.id] ?? 0;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setStatusFilter('');
                  router.replace(`${applicationsBasePath}?tab=${t.id}`);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'var(--primary-600)' : 'var(--bg-secondary)',
                  color: active ? 'white' : 'var(--text-secondary)',
                  boxShadow: active ? '0 4px 10px rgba(79, 70, 229, 0.25)' : 'none',
                }}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 1.75} />
                {t.shortLabel}
                {shouldShowFilterCount(n) ? (
                  <span style={{ opacity: 0.85, fontSize: '0.8rem', background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)', borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 700, color: active ? 'white' : 'var(--text-tertiary)' }}>
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {error && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--danger-200)', background: 'var(--danger-50)', padding: '1.25rem 1.5rem' }}>
          <p className="text-sm" style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 500 }}>{error.message}</p>
        </div>
      )}

      {/* Toolbar Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border-default)' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            placeholder="Search by name, email, college, or opening…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.75rem', paddingRight: '1rem', paddingTop: '0.65rem', paddingBottom: '0.65rem', fontSize: '0.95rem' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sort:</span>
          <select className="form-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ width: 'auto', padding: '0.65rem 2rem 0.65rem 1rem', fontSize: '0.95rem', fontWeight: 500 }}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="cgpa_desc">Highest CGPA</option>
            <option value="name_asc">Name A–Z</option>
          </select>
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', fontWeight: 600, marginLeft: 'auto' }}>
          {filtered.length} of {items.length} shown
        </span>
      </div>

      {/* Status Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {STATUS_PILLS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setStatusFilter(p.key)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: statusFilter === p.key ? '1.5px solid var(--primary-400)' : '1.5px solid var(--border-default)',
              background: statusFilter === p.key ? 'var(--primary-50)' : 'var(--bg-primary)',
              color: statusFilter === p.key ? 'var(--primary-700)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {formatFilterBadgeLabel(p.label, statusCounts[p.key])}
          </button>
        ))}
      </div>

      {isLoading && (
        <PageLoading message="Loading applications…" inline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        </PageLoading>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-xl)' }}>
          <ClipboardList size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No applications yet</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Students apply from placement drives (Jobs) or from Internships / Projects.<br />
            Post a job to start receiving applications.
          </p>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div className="table-container" style={{ border: 'none', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="data-table">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {isAlumniScope ? (
                    <>
                      <th style={{ paddingLeft: '1.5rem' }}>Opening</th>
                      <th>College</th>
                      <th>Student</th>
                      <th>System ID</th>
                      <th>Branch</th>
                      <th>CGPA</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th style={{ textAlign: 'right', paddingRight: '1.5rem', width: 1 }}>Actions</th>
                    </>
                  ) : (
                    <>
                      <th style={{ paddingLeft: '1.5rem' }}>Student</th>
                      <th>System ID</th>
                      <th>College</th>
                      <th>Branch</th>
                      <th>CGPA</th>
                      <th>Opening</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th style={{ textAlign: 'right', paddingRight: '1.5rem', width: 1 }}>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const appName = String(app?.studentName || 'Student').trim() || 'Student';
                  const initials = appName.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  const openingCell = (
                    <td style={{ maxWidth: 220, fontSize: '0.9rem', paddingLeft: isAlumniScope ? '1.5rem' : undefined }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{app.openingTitle}</div>
                    </td>
                  );
                  const collegeCell = (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <Building2 size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                        {app.collegeName}
                      </div>
                    </td>
                  );
                  const studentCell = (
                    <td style={{ paddingLeft: isAlumniScope ? undefined : '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          className="avatar avatar-sm"
                          style={{
                            background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
                            color: 'var(--primary-700)',
                            fontWeight: 700, fontSize: '0.75rem',
                            border: '1px solid var(--primary-300)'
                          }}
                        >
                          {initials || 'S'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{app.studentName}</div>
                          <div className="text-xs text-tertiary">{app.email}</div>
                        </div>
                      </div>
                    </td>
                  );
                  const systemIdCell = <td className="font-mono text-sm text-secondary">{app.systemId || '—'}</td>;
                  const branchCell = <td className="text-sm text-secondary">{app.branch || '—'}</td>;
                  const cgpaCell = (
                    <td>
                      {app.cgpa != null ? (
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{app.cgpa}</span>
                      ) : '—'}
                    </td>
                  );
                  const statusCell = (
                    <td>
                      <span className={`badge badge-${getStatusColor(app.status)} badge-dot`} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                        {formatStatus(app.status)}
                      </span>
                    </td>
                  );
                  const appliedCell = <td className="text-sm text-secondary">{app.appliedAt ? formatDate(app.appliedAt) : '—'}</td>;
                  const actionsCell = (
                    <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                      <EmployerApplicationRowActions
                        app={app}
                        busy={updatingAppKey === `${app.sourceKind}-${app.id}`}
                        onViewProfile={() =>
                          setProfileContext({
                            applicationId: app.id,
                            studentId: app.studentProfileId,
                            openingTitle: app.openingTitle,
                            status: app.status,
                            appliedAt: app.appliedAt,
                            currentRound: app.currentRound,
                            jobType: app.jobType,
                            notes: app.notes,
                            sourceKind: app.sourceKind,
                          })
                        }
                        onOpenResume={() => openResume(app.resumeUrl)}
                        onDownloadResume={() => downloadResume(app.resumeDownloadUrl)}
                        onUpdateStatus={updateStatus}
                      />
                    </td>
                  );
                  return (
                    <tr key={`${app.sourceKind}-${app.id}-${app.jobId || app.driveId || app.openingTitle}`}>
                      {isAlumniScope ? (
                        <>
                          {openingCell}
                          {collegeCell}
                          {studentCell}
                          {systemIdCell}
                          {branchCell}
                          {cgpaCell}
                          {statusCell}
                          {appliedCell}
                          {actionsCell}
                        </>
                      ) : (
                        <>
                          {studentCell}
                          {systemIdCell}
                          {collegeCell}
                          {branchCell}
                          {cgpaCell}
                          {openingCell}
                          {statusCell}
                          {appliedCell}
                          {actionsCell}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <EmployerStudentProfileModal
        open={Boolean(profileStudentId)}
        profileData={profileData}
        profileError={profileError}
        profileLoading={profileLoading}
        applicationContext={profileApplication}
        onClose={() => setProfileContext(null)}
        onOpenResume={openResume}
      />
    </div>
  );
}
