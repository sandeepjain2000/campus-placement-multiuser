'use client';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Briefcase, FileText, CheckCircle, Send, Users, Calendar, ArrowRight } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import PageError from '@/components/PageError';
import { useToast } from '@/components/ToastProvider';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EmployerOverviewPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const router = useRouter();
  const [activeCampus, setActiveCampus] = useState(null);

  const showNotReady = (label) => {
    addToast(`${label} is not available yet in this build.`, 'info');
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      const stored = sessionStorage.getItem('activeCampus');
      if (!stored) {
        router.replace('/dashboard/employer/select-campus');
      } else {
        setActiveCampus(JSON.parse(stored));
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [router]);

  const { data, error, isLoading } = useSWR(
    activeCampus ? `/api/employer/dashboard?campusId=${activeCampus.id}` : null,
    fetcher
  );

  if (error) return <PageError error={error} />;

  if (!activeCampus || isLoading || !data) {
    return (
      <div>
        <div className="skeleton skeleton-heading" />
        <div className="grid grid-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, recentApplications, upcomingDrives } = data;
  const pipelineCounts = [
    stats.totalApplications || 0,
    stats.shortlisted || 0,
    stats.interviewStage || 0,
    stats.selectedCount || 0,
  ];
  const acceptanceRate =
    stats.offersExtended > 0 ? Math.round(((stats.selectedCount || 0) / stats.offersExtended) * 100) : 0;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Welcome, {session?.user?.tenantName || session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-secondary text-sm">
            Managing recruitment for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{activeCampus.name}</strong>
          </p>
        </div>
        <Link href="/dashboard/employer/jobs" className="btn btn-primary">
          + Post New Job
        </Link>
      </div>

      <div className="directive-panel" style={{ marginBottom: '1.25rem' }} role="region" aria-label="Assessment map link">
        <p className="directive-panel__title">Assessment &amp; hiring results</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          Round results are maintained under Assessment uploads; Hiring Assessment is a read-only campus summary of the same data.{' '}
          <Link href="/dashboard/employer/assessment-summary" style={{ fontWeight: 600 }}>
            Open the Assessment map
          </Link>{' '}
          for a one-page guide.
        </p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stats-card">
          <div className="stats-card-icon indigo">
            <Briefcase size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.activeJobs}</div>
          <div className="stats-card-label">Active Jobs</div>
        </div>
        <div className="stats-card green">
          <div className="stats-card-icon green">
            <FileText size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.totalApplications}</div>
          <div className="stats-card-label">Total Applications</div>
          <div className="stats-card-change up">↑ 23 this week</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-card-icon amber">
            <CheckCircle size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.shortlisted}</div>
          <div className="stats-card-label">Shortlisted</div>
        </div>
        <div className="stats-card rose">
          <div className="stats-card-icon rose">
            <Send size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.offersExtended}</div>
          <div className="stats-card-label">Offers Extended</div>
          <div className="stats-card-change up">{acceptanceRate}% acceptance</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} className="text-secondary" /> Hiring Pipeline
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['Applied', 'Shortlisted', 'Interview', 'Selected'].map((stage, i) => {
              const colors = ['var(--info-600)', 'var(--primary-600)', 'var(--warning-600)', 'var(--success-600)'];
              const bgColors = [
                'rgba(2, 132, 199, 0.05)',
                'rgba(79, 70, 229, 0.05)',
                'rgba(217, 119, 6, 0.05)',
                'rgba(5, 150, 105, 0.05)',
              ];
              return (
                <div
                  key={stage}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: bgColors[i],
                  }}
                >
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: colors[i] }}>{pipelineCounts[i]}</div>
                  <div className="text-xs font-semibold" style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                    {stage}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} className="text-secondary" /> Upcoming Drives
            </h3>
            <Link href="/dashboard/employer/drives" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upcomingDrives.map((drive, index) => (
              <div
                key={drive.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.875rem 0',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-default)',
                }}
              >
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {drive.college} - {drive.role}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                    {formatDate(drive.date)} • {drive.type === 'virtual' ? 'Virtual' : 'On-Campus'}
                  </div>
                </div>
                <span className={`badge badge-${getStatusColor(drive.status)}`}>{formatStatus(drive.status)}</span>
              </div>
            ))}
            {upcomingDrives.length === 0 && (
              <div
                className="text-sm text-secondary"
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                No upcoming drives scheduled.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '0', overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} className="text-secondary" /> Recent Applications
          </h3>
          <Link href="/dashboard/employer/applications" className="btn btn-ghost btn-sm">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Role</th>
                <th>College</th>
                <th>CGPA</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentApplications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        className="avatar avatar-sm"
                        style={{
                          background: 'linear-gradient(135deg, var(--gray-100), var(--gray-200))',
                          color: 'var(--gray-700)',
                          fontWeight: 600,
                        }}
                      >
                        {app.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {app.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm font-medium">{app.role}</span>
                  </td>
                  <td>
                    <span className="text-sm text-secondary">{app.college}</span>
                  </td>
                  <td>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {app.cgpa}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${getStatusColor(app.status)} badge-dot`}>{formatStatus(app.status)}</span>
                  </td>
                  <td className="text-sm text-tertiary">{formatDate(app.appliedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <Link className="btn btn-ghost btn-sm" href="/dashboard/employer/applications">
                        View
                      </Link>
                      <button className="btn btn-primary btn-sm" onClick={() => showNotReady('Shortlist candidate')}>
                        Shortlist
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
