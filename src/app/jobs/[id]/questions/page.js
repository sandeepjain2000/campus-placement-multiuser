'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircleQuestion, Send } from 'lucide-react';
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
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} aria-hidden /> Back to job
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <MessageCircleQuestion size={22} className="text-secondary" aria-hidden />
          <span className="badge badge-blue">Applicant questions</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
          Ask about this job
        </h1>
        <p className="text-secondary" style={{ margin: '0 0 1.5rem', lineHeight: 1.6 }}>
          External applicants can post a question here. It is routed to the employer and placement office clarifications board.
        </p>

        {submitted ? (
          <div className="card" style={{ padding: '1.5rem' }}>
            <p style={{ margin: 0 }}>
              Thank you — your question was submitted. Responses appear on the campus clarifications board when answered.
            </p>
            <Link href={publicJobPostPath(jobId)} className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
              Return to job post
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="public-q-name">Your name</label>
              <input
                id="public-q-name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="public-q-email">Your email</label>
              <input
                id="public-q-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="public-q-text">Question</label>
              <textarea
                id="public-q-text"
                className="form-input"
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Eligibility, interview process, relocation, etc."
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Send size={16} aria-hidden />
              {submitting ? 'Sending…' : 'Submit question'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
