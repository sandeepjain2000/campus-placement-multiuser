'use client';

import { Users } from 'lucide-react';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';

/**
 * Modal for syncing published job/internship visibility to approved campuses.
 */
export default function EmployerCampusSyncDialog({
  open,
  jobTitle,
  campuses,
  selection,
  onSelectionChange,
  submitting,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const title = jobTitle?.trim() || 'Posting';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="employer-campus-sync-title"
      aria-busy={submitting}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <button
        type="button"
        aria-label="Close campus sync"
        disabled={submitting}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          border: 'none',
          cursor: submitting ? 'default' : 'pointer',
        }}
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        className="card animate-slideUp"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <div
              style={{
                background: 'var(--primary-50)',
                padding: '0.45rem',
                borderRadius: 'var(--radius-md)',
                lineHeight: 0,
              }}
            >
              <Users size={20} className="text-primary-700" aria-hidden />
            </div>
            <div>
              <h3 id="employer-campus-sync-title" className="card-title" style={{ margin: 0 }}>
                Sync campuses
              </h3>
              <p className="text-sm text-secondary" style={{ margin: '0.25rem 0 0' }}>
                {title}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" disabled={submitting} onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
          Choose which approved campuses should see this posting on college and student dashboards. An active employer
          tie-up is required for each campus.
        </p>
        <EmployerCampusTargetPicker
          campuses={campuses}
          selection={selection}
          onSelectionChange={onSelectionChange}
          compact
          emptyMessage="No approved campuses. Complete a campus tie-up first."
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary" disabled={submitting} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={submitting} onClick={onSubmit}>
            {submitting ? 'Syncing…' : 'Save visibility'}
          </button>
        </div>
      </div>
    </div>
  );
}
