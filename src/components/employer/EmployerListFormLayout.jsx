'use client';

import { ArrowLeft } from 'lucide-react';

/**
 * Full-page form shell for employer list → add/edit flows.
 * Replaces the list landing view until the user backs out or submits.
 */
export default function EmployerListFormLayout({
  title,
  subtitle,
  onBack,
  backLabel = 'Back to list',
  children,
  footer,
}) {
  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onBack}
            style={{ marginBottom: '0.75rem', paddingLeft: 0 }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
          </button>
          <h1>{title}</h1>
          {subtitle ? <p className="text-secondary">{subtitle}</p> : null}
        </div>
      </div>
      <div className="card">
        {children}
        {footer ? <div style={{ marginTop: '1rem' }}>{footer}</div> : null}
      </div>
    </div>
  );
}
