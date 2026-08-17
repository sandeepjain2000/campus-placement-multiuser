'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Award } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { ppoStatusLabel } from '@/lib/internshipPpo';
import { formatDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function StudentInternshipPpoPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/student/internship-ppo', fetcher);
  const [busyId, setBusyId] = useState(null);

  const items = Array.isArray(data?.items) ? data.items : [];

  const respond = async (programApplicationId, action) => {
    setBusyId(programApplicationId);
    try {
      const res = await fetch('/api/student/internship-ppo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      addToast(json.message || 'Saved.', 'success');
      await mutate();
    } catch (e) {
      addToast(e.message || 'Failed to save', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <PageLoading message="Loading PPO…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="min-w-0">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <Award className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
          Internship PPO
        </h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm leading-relaxed">
          Respond when your employer confirms a pre-placement offer. A separate formal job offer may follow on{' '}
          <Link href="/dashboard/student/offers" className="text-foreground font-medium hover:underline">My Offers</Link>.
        </p>
      </div>

      {error ? <Alert variant="destructive"><AlertTitle>Could not load PPOs</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert> : null}

      <div className="flex flex-col gap-4">
        {items.map((row) => {
          const isBusy = busyId === row.programApplicationId;
          return (
            <Card key={row.programApplicationId} className="gap-0 overflow-hidden py-0">
              <CardHeader className="flex-row items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0"><CardTitle>{row.companyName}</CardTitle><CardDescription className="mt-1">{row.openingTitle}</CardDescription></div>
                <StatusBadge status={row.ppo?.status || 'pending'} tone={row.ppo?.status === 'accepted' ? 'green' : row.ppo?.status === 'declined' ? 'red' : 'blue'} showDot>{ppoStatusLabel(row.ppo?.status)}</StatusBadge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 border-t px-5 py-4">
                {row.internshipStartDate ? <p className="text-muted-foreground m-0 text-xs">Internship start: {formatDate(row.internshipStartDate)}</p> : null}
                {row.ppo?.employerNotes ? <div className="bg-muted/50 rounded-lg border p-3 text-sm whitespace-pre-wrap"><strong>Employer note:</strong> {row.ppo.employerNotes}</div> : null}
                {row.ppo?.confirmedAt ? <p className="text-muted-foreground m-0 text-xs">Confirmed {formatDate(row.ppo.confirmedAt)}</p> : null}
                {row.jobOfferIssued ? <Alert><AlertDescription>A formal job offer was issued — respond on <Link href="/dashboard/student/offers" className="font-medium underline">My Offers</Link>.</AlertDescription></Alert> : null}
              </CardContent>
              {row.canRespond ? <CardFooter className="gap-2 border-t px-5 py-3">
                <Button type="button" size="sm" disabled={isBusy} onClick={() => respond(row.programApplicationId, 'accept')}>Accept PPO</Button>
                <Button type="button" variant="destructive" size="sm" disabled={isBusy} onClick={() => { if (!window.confirm('Decline this PPO?')) return; respond(row.programApplicationId, 'decline'); }}>Decline PPO</Button>
              </CardFooter> : null}
            </Card>
          );
        })}

        {!error && items.length === 0 ? (
          <Card><CardContent className="text-muted-foreground py-10 text-center">No PPO confirmations yet. When an employer confirms one during or after your internship, it will appear here.</CardContent></Card>
        ) : null}
      </div>
    </div>
  );
}
