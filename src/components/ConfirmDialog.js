'use client';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
