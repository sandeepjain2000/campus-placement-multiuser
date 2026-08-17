'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import { MessageSquareText } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import InternshipFeedbackForm from '@/components/internship/InternshipFeedbackForm';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { useToast } from '@/components/ToastProvider';
import { formatStatus } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function EmployerInternshipFeedbackPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/internship-feedback', fetcher);
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const items = Array.isArray(data?.items) ? data.items : [];

  const submitFeedback = async (programApplicationId, payload) => {
    setSavingId(programApplicationId);
    try {
      const res = await fetch('/api/employer/internship-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Intern progress review saved.', 'success');
      setExpandedId(null);
      await mutate();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) return <PageLoading message="Loading interns…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <MessageSquareText aria-hidden />
            Internship Progress Reviews
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Record progress reviews for selected or in-progress interns. Student submissions appear read-only when shared.
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-5">
          <CardTitle>Intern Reviews</CardTitle>
          <CardDescription>Review student feedback and record your assessment.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Internship</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Student Review</TableHead>
                <TableHead>Your Review</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((row) => (
                <Fragment key={row.programApplicationId}>
                  <TableRow>
                    <TableCell>
                      <div className="font-semibold">{row.studentName}</div>
                      <div className="text-muted-foreground text-xs">{row.rollNumber || row.systemId}</div>
                    </TableCell>
                    <TableCell>{row.openingTitle}</TableCell>
                    <TableCell><StatusBadge status={row.status} showDot>{formatStatus(row.status) || '—'}</StatusBadge></TableCell>
                    <TableCell className="max-w-56">
                      {row.studentFeedback ? (
                        <span className="text-sm">
                          {row.studentFeedback.rating ? `${row.studentFeedback.rating}/5 · ` : ''}
                          {String(row.studentFeedback.feedbackText).slice(0, 80)}
                          {row.studentFeedback.feedbackText.length > 80 ? '…' : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={row.employerFeedback ? 'completed' : 'pending'} showDot>{row.employerFeedback ? 'Submitted' : 'Pending'}</StatusBadge></TableCell>
                    <TableCell className="text-right">
                      <StandardTableIconAction
                        action={expandedId === row.programApplicationId ? 'close' : row.employerFeedback ? 'edit' : 'add'}
                        onClick={() =>
                          setExpandedId(expandedId === row.programApplicationId ? null : row.programApplicationId)
                        }
                        tooltip={
                          expandedId === row.programApplicationId
                            ? 'Close review form'
                            : row.employerFeedback
                              ? 'Edit your review'
                              : 'Add your review'
                        }
                      />
                    </TableCell>
                  </TableRow>
                  {expandedId === row.programApplicationId ? (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-5">
                        {row.studentFeedback ? (
                          <div className="mb-4 rounded-lg border bg-background p-3">
                            <div className="mb-1 text-sm font-semibold">Student Review</div>
                            <p className="whitespace-pre-wrap text-sm">{row.studentFeedback.feedbackText}</p>
                          </div>
                        ) : null}
                        <InternshipFeedbackForm
                          initialRating={row.employerFeedback?.rating}
                          initialText={row.employerFeedback?.feedbackText}
                          saving={savingId === row.programApplicationId}
                          onSubmit={(payload) => submitFeedback(row.programApplicationId, payload)}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
              {!error && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-28 text-center">
                    No selected interns yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
