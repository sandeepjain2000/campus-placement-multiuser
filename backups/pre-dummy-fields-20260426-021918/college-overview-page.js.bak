'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { Users, CheckCircle, Building2, Target, BarChart2, Activity, Zap, ClipboardList, GraduationCap, FileText, Download, Plus } from 'lucide-react';
import { DashboardSocialWireframeDock, SocialWireframeModal } from '@/components/wireframe/SocialWireframeToolkit';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Failed to load college dashboard');
  }
  return json;
};

export default function CollegeOverviewPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/dashboard', fetcher);
  const [socialModalPlatform, setSocialModalPlatform] = useState(null);

  const exportOverview = () => {
    const payload = {
      stats,
      departmentStats,
      recentActivity,
      pendingActions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'college_overview_export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast('Overview exported.', 'success');
  };

  if (error) {
    return (
      <div className="animate-fadeIn">
        <div className="card" style={{ maxWidth: '52rem', margin: '2rem auto', textAlign: 'left' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} className="text-warning-600" />
              Dashboard data not available yet
            </h3>
          </div>
          <p className="text-secondary" style={{ marginBottom: '1rem' }}>
            We could not load live college dashboard metrics right now. Add core records first, then retry.
          </p>
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            <strong>Required data:</strong> users, student profiles, placement drives, and accepted offers.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => mutate()}>
              Retry
            </button>
            <Link href="/dashboard/college/students" className="btn btn-secondary">
              Open Students
            </Link>
            <Link href="/dashboard/college/drives" className="btn btn-secondary">
              Open Drives
            </Link>
          </div>
          <p className="text-xs text-tertiary" style={{ marginTop: '0.75rem' }}>
            {error?.message || 'Failed to load college dashboard data'}
          </p>
        </div>
      </div>
    );
  }

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

  const stats = data?.stats ?? {
    totalStudents: 0,
    placedStudents: 0,
    placementRate: 0,
    activeEmployers: 0,
    activeDrives: 0,
    avgPackage: 0,
    highestPackage: 0,
  };
  const departmentStats = Array.isArray(data?.departmentStats) ? data.departmentStats : [];
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const pendingActions = data?.pendingActions ?? {
    drivesCount: 0,
    studentsCount: 0,
    documentsCount: 0,
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 className="text-secondary" /> College Dashboard
          </h1>
          <p className="text-secondary">
            {session?.user?.tenantName || 'Indian Institute of Technology, Mumbai'} • Placement Season 2026-27
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={exportOverview}>
            <Download size={16} /> Export
          </button>
          <Link href="/dashboard/college/drives" className="btn btn-primary">
            <Plus size={16} /> Schedule Drive
          </Link>
        </div>
      </div>

      <DashboardSocialWireframeDock onOpen={setSocialModalPlatform} />
      <SocialWireframeModal
        platform={socialModalPlatform}
        contextTitle="the college dashboard"
        onClose={() => setSocialModalPlatform(null)}
      />

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stats-card">
          <div className="stats-card-icon indigo">
            <Users size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.totalStudents}</div>
          <div className="stats-card-label">Total Students</div>
        </div>
        <div className="stats-card green">
          <div className="stats-card-icon green">
            <CheckCircle size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.placedStudents}</div>
          <div className="stats-card-label">Students Placed</div>
          <div className="stats-card-change up">↑ {stats.placementRate}% placed</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-card-icon amber">
            <Building2 size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.activeEmployers}</div>
          <div className="stats-card-label">Active Employers</div>
        </div>
        <div className="stats-card blue">
          <div className="stats-card-icon blue">
            <Target size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.activeDrives}</div>
          <div className="stats-card-label">Active Drives</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stats-card" style={{ textAlign: 'center' }}>
          <div className="stats-card-label">Placement Rate</div>
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, var(--success-500), var(--primary-500))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {stats.placementRate}%
          </div>
          <div className="progress-bar" style={{ marginTop: '0.75rem' }}>
            <div className="progress-fill green" style={{ width: `${stats.placementRate}%` }} />
          </div>
        </div>
        <div className="stats-card" style={{ textAlign: 'center' }}>
          <div className="stats-card-label">Average Package</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-600)' }}>₹12.4 LPA</div>
          <div className="stats-card-change up" style={{ justifyContent: 'center' }}>
            ↑ 8.5% vs last year
          </div>
        </div>
        <div className="stats-card" style={{ textAlign: 'center' }}>
          <div className="stats-card-label">Highest Package</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-600)' }}>₹45 LPA</div>
          <div className="stats-card-change up" style={{ justifyContent: 'center' }}>
            ↑ 12% vs last year
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} className="text-secondary" /> Department-wise
            </h3>
          </div>
          {departmentStats.map((d) => (
            <div key={d.dept} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <span className="text-sm font-semibold">{d.dept}</span>
                <span className="text-sm text-secondary">
                  {d.placed}/{d.total} ({d.pct}%)
                </span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${d.pct >= 80 ? 'green' : d.pct >= 50 ? '' : 'red'}`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} className="text-secondary" /> Recent Activity
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  padding: '0.5rem 0',
                  borderBottom: i < 4 ? '1px solid var(--border-default)' : 'none',
                }}
              >
                <div className={`stats-card-icon ${activity.color}`} style={{ width: 36, height: 36, flexShrink: 0, padding: 8 }}>
                  <Activity size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium">{activity.text}</div>
                  <div className="text-xs text-tertiary">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1', background: 'var(--bg-secondary)', borderColor: 'transparent' }}>
          <div className="card-header" style={{ marginBottom: '1rem', borderBottom: 'none', paddingBottom: 0 }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} className="text-warning-600" /> Pending Actions
            </h3>
            <span className="badge badge-amber">
              {pendingActions.drivesCount + pendingActions.studentsCount + pendingActions.documentsCount} items need attention
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {pendingActions.drivesCount > 0 && (
              <div className="card" style={{ flex: '1 1 280px', padding: '1rem', border: '1px solid var(--warning-200)' }}>
                <div className="font-semibold text-sm" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <ClipboardList size={16} className="text-warning-600" /> Drive Requests
                </div>
                <div className="text-xs text-secondary" style={{ margin: '0.5rem 0 1rem' }}>
                  {pendingActions.drivesCount} drive requests awaiting approval
                </div>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => showNotReady('Review drives')}>
                  Review Drives
                </button>
              </div>
            )}
            {pendingActions.studentsCount > 0 && (
              <div className="card" style={{ flex: '1 1 280px', padding: '1rem', border: '1px solid var(--warning-200)' }}>
                <div className="font-semibold text-sm" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <GraduationCap size={16} className="text-warning-600" /> Student Verification
                </div>
                <div className="text-xs text-secondary" style={{ margin: '0.5rem 0 1rem' }}>
                  {pendingActions.studentsCount} students awaiting profile verification
                </div>
                <Link href="/dashboard/college/students" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                  Review Students
                </Link>
              </div>
            )}
            {pendingActions.documentsCount > 0 && (
              <div className="card" style={{ flex: '1 1 280px', padding: '1rem', border: '1px solid var(--warning-200)' }}>
                <div className="font-semibold text-sm" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <FileText size={16} className="text-warning-600" /> Document Verification
                </div>
                <div className="text-xs text-secondary" style={{ margin: '0.5rem 0 1rem' }}>
                  {pendingActions.documentsCount} student documents need verification
                </div>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => showNotReady('Review documents')}>
                  Review Documents
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
