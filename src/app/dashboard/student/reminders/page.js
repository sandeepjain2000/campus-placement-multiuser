'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Mail, CalendarClock, Building2, Bell } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import PageError from '@/components/PageError';
import DriveVenueUnconfirmedWarning from '@/components/student/DriveVenueUnconfirmedWarning';
import { formatDriveVenueForStudent } from '@/lib/driveVenueWarning';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load reminders');
  return json;
};

function toStartOfDay(dateLike) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

function describeWhen(date) {
  const today = toStartOfDay(new Date());
  const eventDay = toStartOfDay(date);
  const diffDays = Math.round((eventDay - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

export default function StudentEmailRemindersPage() {
  const { data, error, isLoading } = useSWR('/api/student/drives', fetcher);
  const drives = Array.isArray(data?.drives) ? data.drives : [];

  const reminders = useMemo(() => {
    const today = toStartOfDay(new Date());
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return drives
      .map((drive) => ({ ...drive, parsedDate: new Date(drive.date) }))
      .filter((drive) => {
        const day = toStartOfDay(drive.parsedDate);
        return day >= today && day <= sevenDaysLater;
      })
      .sort((a, b) => a.parsedDate - b.parsedDate)
      .map((drive) => ({
        id: drive.id,
        title: `${drive.company} drive`,
        when: `${describeWhen(drive.parsedDate)} · ${formatDate(drive.date)}`,
        role: drive.role,
        venue: drive.venue,
        date: drive.date,
        applied: drive.applied,
        detail: `${drive.role} · Venue: ${formatDriveVenueForStudent(drive.venue)}${drive.applied ? ' · You have already applied.' : ''}`,
      }));
  }, [drives]);

  if (error) return <PageError error={error} />;

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Mail className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            Reminders & Email Preview
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Reminder previews for upcoming companies, deadlines, and off-campus venues.
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/dashboard/student" />} nativeButton={false}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to Dashboard
        </Button>
      </div>

      <Alert>
        <Bell aria-hidden="true" />
        <AlertTitle>Preview Inbox</AlertTitle>
        <AlertDescription>No email is sent from this screen.</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell aria-hidden="true" /> Sample Notification
          </CardTitle>
          <CardDescription>An example of the reminder you might receive.</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="bg-muted/40 border-border rounded-lg border border-dashed p-4">
          <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Subject</div>
          <div className="text-foreground mb-4 font-semibold">[PlacementHub] Reminder: TechCorp Visit Tomorrow</div>
          <div className="text-sm leading-relaxed">
            Hi,
            <br />
            <br />
            This is a reminder for your upcoming placement drive.
            <br />
            Check your <Link href="/dashboard/student/interviews">interviews</Link> and <Link href="/dashboard/student/drives">drives</Link> for the latest.
          </div>
        </div>
        </CardContent>
      </Card>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-foreground m-0 text-lg font-semibold">Upcoming Reminders</h2>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">Drives scheduled during the next 7 days.</p>
        </div>
      </div>
      <div className="grid gap-3">
        {isLoading && <Card className="h-32 animate-pulse" aria-label="Loading reminders" />}
        {!isLoading && reminders.length === 0 && (
          <Card size="sm">
            <CardContent className="text-muted-foreground py-6 text-center">No upcoming drives in the next 7 days.</CardContent>
          </Card>
        )}
        {!isLoading && reminders.map((r) => (
          <Card key={r.id} size="sm">
            <CardContent className="flex items-start gap-3">
            <CalendarClock className="text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-foreground font-medium">{r.title}</div>
              <div className="text-muted-foreground mt-1 text-sm">{r.when}</div>
              <p className="mt-2 mb-0 text-sm leading-relaxed">
                {r.detail}
              </p>
              <DriveVenueUnconfirmedWarning venue={r.venue} driveDate={r.date} />
            </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <Building2 aria-hidden="true" />
        <AlertTitle>Delivery Preferences</AlertTitle>
        <AlertDescription>
          When email delivery is enabled, preferences from your <Link href="/dashboard/student/profile">profile</Link> (college vs personal email) will control where these reminders go.
        </AlertDescription>
      </Alert>
    </div>
  );
}
