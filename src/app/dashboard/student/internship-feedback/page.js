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
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem', maxWidth: '880px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <MessageSquareText size={26} aria-hidden />
            Internship Progress Reviews
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Share progress reviews on internships where you were <strong>selected</strong> or <strong>in progress</strong>.
            Your placement office and employer can review submissions.
          </p>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: '1.5rem', color: 'var(--danger-600)' }}>{error.message}</div>
      ) : null}

      {!error && items.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            No selected internships yet. After you are selected, return here to submit a progress review.
          </p>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {items.map((item) => (
          <div key={item.programApplicationId} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>
                  <CompanyNameLink name={item.companyName} website={item.website} />
                </h3>
                <p className="text-sm text-secondary" style={{ margin: 0 }}>
                  {item.openingTitle}
                </p>
              </div>
              <span className={`badge badge-${item.status === 'selected' ? 'green' : 'amber'} badge-dot`}>
                {formatStatus(item.status)}
              </span>
            </div>
            {item.feedback?.updatedAt ? (
              <p className="text-xs text-tertiary" style={{ margin: '0 0 0.5rem' }}>
                Last updated {formatDate(item.feedback.updatedAt)}
                {item.feedback.rating ? ` · ${item.feedback.rating}/5` : ''}
              </p>
            ) : null}
            {item.guide ? (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p className="text-xs text-tertiary" style={{ margin: '0 0 0.35rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                  CAMPUS GUIDE
                </p>
                <InternshipGuideForm initialGuide={item.guide} readOnly />
              </div>
            ) : null}
            {item.supervisor ? (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p className="text-xs text-tertiary" style={{ margin: '0 0 0.35rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                  COMPANY SUPERVISOR
                </p>
                <InternshipSupervisorForm initialSupervisor={item.supervisor} readOnly />
              </div>
            ) : null}
            <InternshipFeedbackForm
              initialRating={item.feedback?.rating}
              initialText={item.feedback?.feedbackText}
              saving={savingId === item.programApplicationId}
              onSubmit={(payload) => submitFeedback(item.programApplicationId, payload)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
