'use client';

import { X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { getJobTypeMeta, getCollegeStatusMeta, stipendLabel } from './internshipRowUtils';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';

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

export default function InternshipDetailModal({ row, onClose, busy, onApprove, onReject }) {
  if (!row) return null;

  const typeMeta = getJobTypeMeta(row.job_type);
  const campusMeta = getCollegeStatusMeta(row.college_status);
  const status = String(row.college_status || 'pending').toLowerCase();
  const canApprove = status === 'pending' || status === 'rejected';
  const canReject = status === 'pending';

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
        aria-labelledby="college-internship-detail-title"
        style={{
          borderRadius: 'var(--radius-xl)',
          margin: '2rem auto',
          maxWidth: 'min(720px, calc(100vw - 2rem))',
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
              <span className={`badge ${typeMeta.badge} badge-dot`}>{typeMeta.label}</span>
              <span className={`badge ${campusMeta.badge} badge-dot`}>{campusMeta.label}</span>
              <span className="badge badge-gray badge-dot">Employer published</span>
            </div>
            <h2 id="college-internship-detail-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {row.title}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <CompanyNameLink name={row.company_name} website={row.website} />
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Close details"
          >
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
            <DetailField label="Stipend">{stipendLabel(row.salary_min, row.salary_max)}</DetailField>
            <DetailField label="Min CGPA">{row.min_cgpa != null ? Number(row.min_cgpa) : '—'}</DetailField>
            <DetailField label="Openings">{row.vacancies ?? '—'}</DetailField>
            <DetailField label="Posted">{row.created_at ? formatDate(row.created_at) : '—'}</DetailField>
            <DetailField label="Campus approval">
              {campusMeta.label}
              {row.college_approved_at ? ` · ${formatDate(row.college_approved_at)}` : ''}
            </DetailField>
            {row.rejection_reason ? (
              <DetailField label="Rejection note">{row.rejection_reason}</DetailField>
            ) : null}
          </div>

          <PostingEligibilitySection
            opportunity={{
              minCgpa: row.min_cgpa != null ? Number(row.min_cgpa) : null,
              status: 'published',
            }}
            audience="college"
          />

          <DetailField label="Description">
            {row.description?.trim() ? row.description : '—'}
          </DetailField>

          {row.skills_required?.length ? (
            <DetailField label="Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {row.skills_required.map((s) => (
                  <span key={s} className="badge badge-gray">
                    {s}
                  </span>
                ))}
              </div>
            </DetailField>
          ) : null}
        </div>

        <div
          style={{
            padding: '0.85rem 1.5rem 1.25rem',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {canApprove || canReject ? (
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              {status === 'pending'
                ? 'Students cannot apply until you approve this listing for your campus.'
                : 'This listing was rejected. Approve it to make it visible to students.'}
            </p>
          ) : (
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              This listing is already approved and visible to students on your campus.
            </p>
          )}
          <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {canReject ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => onReject?.(row.id)}
                style={{ color: 'var(--danger-600)', border: '1px solid var(--danger-200)' }}
              >
                Reject
              </button>
            ) : null}
            {canApprove ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => onApprove?.(row.id)}
              >
                {busy ? 'Approving…' : 'Approve for campus'}
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
