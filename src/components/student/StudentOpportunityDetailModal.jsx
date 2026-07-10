'use client';

import { X, Download } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { formatInternshipPeriodLabel } from '@/lib/internshipPostingMeta';
import { globalApplyBlockedReason, resolveApplyBlockReason } from '@/lib/getApplyBlockReason';
import { programOpportunityFromRow } from '@/lib/studentApplyContext';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';
import StudentApplyEligibilityControls from '@/components/student/StudentApplyEligibilityControls';

function payLabel(row, kind) {
  if (row.salaryMin == null && row.salaryMax == null) return '—';
  const min = formatCurrency(row.salaryMin || row.salaryMax);
  const range =
    row.salaryMax != null &&
    row.salaryMin != null &&
    Number(row.salaryMax) !== Number(row.salaryMin)
      ? `${min} – ${formatCurrency(row.salaryMax)}`
      : min;
  const suffix = kind === 'job' ? ' / yr' : ' / mo';
  return `${range}${suffix}`;
}

export default function StudentOpportunityDetailModal({
  row,
  kind = 'internship',
  onClose,
  onApply,
  onDownload,
  applyingId,
  currentStudent,
  applyOptions = {},
  canApply = true,
  applyBlockedReason = '',
}) {
  if (!row) return null;

  const payFieldLabel = kind === 'job' ? 'Salary' : 'Stipend';
  const applyLabel =
    kind === 'job' ? 'Apply to this Job' : 'Apply to this Internship';

  const opportunity = programOpportunityFromRow(row);
  const globalBlockedReason = globalApplyBlockedReason(canApply, applyBlockedReason);
  const blockReason = resolveApplyBlockReason(opportunity, currentStudent, {
    ...applyOptions,
    globalBlockedReason,
  });

  return (
    <div
      className="modal-overlay modal-overlay-solid"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal modal-lg student-opportunity-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-opportunity-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0 }}>
            <EntityLogo name={row.companyName} size="lg" shape="rounded" />
            <div style={{ minWidth: 0 }}>
              <h2 id="student-opportunity-detail-title" className="modal-title" style={{ marginBottom: '0.25rem' }}>
                {row.title}
              </h2>
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                <CompanyNameLink name={row.companyName} website={row.website} />
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body student-opportunity-detail-body">
          <div style={{ marginBottom: '1.25rem' }}>
            {row.hasApplied ? (
              <span
                className={`badge badge-${getStatusColor(row.applicationStatus)} badge-dot`}
                style={{ fontSize: '0.85rem', padding: '0.375rem 0.75rem' }}
              >
                {formatStatus(row.applicationStatus)}
              </span>
            ) : (
              <span className="badge badge-blue" style={{ fontSize: '0.85rem', padding: '0.375rem 0.75rem' }}>
                Open for applications
              </span>
            )}
          </div>

          <PostingEligibilitySection
            opportunity={opportunity}
            student={currentStudent}
            audience="student"
            openStatuses={applyOptions.openStatuses}
          />

          <div className="student-opportunity-detail-stats">
            <div>
              <div className="student-opportunity-detail-stat-label">{payFieldLabel}</div>
              <div className="student-opportunity-detail-stat-value">{payLabel(row, kind)}</div>
            </div>
            <div>
              <div className="student-opportunity-detail-stat-label">Min CGPA</div>
              <div className="student-opportunity-detail-stat-value">{row.minCgpa ?? '—'}</div>
            </div>
            <div>
              <div className="student-opportunity-detail-stat-label">Openings</div>
              <div className="student-opportunity-detail-stat-value">{row.vacancies ?? '—'}</div>
            </div>
            {kind === 'internship' ? (
              <div>
                <div className="student-opportunity-detail-stat-label">Internship period</div>
                <div className="student-opportunity-detail-stat-value">
                  {formatInternshipPeriodLabel(row.startDate, row.endDate, formatDate) || '—'}
                </div>
              </div>
            ) : (
              <div>
                <div className="student-opportunity-detail-stat-label">Deadline</div>
                <div className="student-opportunity-detail-stat-value">
                  {row.applicationDeadline ? formatDate(row.applicationDeadline) : '—'}
                </div>
              </div>
            )}
          </div>

          {row.skillsRequired?.length > 0 ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="student-opportunity-detail-section-label">Skills required</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {row.skillsRequired.map((skill) => (
                  <span key={skill} className="badge badge-gray">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="student-opportunity-detail-section-label">Description</div>
          <div className="student-opportunity-detail-description">
            {row.description?.trim() ? (
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0 }}>{row.description}</p>
            ) : (
              <p className="text-secondary text-sm" style={{ margin: 0 }}>
                No description provided.
              </p>
            )}
          </div>
        </div>

        {!row.hasApplied ? (
          <div className="modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {onDownload ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onDownload}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Download size={16} aria-hidden />
                    Download job
                  </button>
                ) : null}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
            <StudentApplyEligibilityControls
              opportunity={opportunity}
              student={currentStudent}
              applyLabel={applyLabel}
              applying={applyingId === row.id}
              blockReason={blockReason}
              globalBlockedReason={globalBlockedReason}
              openStatuses={applyOptions.openStatuses}
              internshipLocked={applyOptions.internshipLocked}
              onApply={() => onApply(row.id, row.title)}
            />
          </div>
        ) : (
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onDownload ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onDownload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Download size={16} aria-hidden />
                Download job
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
