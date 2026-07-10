'use client';

import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import StudentOpportunityApplyButton from '@/components/student/StudentOpportunityApplyButton';

/**
 * Row actions for student/alumni opportunity browse tables (View, Download, Apply).
 */
export default function StudentOpportunityRowActions({
  row,
  kind = 'job',
  currentStudent,
  applyOptions = {},
  globalBlockedReason = null,
  applyingId,
  onView,
  onDownload,
  onEmail,
  onApply,
  onShowEligibility,
}) {
  return (
    <div
      className="table-actions"
      style={{
        display: 'inline-flex',
        gap: '0.35rem',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
      }}
    >
      <StandardTableIconAction action="view" showLabel={false} onClick={() => onView?.(row)} />
      <StandardTableIconAction
        action="email"
        showLabel={false}
        onClick={() => onEmail?.(row)}
        tooltip={kind === 'job' ? 'Email this job' : 'Email this internship'}
      />
      <StandardTableIconAction
        action="download"
        showLabel={false}
        onClick={() => onDownload?.(row)}
        tooltip={kind === 'job' ? 'Download job details as CSV' : 'Download internship details as CSV'}
      />
      {!row.hasApplied ? (
        <StudentOpportunityApplyButton
          row={row}
          currentStudent={currentStudent}
          applyOptions={applyOptions}
          globalBlockedReason={globalBlockedReason}
          applyingId={applyingId}
          onApply={onApply}
          onShowEligibility={onShowEligibility}
        />
      ) : null}
    </div>
  );
}
