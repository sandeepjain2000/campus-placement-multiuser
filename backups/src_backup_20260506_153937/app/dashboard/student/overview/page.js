'use client';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { FileEdit, CheckCircle, Award, Target, Calendar, IndianRupee, Globe, Building, ArrowRight, ClipboardList } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import PageError from '@/components/PageError';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to load dashboard');
  }
  return res.json();
};

export default function StudentOverviewPage() {
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR('/api/student/dashboard', fetcher);

  if (error) return <PageError error={error} reset={() => mutate()} />;

  if (isLoading || !data) {
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

  const { stats, recentDrives, applications } = data;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome back, {session?.user?.name?.split(' ')[0]} 👋</h1>
          <p>Here&apos;s your placement journey at a glance</p>
        </div>
        <Link href="/dashboard/student/drives" className="btn btn-primary">
          Browse Drives →
        </Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stats-card">
          <div className="stats-card-icon indigo">
            <FileEdit size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.totalApplications}</div>
          <div className="stats-card-label">Applications</div>
        </div>
        <div className="stats-card green">
          <div className="stats-card-icon green">
            <CheckCircle size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.shortlisted}</div>
          <div className="stats-card-label">Shortlisted</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-card-icon amber">
            <Award size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.offersReceived}</div>
          <div className="stats-card-label">Offers Received</div>
        </div>
        <div className="stats-card blue">
          <div className="stats-card-icon blue">
            <Target size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.upcomingDrives}</div>
          <div className="stats-card-label">Upcoming Drives</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Profile Completion</h4>
            <p className="text-sm text-secondary">Complete your profile to improve your chances</p>
          </div>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: stats.profileCompletion >= 80 ? 'var(--success-600)' : 'var(--warning-600)',
            }}
          >
            {stats.profileCompletion}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${stats.profileCompletion >= 80 ? 'green' : 'amber'}`}
            style={{ width: `${stats.profileCompletion}%` }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span className="badge badge-amber badge-dot">Add Skills</span>
          <span className="badge badge-amber badge-dot">Upload Resume</span>
          <span className="badge badge-green badge-dot">Education ✓</span>
          <span className="badge badge-green badge-dot">Personal Info ✓</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} className="text-secondary" /> Upcoming Drives
              </h3>
              <p className="card-subtitle">Drives you can apply to</p>
            </div>
            <Link href="/dashboard/student/drives" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentDrives.map((drive, index) => (
              <div
                key={drive.id}
                className="card-hover"
                style={{
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-default)',
                  background: 'var(--bg-primary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{drive.company}</h4>
                  <span className={`badge badge-${getStatusColor(drive.status)}`}>{formatStatus(drive.status)}</span>
                </div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
                  {drive.role}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {formatDate(drive.date)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IndianRupee size={14} /> {drive.salary}
                  </span>
                  <span className={`badge badge-${drive.type === 'virtual' ? 'blue' : 'indigo'}`} style={{ fontSize: '0.6875rem' }}>
                    {drive.type === 'virtual' ? (
                      <>
                        <Globe size={12} /> Virtual
                      </>
                    ) : (
                      <>
                        <Building size={12} /> On-Campus
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={18} className="text-secondary" /> Recent Applications
              </h3>
              <p className="card-subtitle">Track your application status</p>
            </div>
            <Link href="/dashboard/student/applications" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {applications.map((app, index) => (
              <div
                key={app.id}
                className="card-hover"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-default)',
                  background: 'var(--bg-primary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{app.company}</h4>
                  <span className={`badge badge-${getStatusColor(app.status)} badge-dot`}>{formatStatus(app.status)}</span>
                </div>
                <p className="text-sm text-secondary">{app.role}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    Current: <strong style={{ color: 'var(--text-primary)' }}>{app.round}</strong>
                  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>Applied {formatDate(app.appliedAt)}</span>
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                <div className="empty-state-icon" style={{ background: 'var(--bg-secondary)', color: 'var(--gray-400)' }}>
                  <FileEdit size={32} />
                </div>
                <div className="empty-state-title">No applications yet</div>
                <div className="empty-state-description">Browse upcoming drives and start applying!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
