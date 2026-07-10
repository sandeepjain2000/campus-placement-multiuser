'use client';

import { Mail, X } from 'lucide-react';

/**
 * Inline bulk actions shown when table rows are selected.
 */
export default function TableBulkActionBar({
  count = 0,
  onEmail,
  onClear,
  emailLabel = 'Email selected',
  style,
}) {
  if (!count) return null;

  return (
    <div
      className="table-bulk-action-bar"
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.65rem 0.85rem',
        marginBottom: '0.75rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--primary-200)',
        background: 'var(--primary-50)',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
        ...style,
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {count} selected
      </span>
      {onEmail ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onEmail}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Mail size={15} aria-hidden />
          {emailLabel}
        </button>
      ) : null}
      {onClear ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClear}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}
        >
          <X size={14} aria-hidden />
          Clear
        </button>
      ) : null}
    </div>
  );
}
