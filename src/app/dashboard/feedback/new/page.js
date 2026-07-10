'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { useToast } from '@/components/ToastProvider';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { MAX_FEEDBACK_TITLE_LENGTH } from '@/lib/validators';

const categories = ['Feature Request', 'Bug Report', 'General Feedback'];

export default function NewFeedbackPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Feature Request');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, title, {
      label: 'Feedback title',
      maxLength: MAX_FEEDBACK_TITLE_LENGTH,
    });
    if (titleErr) {
      addToast(titleErr, 'warning');
      return;
    }
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(body.error || 'Could not submit feedback', 'warning');
        return;
      }
      addToast('Thanks — your feedback was saved.', 'info');
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/feedback'));
      router.push('/dashboard/feedback');
    } catch {
      addToast('Network error. Try again.', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>New feedback</h1>
          <p>Describe a feature, bug, or general note for the Super Admin team.</p>
        </div>
        <Link href="/dashboard/feedback" className="btn btn-outline">
          Back to threads
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <h3 className="card-title">Submit</h3>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem', padding: '0.75rem 1rem 1rem' }}>
          <input className="form-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} />
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={submitting}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea className="form-input" placeholder="Describe your request or issue…" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Link href="/dashboard/feedback" className="btn btn-outline" aria-disabled={submitting}>
              Cancel
            </Link>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
