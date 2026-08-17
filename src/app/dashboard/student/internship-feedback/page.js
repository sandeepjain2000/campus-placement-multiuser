'use client';

import useSWR from 'swr';
import { MessageSquareText } from 'lucide-react';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import InternshipFeedbackForm from '@/components/internship/InternshipFeedbackForm';
import InternshipGuideForm from '@/components/internship/InternshipGuideForm';
import InternshipSupervisorForm from '@/components/internship/InternshipSupervisorForm';
import { useToast } from '@/components/ToastProvider';
import { formatDate, formatStatus } from '@/lib/utils';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function StudentInternshipFeedbackPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/student/internship-feedback', fetcher);
  const [savingId, setSavingId] = useState(null);

  const items = Array.isArray(data?.items) ? data.items : [];

  const submitFeedback = async (programApplicationId, payload) => {
    setSavingId(programApplicationId);
    try {
      const res = await fetch('/api/student/internship-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Progress review saved.', 'success');
      await mutate();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) return <PageLoading message="Loading internships…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn flex max-w-4xl flex-col gap-4">
      <div className="min-w-0">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <MessageSquareText className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
          Internship Progress Reviews
        </h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm leading-relaxed">
          Share progress reviews for internships where you were selected or are in progress.
        </p>
      </div>

      {error ? <Alert variant="destructive"><AlertTitle>Could not load internships</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert> : null}

      {!error && items.length === 0 ? <Card><CardContent className="text-muted-foreground py-10 text-center">No selected internships yet. After you are selected, return here to submit a progress review.</CardContent></Card> : null}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <Card key={item.programApplicationId}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div><CardTitle><CompanyNameLink name={item.companyName} website={item.website} /></CardTitle><CardDescription className="mt-1">{item.openingTitle}</CardDescription></div>
              <StatusBadge tone={item.status === 'selected' ? 'green' : 'amber'} showDot>{formatStatus(item.status) || '—'}</StatusBadge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
            {item.feedback?.updatedAt ? (
              <p className="text-muted-foreground m-0 text-xs">
                Last updated {formatDate(item.feedback.updatedAt)}
                {item.feedback.rating ? ` · ${item.feedback.rating}/5` : ''}
              </p>
            ) : null}
            {item.guide ? (
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground mt-0 mb-2 text-xs font-semibold tracking-wide uppercase">Campus guide</p>
                <InternshipGuideForm initialGuide={item.guide} readOnly />
              </div>
            ) : null}
            {item.supervisor ? (
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground mt-0 mb-2 text-xs font-semibold tracking-wide uppercase">Company supervisor</p>
                <InternshipSupervisorForm initialSupervisor={item.supervisor} readOnly />
              </div>
            ) : null}
            <InternshipFeedbackForm
              initialRating={item.feedback?.rating}
              initialText={item.feedback?.feedbackText}
              saving={savingId === item.programApplicationId}
              onSubmit={(payload) => submitFeedback(item.programApplicationId, payload)}
            />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
