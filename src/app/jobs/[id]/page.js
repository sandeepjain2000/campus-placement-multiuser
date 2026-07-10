'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, ExternalLink, MessageCircleQuestion } from 'lucide-react';
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
          <Link href="/" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ArrowLeft size={16} aria-hidden /> PlacementHub
          </Link>
          <Link href="/login" className="btn btn-primary btn-sm">
            Sign in
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '820px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {loading ? <p className="text-secondary">Loading job…</p> : null}
        {error ? (
          <div className="card" style={{ padding: '1.5rem' }}>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        ) : null}

        {job ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Briefcase size={22} className="text-secondary" aria-hidden />
              <span className="badge badge-blue">Alumni job opening</span>
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

            <div
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1.25rem',
              }}
            >
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
            </div>

            {job.skillsRequired?.length > 0 ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="text-sm text-secondary" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                  Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {job.skillsRequired.map((skill) => (
                    <span key={skill} className="badge badge-gray">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div className="text-sm text-secondary" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                Description
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {job.description?.trim() || 'No description provided.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href={publicJobQuestionsPath(job.id)} className="btn btn-primary">
                <MessageCircleQuestion size={16} aria-hidden style={{ marginRight: '0.35rem' }} />
                Post a question
              </Link>
              <Link href="/register" className="btn btn-secondary">
                Apply via PlacementHub
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
