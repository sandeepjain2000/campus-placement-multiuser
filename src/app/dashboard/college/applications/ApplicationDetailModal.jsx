'use client';

import { X } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';

function DetailField({ label, children }) {
  return (
    <div
      style={{
        padding: '0.75rem 0.85rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-secondary)',
      }}
    >
      <div
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-tertiary)',
          marginBottom: '0.35rem',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function applicationKindLabel(a) {
  if (a?.source_kind === 'drive') return 'Placement drive';
  const jt = String(a?.job_type || '').toLowerCase();
  if (jt === 'internship') return 'Internship';
  if (jt === 'short_project' || jt === 'hackathon') return 'Project';
  if (jt === 'full_time' || jt === 'part_time' || jt === 'contract') return 'Job';
  return 'Program';
}

export default function ApplicationDetailModal({ row, onClose }) {
  if (!row) return null;

  const opening = row.opening_title || row.drive_title || '—';

  return (
    <div
      className="modal-overlay"
      role="presentation"
      style={{ overflowY: 'auto', alignItems: 'flex-start' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="college-application-detail-title"
        style={{
          borderRadius: 'var(--radius-xl)',
          margin: '2rem auto',
          maxWidth: 'min(640px, calc(100vw - 2rem))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span className={`badge badge-${getStatusColor(row.status)} badge-dot`}>{formatStatus(row.status)}</span>
              <span className="badge badge-gray badge-dot">{applicationKindLabel(row)}</span>
            </div>
            <h2 id="college-application-detail-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {row.student_name || 'Student application'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {row.roll_number || '—'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gap: '0.75rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <DetailField label="Department">{row.department || '—'}</DetailField>
            <DetailField label="Applied">{row.applied_at ? formatDate(row.applied_at) : '—'}</DetailField>
            {row.current_round != null ? <DetailField label="Current round">{row.current_round}</DetailField> : null}
          </div>

          <DetailField label="Company">
            <CompanyNameLink name={row.company_name} website={row.company_website} />
          </DetailField>

          <DetailField label="Opening">{opening}</DetailField>

          {row.drive_title && row.opening_title && row.drive_title !== row.opening_title ? (
            <DetailField label="Placement drive">{row.drive_title}</DetailField>
          ) : null}
        </div>

        <div
          style={{
            padding: '0.85rem 1.5rem 1.25rem',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
