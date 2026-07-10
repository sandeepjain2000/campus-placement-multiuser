'use client';

import { useEffect, useState } from 'react';

function StarPicker({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '1.35rem',
            lineHeight: 1,
            padding: '0.15rem',
            color: (value || 0) >= n ? 'var(--warning-500)' : 'var(--border-default)',
          }}
        >
          ★
        </button>
      ))}
      {value ? <span className="text-sm text-secondary">{value}/5</span> : null}
    </div>
  );
}

export default function InternshipFeedbackForm({ initialRating, initialText, saving, onSubmit }) {
  const [rating, setRating] = useState(initialRating || null);
  const [text, setText] = useState(initialText || '');

  useEffect(() => {
    setRating(initialRating || null);
    setText(initialText || '');
  }, [initialRating, initialText]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ rating, feedbackText: text });
      }}
      style={{ marginTop: '0.75rem' }}
    >
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label className="form-label">Overall rating (optional)</label>
        <StarPicker value={rating} onChange={setRating} disabled={saving} />
      </div>
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label className="form-label">Your progress review</label>
        <textarea
          className="form-textarea"
          rows={4}
          maxLength={4000}
          value={text}
          disabled={saving}
          placeholder="Describe the internship experience, mentorship, work quality, and suggestions…"
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
        {saving ? 'Saving…' : initialText ? 'Update progress review' : 'Submit progress review'}
      </button>
    </form>
  );
}
