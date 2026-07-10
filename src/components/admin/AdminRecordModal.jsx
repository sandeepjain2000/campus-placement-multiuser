'use client';

import { X } from 'lucide-react';

/**
 * Slide-over panel for super-admin view / edit flows.
 */
export default function AdminRecordModal({ title, mode, loading, saving, error, onClose, onSave, children, footer }) {
  if (!mode) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-record-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(15, 23, 42, 0.45)',
          cursor: 'pointer',
        }}
      />
      <div
        className="animate-fadeIn card"
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(520px, 100vw)',
          height: '100%',
          margin: 0,
          borderRadius: 0,
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          className="card-header"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            borderBottom: '1px solid var(--border-default)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 id="admin-record-modal-title" className="card-title" style={{ margin: 0 }}>
              {title}
            </h2>
            <p className="text-sm text-secondary" style={{ margin: '0.25rem 0 0' }}>
              {mode === 'view' ? 'Read-only details' : 'Update and save changes'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 40, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : error ? (
            <div className="card" style={{ borderColor: 'var(--danger-500)', padding: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--danger-600)' }}>{error}</p>
            </div>
          ) : (
            children
          )}
        </div>

        {(footer || mode === 'edit') && !loading && !error ? (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {footer}
            {mode === 'edit' ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
