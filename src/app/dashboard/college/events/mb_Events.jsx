'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { PartyPopper, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function mb_Events() {
  const { data, isLoading, error } = useSWR('/api/college/events', fetcher);
  const events = Array.isArray(data?.events) ? data.events : [];

  return (
    <>
      <MobileHeader title="Campus Events" />
      <div className="animate-fadeIn flex flex-col gap-3 px-4 pt-4 pb-20">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not load events</AlertTitle>
            <AlertDescription>{error.message || 'Could not load events.'}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && events.length === 0 && (
          <Card className="border-dashed py-10">
            <CardContent className="flex flex-col items-center px-6 text-center">
              <div className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-full">
                <CalendarDays className="size-6" />
              </div>
              <CardTitle className="mb-1 text-base">No events scheduled</CardTitle>
              <CardDescription>
              Create events from the{' '}
                <Link href="/dashboard/college/calendar" className="text-primary font-medium">calendar</Link>.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground m-0 text-sm">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
            {events.map((ev) => (
              <Card key={ev.id} className="gap-3 py-4">
                <CardContent className="flex flex-col gap-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-5">{ev.title || '—'}</CardTitle>
                    <StatusBadge tone={ev.is_blocking ? 'warning' : 'neutral'} showDot>
                      {ev.is_blocking ? 'Blocking' : 'Non-blocking'}
                    </StatusBadge>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                    <StatusBadge tone="info">{ev.event_type || 'event'}</StatusBadge>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" /> {ev.start_date ? formatDate(ev.start_date) : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
