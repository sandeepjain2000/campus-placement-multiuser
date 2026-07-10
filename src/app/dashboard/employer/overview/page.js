'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { Briefcase, FileText, CheckCircle, Send, Users, Calendar, ArrowRight, Building2, MapPin, Eye } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { EMPLOYER_ALUMNI_JOBS_PATH } from '@/lib/employerAlumniRoutes';
import { useEmployerScopedApiPath } from '@/lib/employerAcademicYearContext';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load dashboard');
  return data;
};

export default function EmployerOverviewPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const router = useRouter();
  const [activeCampus, setActiveCampus] = useState(null);
  const [resolvingCampus, setResolvingCampus] = useState(true);

  const showNotReady = (label) => {
    addToast(`${label} is not available yet in this build.`, 'info');
  };

  useEffect(() => {
    let mounted = true;
    const resolveCampus = async () => {
      try {
        const stored = sessionStorage.getItem('activeCampus');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.id) {
              if (mounted) setActiveCampus(parsed);
              return;
            }
            sessionStorage.removeItem('activeCampus');
          } catch {
            sessionStorage.removeItem('activeCampus');
          }
        }

        try {
          const lsRaw = localStorage.getItem('activeCampus');
          if (lsRaw) {
            const lsParsed = JSON.parse(lsRaw);
            if (lsParsed?.id) {
              sessionStorage.setItem('activeCampus', lsRaw);
              try { window.dispatchEvent(new Event('placementhub-active-campus')); } catch { /**/ }
              if (mounted) setActiveCampus(lsParsed);
              return;
            }
            localStorage.removeItem('activeCampus');
          }
        } catch { /**/ }

        const res = await fetch('/api/employer/campuses', { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        const approved = Array.isArray(json?.colleges)
          ? json.colleges.filter((c) => String(c?.approval_status || '').toLowerCase() === 'approved')
          : [];
        if (approved.length >= 1) {
          const campus = approved[0];
          const campusPayload = {
            id: campus.id,
            name: campus.name,
            slug: campus.slug,
            city: campus.city,
            state: campus.state,
          };
          const payload = JSON.stringify(campusPayload);
          sessionStorage.setItem('activeCampus', payload);
          try { localStorage.setItem('activeCampus', payload); } catch { /**/ }
          try {
            window.dispatchEvent(new Event('placementhub-active-campus'));
          } catch {
            // ignore
          }
          setActiveCampus(campusPayload);
          return;
        }
      } finally {
        if (mounted) setResolvingCampus(false);
      }
    };
    resolveCampus();
    return () => {
      mounted = false;
    };
  }, [router]);

  const dashboardUrl = useEmployerScopedApiPath('/api/employer/dashboard');

  const { data, error, isLoading } = useSWR(
    activeCampus ? dashboardUrl : null,
    fetcher
  );

  const recentApplications = Array.isArray(data?.recentApplications) ? data.recentApplications : [];
  const {
    search: appsSearch,
    setSearch: setAppsSearch,
    sort: appsSort,
    setSort: setAppsSort,
    filtered: displayRecentApplications,
    filteredCount: appsFilteredCount,
    totalCount: appsTotalCount,
    hasActiveFilters: appsHasActiveFilters,
    clearFilters: clearAppsFilters,
  } = useDataTableQuery(recentApplications, {
    getSearchText: (app) => [app.name, app.role, app.college, app.status, app.cgpa].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  if (error) return <PageError error={error} />;

  if (resolvingCampus || isLoading || (!data && activeCampus)) {
    return (
      <PageLoading
        message={resolvingCampus ? 'Loading campus context…' : 'Loading employer overview…'}
        variant="skeleton-dashboard"
      />
    );
  }

  if (!activeCampus) {
    return (
      <div className="animate-fadeIn">
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '520px', margin: '4rem auto', borderRadius: 'var(--radius-xl)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Building2 size={32} style={{ color: 'var(--primary-600)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
            No campus tie-up yet
          </h3>
          <p className="text-secondary" style={{ lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
            Request a partnership with one or more colleges to start posting jobs, viewing applications, and managing placement drives.
          </p>
          <Link href="/dashboard/employer/select-campus" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            Browse &amp; Request Campus Tie-ups
          </Link>
        </div>
      </div>
    );
  }

  const { stats, upcomingDrives } = data;
  const pipelineCounts = [
    stats.totalApplications || 0,
    stats.shortlisted || 0,
    stats.interviewStage || 0,
    stats.selectedCount || 0,
  ];
  const offersExtended = stats.offersExtended || 0;
  const acceptanceBadgeLabel =
    offersExtended > 0
      ? `${Math.round(((stats.selectedCount || 0) / offersExtended) * 100)}% acceptance`
      : null;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* High-Fidelity Glassmorphic Hero Banner */}
      <div
        className="gradient-banner"
        style={{
          position: 'relative',
          background: 'var(--banner-gradient)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          color: 'white',
          overflow: 'visible',
          marginBottom: '2rem',
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
          <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Welcome, {session?.user?.tenantName || session?.user?.name?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Managing recruitment for <strong style={{ color: 'white', fontWeight: 600 }}>{activeCampus.name}</strong>
          </p>
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard/employer/assessment-summary" className="btn gradient-banner-glass-btn" style={{ backdropFilter: 'blur(10px)' }}>
            Assessment Map
          </Link>
          <Link href={EMPLOYER_ALUMNI_JOBS_PATH} className="btn gradient-banner-solid-btn" style={{ border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            + Post New Job
          </Link>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Briefcase size={22} strokeWidth={2} />
            </div>
            <div style={{ height: '24px' }}></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.activeJobs}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>Active Jobs</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success-600)' }}>
              <FileText size={22} strokeWidth={2} />
            </div>
            <div style={{ height: '24px' }}></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.totalApplications}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>Total Applications</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(217, 119, 6, 0.1)', color: 'var(--warning-600)' }}>
              <CheckCircle size={22} strokeWidth={2} />
            </div>
            <div style={{ height: '24px' }}></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.shortlisted}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>Shortlisted</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(225, 29, 72, 0.1)', color: 'var(--rose-600)' }}>
              <Send size={22} strokeWidth={2} />
            </div>
            {acceptanceBadgeLabel ? (
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--rose-600)', background: 'rgba(225, 29, 72, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {acceptanceBadgeLabel}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '0.25rem 0' }}>
                No offers yet
              </div>
            )}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.offersExtended}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>Offers Extended</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ paddingBottom: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                <Users size={18} className="text-secondary" />
              </div>
              Hiring Pipeline
            </h3>
          </div>
          
          {/* Stepper Pipeline */}
          <div style={{ display: 'flex', gap: '0.5rem', position: 'relative', flex: 1, alignItems: 'center' }}>
            {['Applied', 'Shortlisted', 'Interview', 'Selected'].map((stage, i) => {
              const colors = ['var(--info-600)', 'var(--primary-600)', 'var(--warning-600)', 'var(--success-600)'];
              const bgColors = [
                'rgba(2, 132, 199, 0.08)',
                'rgba(79, 70, 229, 0.08)',
                'rgba(217, 119, 6, 0.08)',
                'rgba(5, 150, 105, 0.08)',
              ];
              return (
                <div
                  key={stage}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '1.5rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: bgColors[i],
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: colors[i], lineHeight: 1 }}>{pipelineCounts[i]}</div>
                  <div className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em', marginTop: '0.75rem', color: colors[i], opacity: 0.8 }}>
                    {stage}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ paddingBottom: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                <Calendar size={18} className="text-secondary" /> 
              </div>
              Upcoming Drives
            </h3>
            <Link href="/dashboard/employer/calendar" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
              View Calendar <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', maxHeight: '300px', paddingRight: '0.5rem' }}>
            {upcomingDrives.map((drive) => (
              <div
                key={drive.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {drive.role}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={12} /> {drive.college} • {drive.type === 'virtual' ? 'Virtual' : 'On-Campus'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {formatDate(drive.date)}
                  </div>
                  <span className={`badge badge-${getStatusColor(drive.status)}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{formatStatus(drive.status)}</span>
                </div>
              </div>
            ))}
            {upcomingDrives.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}
              >
                <Calendar size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No upcoming drives scheduled.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
            <div style={{ background: 'white', padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <FileText size={18} className="text-secondary" />
            </div>
            Recent Applications
          </h3>
          <Link href="/dashboard/employer/applications" className="btn btn-ghost btn-sm" style={{ background: 'white' }}>
            View All Pipeline <ArrowRight size={14} />
          </Link>
        </div>
        {appsTotalCount > 0 ? (
          <DataTableToolbar
            search={appsSearch}
            onSearchChange={setAppsSearch}
            searchPlaceholder="Search candidate, role, or campus…"
            sort={appsSort}
            onSortChange={setAppsSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={appsFilteredCount}
            totalCount={appsTotalCount}
            hasActiveFilters={appsHasActiveFilters}
            onClear={clearAppsFilters}
            style={{ margin: '0 1.25rem 1rem', border: '1px solid var(--border-default)' }}
          />
        ) : null}
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr style={{ background: 'var(--bg-primary)' }}>
                <th style={{ paddingLeft: '1.5rem' }}>Candidate</th>
                <th>Role &amp; Campus</th>
                <th>CGPA</th>
                <th>Status</th>
                <th>Applied On</th>
                <th style={{ paddingRight: '1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRecentApplications.length === 0 && appsTotalCount > 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-secondary">
                    No applications match your search.
                  </td>
                </tr>
              ) : null}
              {displayRecentApplications.map((app) => (
                <tr key={app.id} style={{ transition: 'background 0.2s', ':hover': { background: 'var(--bg-secondary)' } }}>
                  <td style={{ paddingLeft: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {(() => {
                        const appName = String(app?.name || 'Student').trim() || 'Student';
                        const initials = appName.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <>
                            <div
                              className="avatar avatar-sm"
                              style={{
                                background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
                                color: 'var(--primary-700)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                border: '1px solid var(--primary-300)'
                              }}
                            >
                              {initials || 'S'}
                            </div>
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                              {appName}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span className="text-sm font-semibold">{app.role}</span>
                      <span className="text-xs text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Building2 size={10} /> {app.college}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {app.cgpa}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${getStatusColor(app.status)} badge-dot`} style={{ padding: '0.35rem 0.65rem' }}>{formatStatus(app.status)}</span>
                  </td>
                  <td className="text-sm text-secondary">{formatDate(app.appliedAt)}</td>
                  <td style={{ paddingRight: '1.5rem', textAlign: 'right' }}>
                    <Link
                      href={`/dashboard/employer/applications?jobId=${app.jobId}`}
                      className="btn btn-ghost btn-icon btn-sm"
                      title="View application details"
                      aria-label="View application details"
                    >
                      <Eye size={16} strokeWidth={2} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
              {appsTotalCount === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    No recent applications to review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
