'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { Activity, BarChart2, Building2, CheckCircle, ClipboardList, Download, FileText, GraduationCap, MapPin, Pencil, Plus, Target, TrendingUp, Users, Zap } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import PageLoading from '@/components/PageLoading';
import { SOCIAL_PLATFORM_ORDER } from '@/components/SocialIcons';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { getCurrentAcademicYear } from '@/lib/academicYear';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load college dashboard');
  return json;
};

function rupeesToLpaLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const lpa = amount / 100_000;
  return `₹${lpa.toFixed(lpa >= 100 ? 0 : lpa >= 10 ? 1 : 2)} LPA`;
}

function rupeesAmountLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function CollegeOverviewView({ mobile = false }) {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/dashboard', fetcher);
  const { data: settingsData } = useSWR('/api/college/settings', fetcher);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncYear = () => {
      const saved = window.sessionStorage.getItem('activeAcademicYear');
      if (saved) setAcademicYear(saved);
    };
    syncYear();
    window.addEventListener('placementhub-academic-year', syncYear);
    return () => window.removeEventListener('placementhub-academic-year', syncYear);
  }, []);

  const stats = data?.stats ?? { totalStudents: 0, placedStudents: 0, placementRate: 0, activeEmployers: 0, activeDrives: 0, avgPackage: 0, highestPackage: 0, minJobAmount: 0, minInternshipAmount: 0 };
  const departmentStats = Array.isArray(data?.departmentStats) ? data.departmentStats : [];
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const pendingActions = data?.pendingActions ?? { drivesCount: 0, studentsCount: 0, documentsCount: 0 };
  const pendingTotal = pendingActions.drivesCount + pendingActions.studentsCount + pendingActions.documentsCount;

  const exportOverview = () => {
    const payload = { stats, departmentStats, recentActivity, pendingActions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'college_overview_export.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    addToast('Overview exported.', 'success');
  };

  const exportButton = <Button variant="outline" size={mobile ? 'icon-sm' : 'default'} onClick={exportOverview} aria-label={mobile ? 'Export overview' : undefined}><Download data-icon="inline-start" />{mobile ? null : 'Export'}</Button>;

  if (error) {
    const failure = <Alert variant="destructive"><Activity aria-hidden /><AlertTitle>Dashboard data is unavailable</AlertTitle><AlertDescription>{error.message}</AlertDescription><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => mutate()}>Retry</Button><Button variant="outline" render={<Link href="/dashboard/college/students" />}>Open students</Button></div></Alert>;
    return mobile ? <><MobileHeader title="Dashboard" /><div className="px-4 py-4">{failure}</div></> : failure;
  }
  if (isLoading || !data) {
    return mobile ? <><MobileHeader title="Dashboard" /><div className="px-4 py-4"><PageLoading message="Loading college overview…" variant="skeleton-card" inline /></div></> : <PageLoading message="Loading college overview…" variant="skeleton-dashboard" />;
  }

  const social = settingsData?.social || {};
  const hasSocialLink = SOCIAL_PLATFORM_ORDER.some(({ id }) => String(social[id] || '').trim());
  const address = settingsData?.address || {};
  const addressLine = [address.address, [address.city, address.state].filter(Boolean).join(', '), address.pincode].filter(Boolean).join(' · ');
  const accreditation = settingsData?.accreditation || {};
  const showcase = settingsData?.institutionShowcase || {};
  const officer = settingsData?.placementOfficer || {};
  const officerLine = [officer.name, officer.designation].filter((value) => String(value || '').trim()).join(' · ');
  const collegeName = (settingsData?.institution?.collegeName || '').trim() || session?.user?.tenantName?.trim() || 'Your institution';
  const season = (settingsData?.placementSeasonLabel || '').trim() || academicYear;

  const main = (
    <main className="flex flex-col gap-6 pb-12">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">Placement season {season}</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{collegeName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/college/settings" />}><Pencil data-icon="inline-start" />Edit settings</Button>
            {hasSocialLink ? SOCIAL_PLATFORM_ORDER.map(({ id, label, Icon }) => {
              const value = String(social[id] || '').trim();
              if (!value) return null;
              return <Button key={id} variant="ghost" size="icon-sm" render={<a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" title={label} />}><Icon /></Button>;
            }) : null}
          </div>
        </div>
        <div className="flex gap-2">{exportButton}<Button render={<Link href="/dashboard/college/drives" />}><Plus data-icon="inline-start" />Schedule drive</Button></div>
      </header>

      <Card>
        <CardHeader><CardTitle>Placement pulse</CardTitle><CardDescription>Current operating totals and season outcomes.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
          {[
            ['Total students', stats.totalStudents, Users],
            ['Students placed', stats.placedStudents, CheckCircle],
            ['Active employers', stats.activeEmployers, Building2],
            ['Active drives', stats.activeDrives, Target],
          ].map(([label, value, Icon]) => (
            <div key={label} className="flex items-center gap-3 p-4 first:pl-0"><Icon className="text-muted-foreground" aria-hidden /><div><div className="text-xl font-semibold">{value}</div><div className="text-muted-foreground text-xs">{label}</div></div></div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          ['Placement rate', `${stats.placementRate}%`, `${stats.placedStudents} of ${stats.totalStudents} students placed`],
          ['Average package', rupeesToLpaLabel(stats.avgPackage) || '—', `Minimum job: ${rupeesAmountLabel(stats.minJobAmount) || '—'}`],
          ['Highest package', rupeesToLpaLabel(stats.highestPackage) || '—', `Minimum internship: ${rupeesAmountLabel(stats.minInternshipAmount) || '—'}`],
        ].map(([label, value, description]) => <Card key={label}><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader><CardContent className="text-muted-foreground text-sm">{description}</CardContent></Card>)}
      </div>

      {pendingTotal > 0 ? (
        <Alert><Zap aria-hidden /><AlertTitle className="flex items-center gap-2">Pending actions <StatusBadge tone="amber" showDot>{pendingTotal} items</StatusBadge></AlertTitle><AlertDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingActions.drivesCount > 0 ? <Button variant="outline" onClick={() => addToast('Review drives is not available yet in this build.', 'info')}><ClipboardList data-icon="inline-start" />{pendingActions.drivesCount} drives</Button> : null}
            {pendingActions.studentsCount > 0 ? <Button variant="outline" render={<Link href="/dashboard/college/students" />}><GraduationCap data-icon="inline-start" />{pendingActions.studentsCount} students</Button> : null}
            {pendingActions.documentsCount > 0 ? <Button variant="outline" onClick={() => addToast('Review documents is not available yet in this build.', 'info')}><FileText data-icon="inline-start" />{pendingActions.documentsCount} documents</Button> : null}
          </div>
        </AlertDescription></Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText aria-hidden />Institution profile</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4">
          {[['NAAC grade', accreditation.naacGrade || '—'], ['NIRF rank', accreditation.nirfRank || '—'], ['Accreditation', accreditation.body || '—'], ['Patents', showcase.patentCount || '—'], ['Startups', showcase.startupCount || '—']].map(([label, value]) => <div key={label}><div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div><div className="font-medium">{value}</div></div>)}
          {addressLine ? <div className="col-span-2 flex gap-2"><MapPin className="text-muted-foreground" aria-hidden /><span>{addressLine}</span></div> : null}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users aria-hidden />Placement team</CardTitle><CardDescription>Primary campus placement contact.</CardDescription></CardHeader><CardContent><p className="font-medium">{officerLine || 'No placement officer on file'}</p>{officer.email ? <a className="text-primary mt-1 inline-block underline-offset-4 hover:underline" href={`mailto:${encodeURIComponent(officer.email.trim())}`}>{officer.email.trim()}</a> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 aria-hidden />Department-wise placement</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
          {departmentStats.map((row) => <div key={row.dept}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{row.dept}</span><span className="text-muted-foreground">{row.placed}/{row.total} ({row.pct}%)</span></div><div className="bg-muted h-2 rounded-full"><div className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${Math.min(100, row.pct)}%` }} /></div></div>)}
          {!departmentStats.length ? <p className="text-muted-foreground text-sm">No department data yet.</p> : null}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity aria-hidden />Recent activity</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
          {recentActivity.map((item, index) => <div key={`${item.text}-${index}`} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0"><TrendingUp className="text-muted-foreground" aria-hidden /><div><div className="font-medium">{item.text}</div><div className="text-muted-foreground text-xs">{item.time}</div></div></div>)}
          {!recentActivity.length ? <p className="text-muted-foreground text-sm">No recent activity.</p> : null}
        </CardContent></Card>
      </div>
    </main>
  );

  return mobile ? <><MobileHeader title="Dashboard" action={exportButton} /><div className="px-4 pb-20 pt-4">{main}</div></> : main;
}
