'use client';

import { Eye, X } from 'lucide-react';

/**
 * Modal showing a message/email template rendered with sample placeholder values.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   subject?: string,
 *   body?: string,
 *   sampleVars?: Record<string, string>,
 * }} props
 */
export default function MessageTemplateSamplePreviewModal({
  open,
  onClose,
  title = 'Preview with sample data',
  subject = '',
  body = '',
  sampleVars = {},
}) {
  if (!open) return null;

  const varEntries = Object.entries(sampleVars || {});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-template-preview-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <button
        type="button"
        aria-label="Close preview"
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
        className="card animate-fadeIn"
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(560px, 100%)',
          maxHeight: 'min(88vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          margin: 0,
          padding: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.15rem',
            borderBottom: '1px solid var(--border-default)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              id="message-template-preview-title"
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <Eye size={18} className="text-primary" aria-hidden />
              {title}
            </h2>
            <p className="text-secondary text-sm" style={{ margin: '0.35rem 0 0', lineHeight: 1.45 }}>
              Placeholders filled with demo values. Nothing is sent.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1rem 1.15rem', overflowY: 'auto', display: 'grid', gap: '1rem' }}>
          {varEntries.length > 0 ? (
            <section>
              <div
                className="text-xs text-tertiary"
                style={{ textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}
              >
                Sample data used
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                }}
              >
                {varEntries.map(([key, value]) => (
                  <span
                    key={key}
                    className="badge badge-gray"
                    style={{ fontWeight: 500, fontSize: '0.72rem' }}
                    title={`{{${key}}}`}
                  >
                    <code style={{ fontSize: '0.7rem' }}>{key}</code>
                    <span style={{ margin: '0 0.25rem', opacity: 0.5 }}>→</span>
                    {value}
                  </span>
                ))}
              </div>
            </section>
          ) : (
            <p className="text-secondary text-sm" style={{ margin: 0 }}>
              No placeholders found in this template.
            </p>
          )}

          <section>
            <div
              className="text-xs text-tertiary"
              style={{ textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}
            >
              Subject
            </div>
            <div
              style={{
                padding: '0.65rem 0.75rem',
                background: 'var(--bg-secondary, #f8fafc)',
                borderRadius: 6,
                border: '1px solid var(--border-default)',
                fontWeight: 600,
                wordBreak: 'break-word',
              }}
            >
              {subject?.trim() ? subject : '—'}
            </div>
          </section>

          <section>
            <div
              className="text-xs text-tertiary"
              style={{ textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}
            >
              Body
            </div>
            <pre
              style={{
                margin: 0,
                padding: '0.75rem',
                background: 'var(--bg-secondary, #f8fafc)',
                borderRadius: 6,
                border: '1px solid var(--border-default)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: '0.85rem',
                lineHeight: 1.55,
              }}
            >
              {body?.trim() ? body : '—'}
            </pre>
          </section>
        </div>

        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
