'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, ExternalLink, MessageCircleQuestion } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { publicJobQuestionsPath } from '@/lib/opportunityPublicLinks';

export default function PublicJobPage({ params }) {
  const jobId = params?.id;
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Job not found');
        if (!cancelled) {
          setJob(data.job);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setJob(null);
          setError(e.message || 'Job not found');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const payText =
    job?.salaryMin != null || job?.salaryMax != null
      ? `${formatCurrency(job.salaryMin || job.salaryMax)}${
          job?.salaryMax != null &&
          job?.salaryMin != null &&
          Number(job.salaryMax) !== Number(job.salaryMin)
            ? ` – ${formatCurrency(job.salaryMax)}`
            : ''
        } /mo`
      : 'Not listed';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header style={{ borderBottom: '1px solid var(--border-default)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft data-icon="inline-start" aria-hidden /> PlacementHub
          </Link>
          <Link href="/login" className={buttonVariants({ size: 'sm' })}>
            Sign in
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '820px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {loading ? <p className="text-secondary">Loading job…</p> : null}
        {error ? (
          <Alert variant="destructive">
            <Briefcase aria-hidden />
            <AlertTitle>Job unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {job ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Briefcase size={22} className="text-secondary" aria-hidden />
              <Badge variant="secondary">Alumni job opening</Badge>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.35rem' }}>
              {job.title}
            </h1>
            <p className="text-secondary" style={{ margin: '0 0 1.5rem', fontSize: '1.05rem' }}>
              {job.companyName}
              {job.website ? (
                <>
                  {' '}
                  ·{' '}
                  <a
                    href={job.website.startsWith('http') ? job.website : `https://${job.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-link)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    Company site <ExternalLink size={14} aria-hidden />
                  </a>
                </>
              ) : null}
            </p>

            <Card className="mb-6">
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-secondary">Compensation</div>
                <div style={{ fontWeight: 600 }}>{payText}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Openings</div>
                <div style={{ fontWeight: 600 }}>{job.vacancies ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Apply by</div>
                <div style={{ fontWeight: 600 }}>
                  {job.applicationDeadline ? formatDate(job.applicationDeadline) : '—'}
                </div>
              </div>
              {job.workMode ? (
                <div>
                  <div className="text-xs text-secondary">Work mode</div>
                  <div style={{ fontWeight: 600 }}>{job.workMode}</div>
                </div>
              ) : null}
              </CardContent>
            </Card>

            {job.skillsRequired?.length > 0 ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="text-sm text-secondary" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                  Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {job.skillsRequired.map((skill) => (
                    <Badge key={skill} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <Card className="mb-6">
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {job.description?.trim() || 'No description provided.'}
              </p>
              </CardContent>
            </Card>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href={publicJobQuestionsPath(job.id)} className={buttonVariants()}>
                <MessageCircleQuestion data-icon="inline-start" aria-hidden />
                Post a question
              </Link>
              <Link href="/register" className={buttonVariants({ variant: 'outline' })}>
                Apply via PlacementHub
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
