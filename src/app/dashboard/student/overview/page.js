'use client';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { FileEdit, CheckCircle, Award, Target, Calendar, IndianRupee, Globe, Building, ArrowRight, ClipboardList } from 'lucide-react';
import { formatDate, formatStatus } from '@/lib/utils';
import PageError from '@/components/PageError';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { ALUMNI_BROWSE_JOBS_PATH, ALUMNI_MY_JOBS_PATH } from '@/lib/alumniRoutes';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

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

  if (error) {
    return (
      <PageError
        error={error}
        reset={() => mutate()}
        fallbackMessage="Unable to load dashboard statistics at this time. Please try again."
      />
    );
  }

  if (isLoading || !data) {
    return <PageLoading message="Loading your overview…" variant="skeleton-dashboard" />;
  }

  const { stats, recentDrives, applications } = data;
  const isAlumni = Boolean(data.isAlumni ?? session?.user?.isAlumni);

  const statCards = [
    { label: 'Applications', value: stats.totalApplications, icon: FileEdit },
    { label: 'Shortlisted', value: stats.shortlisted, icon: CheckCircle },
    { label: 'Offers Received', value: stats.offersReceived, icon: Award },
    { label: isAlumni ? 'Alumni Jobs' : 'Upcoming Drives', value: stats.upcomingDrives, icon: Target },
  ];

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 text-2xl font-semibold tracking-tight">
            Welcome Back, {session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            {isAlumni ? 'Your alumni job search at a glance.' : 'Your placement journey at a glance.'}
          </p>
        </div>
        <Button render={<Link href={isAlumni ? ALUMNI_BROWSE_JOBS_PATH : '/dashboard/student/drives'} />} nativeButton={false}>
          {isAlumni ? 'Browse Alumni Jobs' : 'Browse Drives'}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardAction className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                <Icon aria-hidden="true" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-foreground text-3xl font-semibold tabular-nums">{value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
          <CardDescription>Complete your profile to improve your chances.</CardDescription>
          <CardAction className="text-foreground text-2xl font-semibold tabular-nums">{stats.profileCompletion}%</CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="bg-muted h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={stats.profileCompletion} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
            <div className="bg-primary h-full rounded-full transition-[width]" style={{ width: `${stats.profileCompletion}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(stats.profileCompletionItems || []).map((item) => (
              <Link key={item.id} href="/dashboard/student/profile">
                <StatusBadge tone={item.complete ? 'green' : 'amber'} showDot>
                  {item.complete ? `${item.label} ✓` : item.incompleteLabel}
                </StatusBadge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="border-border border-b py-4">
            <CardTitle className="flex items-center gap-2"><Calendar aria-hidden="true" /> {isAlumni ? 'Alumni Jobs' : 'Upcoming Drives'}</CardTitle>
            <CardDescription>{isAlumni ? 'Published roles for your network.' : 'Drives you can apply to.'}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href={isAlumni ? ALUMNI_BROWSE_JOBS_PATH : '/dashboard/student/drives'} />} nativeButton={false}>
                View All <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-border divide-y p-0">
            {recentDrives.map((drive) => (
              <div key={drive.id} className="hover:bg-muted/40 flex flex-col gap-2 px-6 py-4 transition-colors">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h3 className="m-0 truncate font-medium"><CompanyNameLink name={drive.company} website={drive.website} /></h3>
                  <StatusBadge status={drive.status}>{formatStatus(drive.status) || 'Open'}</StatusBadge>
                </div>
                <p className="text-muted-foreground m-0 truncate text-sm">{drive.role}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><Calendar aria-hidden="true" /> {formatDate(drive.date)}</span>
                  <span className="flex items-center gap-1"><IndianRupee aria-hidden="true" /> {drive.salary}</span>
                  <StatusBadge tone={drive.type === 'virtual' || drive.type === 'alumni_job' ? 'blue' : 'indigo'}>
                    {drive.type === 'alumni_job' ? 'Alumni Role' : drive.type === 'virtual' ? <><Globe aria-hidden="true" /> Virtual</> : <><Building aria-hidden="true" /> On-Campus</>}
                  </StatusBadge>
                </div>
                {drive.salaryWords ? <p className="text-muted-foreground m-0 text-xs">{drive.salaryWords}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-border border-b py-4">
            <CardTitle className="flex items-center gap-2"><ClipboardList aria-hidden="true" /> Recent Applications</CardTitle>
            <CardDescription>Track your application status.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href={isAlumni ? ALUMNI_MY_JOBS_PATH : '/dashboard/student/applications'} />} nativeButton={false}>
                View All <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-border divide-y p-0">
            {applications.map((app) => (
              <div key={app.id} className="hover:bg-muted/40 flex flex-col gap-2 px-6 py-4 transition-colors">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h3 className="m-0 truncate font-medium"><CompanyNameLink name={app.company} website={app.website} /></h3>
                  <StatusBadge status={app.status} showDot>{formatStatus(app.status) || 'Applied'}</StatusBadge>
                </div>
                <p className="text-muted-foreground m-0 truncate text-sm">{app.role}</p>
                <div className="text-muted-foreground flex justify-between gap-3 text-xs">
                  <span>Current: <strong className="text-foreground">{app.round}</strong></span>
                  <span>Applied {formatDate(app.appliedAt)}</span>
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <FileEdit className="text-muted-foreground size-8" aria-hidden="true" />
                <CardTitle>No Applications Yet</CardTitle>
                <CardDescription>{isAlumni ? 'Browse alumni jobs and start applying.' : 'Browse upcoming drives and start applying.'}</CardDescription>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
