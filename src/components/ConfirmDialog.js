'use client';

import { useState } from 'react';

function ConfirmDialogOpen({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  /** When set, user must type this exact phrase before Confirm is enabled (e.g. REJECT). */
  confirmPhrase = '',
  confirmPhraseLabel = '',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const requiredPhrase = String(confirmPhrase || '').trim();
  const phraseOk = !requiredPhrase || typedPhrase === requiredPhrase;

  const confirmClass =
    confirmTone === 'success' ? 'btn btn-success' : confirmTone === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!loading) onCancel?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card animate-fadeIn"
        style={{ width: '100%', maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
          {title}
        </h3>
        <p
          className="text-sm text-secondary"
          style={{ margin: 0, lineHeight: 1.55, whiteSpace: 'pre-line' }}
        >
          {message}
        </p>
        {requiredPhrase ? (
          <div style={{ marginTop: '1rem' }}>
            <label
              className="text-sm"
              style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}
              htmlFor="confirm-dialog-phrase"
            >
              {confirmPhraseLabel || `Type ${requiredPhrase} to confirm`}
            </label>
            <input
              id="confirm-dialog-phrase"
              className="form-input"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              value={typedPhrase}
              disabled={loading}
              placeholder={requiredPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && phraseOk && !loading) {
                  e.preventDefault();
                  onConfirm?.();
                }
              }}
              style={{ width: '100%' }}
            />
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={loading || !phraseOk}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmDialog({ open, ...props }) {
  if (!open) return null;
  return <ConfirmDialogOpen {...props} />;
}
