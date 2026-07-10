'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { Settings, School, Building2, GraduationCap, Users, Activity, ChevronRight, Download } from 'lucide-react';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { downloadCsvFromRows, toCsvIsoDate } from '@/lib/csvExport';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load admin overview');
  return json;
};

function OverviewEntityRow({ icon: Icon, name, href, activeLabel = 'Active' }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bg-primary)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background var(--transition-fast)',
      }}
      className="overview-entity-row"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <div className="avatar avatar-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <Icon size={16} />
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--primary-700, var(--primary-600))', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          {name}
        </span>
      </div>
      <span className="badge badge-green">{activeLabel}</span>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const { data, error, isLoading } = useSWR('/api/admin/dashboard', fetcher);

  if (error) return <PageError error={error} />;

  if (isLoading || !data) {
    return <PageLoading message="Loading admin overview…" variant="skeleton-dashboard" />;
  }

  const stats = data?.stats || { colleges: 0, employers: 0, students: 0, totalUsers: 0 };
  const registeredColleges = Array.isArray(data?.registeredColleges) ? data.registeredColleges : [];
  const registeredEmployers = Array.isArray(data?.registeredEmployers) ? data.registeredEmployers : [];

  const exportOverview = () => {
    const exportedAt = toCsvIsoDate(new Date());
    const rows = [
      ['Platform summary', 'Colleges', String(stats.colleges ?? 0)],
      ['Platform summary', 'Employers', String(stats.employers ?? 0)],
      ['Platform summary', 'Students', String(stats.students ?? 0)],
      ['Platform summary', 'Total users', String(stats.totalUsers ?? 0)],
      ['Platform summary', 'Exported at', exportedAt],
      ...registeredColleges.map((c) => ['Registered college', c.name || '—', 'Active']),
      ...registeredEmployers.map((e) => ['Registered employer', e.name || '—', 'Active']),
    ];
    downloadCsvFromRows('admin-platform-overview', ['Section', 'Label', 'Value'], rows);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={28} className="text-secondary" strokeWidth={1.5} /> Platform Administration
          </h1>
          <p className="text-secondary">PlacementHub Super Admin Dashboard</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={exportOverview}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Download size={16} aria-hidden />
          Export CSV
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/admin/colleges" className="stats-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stats-card-icon indigo">
            <School size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.colleges}</div>
          <div className="stats-card-label">Colleges</div>
        </Link>
        <Link href="/dashboard/admin/employers" className="stats-card green" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stats-card-icon green">
            <Building2 size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.employers}</div>
          <div className="stats-card-label">Employers</div>
        </Link>
        <div className="stats-card amber">
          <div className="stats-card-icon amber">
            <GraduationCap size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.students}</div>
          <div className="stats-card-label">Students</div>
        </div>
        <div className="stats-card blue">
          <div className="stats-card-icon blue">
            <Users size={24} strokeWidth={1.5} />
          </div>
          <div className="stats-card-value">{stats.totalUsers}</div>
          <div className="stats-card-label">Total Users</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <School size={18} className="text-secondary" /> Registered Colleges
            </h3>
            <Link href="/dashboard/admin/colleges" className="btn btn-ghost btn-sm">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {registeredColleges.length === 0 ? (
              <p className="text-sm text-secondary" style={{ padding: '1rem 1.5rem', margin: 0 }}>
                No colleges yet.
              </p>
            ) : (
              registeredColleges.map((c, index) => (
                <div
                  key={c.id || c.name}
                  style={index === 0 ? { borderTop: 'none' } : undefined}
                >
                  <OverviewEntityRow
                    icon={School}
                    name={c.name}
                    href={c.id ? `/dashboard/admin/colleges/${c.id}` : '/dashboard/admin/colleges'}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} className="text-secondary" /> Registered Employers
            </h3>
            <Link href="/dashboard/admin/employers" className="btn btn-ghost btn-sm">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {registeredEmployers.length === 0 ? (
              <p className="text-sm text-secondary" style={{ padding: '1rem 1.5rem', margin: 0 }}>
                No employers yet.
              </p>
            ) : (
              registeredEmployers.map((e, index) => (
                <div
                  key={e.id || e.name}
                  style={index === 0 ? { borderTop: 'none' } : undefined}
                >
                  <OverviewEntityRow
                    icon={Building2}
                    name={e.name}
                    href={e.id ? `/dashboard/admin/employers?view=${encodeURIComponent(e.id)}` : '/dashboard/admin/employers'}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} className="text-secondary" /> Platform Health
            </h3>
          </div>
          <div style={{ padding: '1rem 1.5rem 1.25rem' }}>
            <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>Coming soon</span>
            <div className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
              Real-time platform telemetry is not configured in this build yet.
              Connect monitoring sources before surfacing uptime/session/storage metrics.
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-gray">No telemetry source configured</span>
              <Link href="/dashboard/admin/settings" className="btn btn-ghost btn-sm">
                Configure platform settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
