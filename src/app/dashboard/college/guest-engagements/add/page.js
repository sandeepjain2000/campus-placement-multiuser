'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Mic } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

export default function CollegeGuestEngagementsAddPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    kind: 'guest_lecture',
    title: '',
    summary: '',
    requirements: '',
    timeHint: '',
    publishNow: false,
  });

  const create = async (e) => {
    e.preventDefault();
    const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, form.title, { label: 'Listing title' });
    if (titleErr) {
      addToast(titleErr, 'error');
      return;
    }
    const title = form.title.trim();
    const summary = form.summary.trim();
    if (!summary) {
      addToast('Summary is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/engagement-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: form.kind,
          title,
          summary,
          requirements: form.requirements.trim(),
          timeHint: form.timeHint.trim(),
          status: form.publishNow ? 'published' : 'draft',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Listing saved', 'success');
      router.push('/dashboard/college/guest-engagements');
    } catch (e2) {
      addToast(e2.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <Link
            href="/dashboard/college/guest-engagements"
            className="btn btn-ghost btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.75rem',
              paddingLeft: 0,
            }}
          >
            <ArrowLeft size={16} />
            Back to Guest faculty & lectures
          </Link>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 0.35rem',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                display: 'flex',
                padding: '0.35rem',
                background: 'var(--primary-50)',
                borderRadius: '8px',
                color: 'var(--primary-600)',
              }}
            >
              <Mic size={22} />
            </span>
            Add guest engagement
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 560 }}>
            Create a listing for guest faculty or a lecture session. Published posts are visible to employer partners.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', maxWidth: 720 }}>
        <form onSubmit={create} style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value="guest_lecture">{KIND_LABEL.guest_lecture}</option>
              <option value="guest_faculty">{KIND_LABEL.guest_faculty}</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Summary</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Requirements / expertise needed</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Preferred timing</label>
            <input
              className="form-input"
              placeholder="e.g. March 2026, weekday mornings"
              value={form.timeHint}
              onChange={(e) => setForm({ ...form, timeHint: e.target.value })}
            />
          </div>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.publishNow}
              onChange={(e) => setForm({ ...form, publishNow: e.target.checked })}
            />
            Publish immediately (visible to companies)
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save listing'}
            </button>
            <Link href="/dashboard/college/guest-engagements" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
