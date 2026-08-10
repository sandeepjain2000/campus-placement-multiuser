'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircleQuestion, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ToastProvider';
import { publicJobPostPath } from '@/lib/opportunityPublicLinks';

export default function PublicJobQuestionsPage({ params }) {
  const jobId = params?.id;
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/jobs/${encodeURIComponent(jobId)}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not submit question');
      setSubmitted(true);
      addToast('Question submitted. The employer or placement office will respond on clarifications.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header style={{ borderBottom: '1px solid var(--border-default)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <Link
            href={publicJobPostPath(jobId)}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden /> Back to job
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <MessageCircleQuestion size={22} className="text-secondary" aria-hidden />
          <Badge variant="secondary">Applicant questions</Badge>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
          Ask about this job
        </h1>
        <p className="text-secondary" style={{ margin: '0 0 1.5rem', lineHeight: 1.6 }}>
          External applicants can post a question here. It is routed to the employer and placement office clarifications board.
        </p>

        {submitted ? (
          <Alert>
            <MessageCircleQuestion aria-hidden />
            <AlertTitle>Question submitted</AlertTitle>
            <AlertDescription>
              Thank you — your question was submitted. Responses appear on the campus clarifications board when answered.
            </AlertDescription>
            <Link href={publicJobPostPath(jobId)} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-3' })}>
              Return to job post
            </Link>
          </Alert>
        ) : (
          <form onSubmit={submit}>
          <Card>
            <CardContent>
            <FieldGroup>
            <Field>
              <FieldLabel htmlFor="public-q-name">Your name</FieldLabel>
              <Input
                id="public-q-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="public-q-email">Your email</FieldLabel>
              <Input
                id="public-q-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="public-q-text">Question</FieldLabel>
              <Textarea
                id="public-q-text"
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Eligibility, interview process, relocation, etc."
                required
              />
            </Field>
            </FieldGroup>
            </CardContent>
            <CardFooter>
            <Button
              type="submit"
              disabled={submitting}
            >
              <Send data-icon="inline-start" aria-hidden />
              {submitting ? 'Sending…' : 'Submit question'}
            </Button>
            </CardFooter>
          </Card>
          </form>
        )}
      </main>
    </div>
  );
}
