'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import { MessageSquareText } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import InternshipFeedbackForm from '@/components/internship/InternshipFeedbackForm';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { useToast } from '@/components/ToastProvider';
import { formatStatus } from '@/lib/utils';

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
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <MessageSquareText size={26} aria-hidden />
            Internship Progress Reviews
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Record progress reviews for selected or in-progress interns. Student submissions appear read-only when shared.
          </p>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: '1.5rem', color: 'var(--danger-600)' }}>{error.message}</div>
      ) : null}

      <div className="card table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Internship</th>
                <th>Status</th>
                <th>Student review</th>
                <th>Your review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <Fragment key={row.programApplicationId}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                      <div className="text-xs text-secondary">{row.rollNumber || row.systemId}</div>
                    </td>
                    <td>{row.openingTitle}</td>
                    <td>{formatStatus(row.status)}</td>
                    <td style={{ maxWidth: '220px' }}>
                      {row.studentFeedback ? (
                        <span className="text-sm">
                          {row.studentFeedback.rating ? `${row.studentFeedback.rating}/5 · ` : ''}
                          {String(row.studentFeedback.feedbackText).slice(0, 80)}
                          {row.studentFeedback.feedbackText.length > 80 ? '…' : ''}
                        </span>
                      ) : (
                        <span className="text-secondary text-sm">—</span>
                      )}
                    </td>
                    <td>
                      {row.employerFeedback ? (
                        <span className="text-sm text-success-700">Submitted</span>
                      ) : (
                        <span className="text-sm text-secondary">Pending</span>
                      )}
                    </td>
                    <td>
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
                    </td>
                  </tr>
                  {expandedId === row.programApplicationId ? (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--bg-secondary)', padding: '1rem 1.25rem' }}>
                        {row.studentFeedback ? (
                          <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.35rem' }}>Student review</div>
                            <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{row.studentFeedback.feedbackText}</p>
                          </div>
                        ) : null}
                        <InternshipFeedbackForm
                          initialRating={row.employerFeedback?.rating}
                          initialText={row.employerFeedback?.feedbackText}
                          saving={savingId === row.programApplicationId}
                          onSubmit={(payload) => submitFeedback(row.programApplicationId, payload)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {!error && items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No selected interns yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
