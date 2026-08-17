'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { Settings, School, Building2, GraduationCap, Users, Activity, ChevronRight, Download } from 'lucide-react';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { downloadCsvFromRows, toCsvIsoDate } from '@/lib/csvExport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load admin overview');
  return json;
};

function OverviewEntityRow({ icon: Icon, name, href, activeLabel = 'Active' }) {
  return (
    <Link href={href} className="hover:bg-muted/50 flex items-center justify-between border-t px-6 py-4 transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full">
          <Icon className="size-4" />
        </div>
        <span className="text-primary text-sm font-semibold hover:underline">
          {name}
        </span>
      </div>
      <StatusBadge tone="green" showDot>{activeLabel}</StatusBadge>
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
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Settings className="text-muted-foreground size-7" strokeWidth={1.5} /> Platform Administration
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">PlacementHub Super Admin Dashboard</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={exportOverview}
        >
          <Download data-icon="inline-start" aria-hidden />
          Export CSV
        </Button>
      </div>

      <Card size="sm"><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Colleges', value: stats.colleges, icon: School, href: '/dashboard/admin/colleges' },
          { label: 'Employers', value: stats.employers, icon: Building2, href: '/dashboard/admin/employers' },
          { label: 'Students', value: stats.students, icon: GraduationCap },
          { label: 'Total users', value: stats.totalUsers, icon: Users },
        ].map(({ label, value, icon: Icon, href }) => {
          const content = <div className="bg-muted/50 flex items-center gap-3 rounded-lg border px-4 py-3"><Icon className="text-muted-foreground size-5" /><span className="text-sm font-medium">{label}</span><strong className="ml-auto font-mono text-xl">{value}</strong></div>;
          return href ? <Link key={label} href={href}>{content}</Link> : <div key={label}>{content}</div>;
        })}
      </CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2">
              <School size={18} className="text-secondary" /> Registered Colleges
            </CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/admin/colleges" />}>
              View All <ChevronRight size={14} />
            </Button>
          </CardHeader>
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
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 size={18} className="text-secondary" /> Registered Employers
            </CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/admin/employers" />}>
              View All <ChevronRight size={14} />
            </Button>
          </CardHeader>
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
        </Card>

        <Card className="gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b py-4"><CardTitle className="flex items-center gap-2">
              <Activity size={18} className="text-secondary" /> Platform Health
          </CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 py-4">
            <StatusBadge tone="amber">Coming soon</StatusBadge>
            <CardDescription>
              Real-time platform telemetry is not configured in this build yet.
              Connect monitoring sources before surfacing uptime/session/storage metrics.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="gray">No telemetry source configured</StatusBadge>
              <Button variant="ghost" size="sm" render={<Link href="/dashboard/admin/settings" />}>
                Configure platform settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
