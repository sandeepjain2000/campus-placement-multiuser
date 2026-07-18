'use client';

import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoading from '@/components/PageLoading';
import {
  STUDENT_OFFER_LETTER_ERRORS,
  resolveStudentOfferLetterErrorMessage,
} from '@/lib/studentOfferLetter';

class OfferLetterLoadError extends Error {
  constructor(status, code) {
    super(resolveStudentOfferLetterErrorMessage(status, code));
    this.name = 'OfferLetterLoadError';
    this.status = status;
    this.code = code;
  }
}

const fetcher = async (url) => {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new OfferLetterLoadError(0, 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new OfferLetterLoadError(res.status, data?.code);
  }
  if (!data?.letter) {
    throw new OfferLetterLoadError(404, 'NOT_FOUND');
  }
  return data;
};

function OfferLetterErrorState({ message }) {
  return (
    <div className="animate-fadeIn" style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <Link
        href="/dashboard/student/offers"
        className="btn btn-ghost btn-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> Back to My Offers
      </Link>
      <div
        className="card"
        style={{ padding: '1.5rem', borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }}
        role="alert"
      >
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: 'var(--danger-800)' }}>
          Offer letter unavailable
        </h1>
        <p style={{ margin: 0, color: 'var(--danger-700)', lineHeight: 1.55 }}>
          {message || STUDENT_OFFER_LETTER_ERRORS.LOAD_FAILED}
        </p>
      </div>
    </div>
  );
}

export default function StudentOfferLetterPage({ params }) {
  const { id } = use(params);
  const offerId = String(id || '').trim();
  const { data, error, isLoading } = useSWR(
    offerId ? `/api/student/offers/${encodeURIComponent(offerId)}/letter` : null,
    fetcher,
    {
      shouldRetryOnError: false,
      onErrorRetry: () => {},
    },
  );

  if (!offerId) {
    return <OfferLetterErrorState message={STUDENT_OFFER_LETTER_ERRORS.INVALID_ID} />;
  }

  if (isLoading) return <PageLoading message="Loading offer letter…" variant="skeleton-card" />;

  if (error || !data?.letter) {
    const message =
      error instanceof OfferLetterLoadError
        ? error.message
        : resolveStudentOfferLetterErrorMessage(error?.status, error?.code);
    return <OfferLetterErrorState message={message} />;
  }

  const letter = data.letter;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <Link
          href="/dashboard/student/offers"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <ArrowLeft size={16} /> Back to My Offers
        </Link>
        {letter.fileUrl ? (
          <a
            href={letter.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ExternalLink size={14} /> Open attached file
          </a>
        ) : null}
      </div>

      {letter.fileUnavailable ? (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--warning-200)',
            background: 'var(--warning-50)',
            color: 'var(--warning-800)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          {STUDENT_OFFER_LETTER_ERRORS.FILE_UNAVAILABLE}
        </div>
      ) : null}

      <div className="card" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <FileText size={22} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Offer letter
            </h1>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {letter.company} · {letter.role}
              {letter.salary != null && Number(letter.salary) > 0 ? ` · ${formatCurrency(letter.salary)}` : ''}
            </p>
            {letter.joiningDate ? (
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                Joining {formatDate(letter.joiningDate)}
              </p>
            ) : null}
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem 1.35rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            color: 'var(--text-primary)',
          }}
        >
          {letter.letterText}
        </div>

        {letter.letterSource === 'fallback' ? (
          <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            {STUDENT_OFFER_LETTER_ERRORS.FALLBACK_NOTICE}
          </p>
        ) : null}
      </div>
    </div>
  );
}
