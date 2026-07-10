'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Mail, CalendarClock, Building2, Bell } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import PageError from '@/components/PageError';

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
        detail: `${drive.role} at ${drive.venue || 'TBD'}${drive.applied ? ' · You have already applied.' : ''}`,
      }));
  }, [drives]);

  if (error) return <PageError error={error} />;

  return (
    <div style={{ minHeight: '100%', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/dashboard/student" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <span className="text-sm text-secondary">Preview inbox — no email is sent from this screen</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-600)',
          }}
        >
          <Mail size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Reminders & email preview</h1>
          <p className="text-sm text-secondary" style={{ margin: '0.25rem 0 0' }}>
            Reminder previews for upcoming companies, deadlines, and off-campus venues.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={18} /> Sample notification you might receive
        </h2>
        <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-tertiary)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Subject</div>
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>[PlacementHub] Reminder: TechCorp visit tomorrow</div>
          <div className="text-sm" style={{ lineHeight: 1.6 }}>
            Hi,
            <br />
            <br />
            This is a reminder for your upcoming placement drive.
            <br />
            Check your <Link href="/dashboard/student/interviews">interviews</Link> and <Link href="/dashboard/student/drives">drives</Link> for the latest.
          </div>
        </div>
      </div>

      <h2 className="text-sm font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
        Upcoming reminders
      </h2>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {isLoading && <div className="skeleton skeleton-card" style={{ height: 140 }} />}
        {!isLoading && reminders.length === 0 && (
          <div className="card" style={{ padding: '1rem' }}>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              No upcoming drives in the next 7 days.
            </p>
          </div>
        )}
        {!isLoading && reminders.map((r) => (
          <div key={r.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <CalendarClock size={20} className="text-tertiary" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div>
              <div style={{ fontWeight: 700 }}>{r.title}</div>
              <div className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>
                {r.when}
              </div>
              <p className="text-sm" style={{ margin: '0.5rem 0 0', lineHeight: 1.5 }}>
                {r.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Building2 size={22} color="var(--primary-600)" />
        <p className="text-sm text-secondary" style={{ margin: 0 }}>
          When email delivery is enabled, preferences from your <Link href="/dashboard/student/profile">profile</Link> (college vs personal email) will control where these reminders go.
        </p>
      </div>
    </div>
  );
}
