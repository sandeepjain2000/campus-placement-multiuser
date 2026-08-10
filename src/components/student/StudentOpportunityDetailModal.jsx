'use client';

import { Download } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { formatInternshipPeriodLabel } from '@/lib/internshipPostingMeta';
import { globalApplyBlockedReason, resolveApplyBlockReason } from '@/lib/getApplyBlockReason';
import { programOpportunityFromRow } from '@/lib/studentApplyContext';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';
import StudentApplyEligibilityControls from '@/components/student/StudentApplyEligibilityControls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';

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

function DetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
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
  const applyLabel = kind === 'job' ? 'Apply to this Job' : 'Apply to this Internship';

  const opportunity = programOpportunityFromRow(row);
  const globalBlockedReason = globalApplyBlockedReason(canApply, applyBlockedReason);
  const blockReason = resolveApplyBlockReason(opportunity, currentStudent, {
    ...applyOptions,
    globalBlockedReason,
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl gap-4" showCloseButton>
        <DialogHeader className="gap-3 pr-8">
          <div className="flex gap-3 items-center min-w-0">
            <EntityLogo name={row.companyName} size="lg" shape="rounded" />
            <div className="min-w-0">
              <DialogTitle id="student-opportunity-detail-title" className="text-xl font-semibold">
                {row.title}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                <CompanyNameLink name={row.companyName} website={row.website} />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
          <div>
            {row.hasApplied ? (
              <StatusBadge status={row.applicationStatus} showDot className="px-3 py-1.5 text-[0.85rem]">
                {formatStatus(row.applicationStatus) || 'Applied'}
              </StatusBadge>
            ) : (
              <StatusBadge tone="blue" className="px-3 py-1.5 text-[0.85rem]">
                Open for applications
              </StatusBadge>
            )}
          </div>

          <PostingEligibilitySection
            opportunity={opportunity}
            student={currentStudent}
            audience="student"
            openStatuses={applyOptions.openStatuses}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailField label={payFieldLabel}>{payLabel(row, kind)}</DetailField>
            <DetailField label="Min CGPA">{row.minCgpa ?? '—'}</DetailField>
            <DetailField label="Openings">{row.vacancies ?? '—'}</DetailField>
            {kind === 'internship' ? (
              <DetailField label="Internship period">
                {formatInternshipPeriodLabel(row.startDate, row.endDate, formatDate) || '—'}
              </DetailField>
            ) : (
              <DetailField label="Deadline">
                {row.applicationDeadline ? formatDate(row.applicationDeadline) : '—'}
              </DetailField>
            )}
          </div>

          {row.skillsRequired?.length > 0 ? (
            <DetailField label="Skills required">
              <div className="flex flex-wrap gap-1.5">
                {row.skillsRequired.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </DetailField>
          ) : null}

          <DetailField label="Description">
            {row.description?.trim() ? (
              <p className="m-0 whitespace-pre-wrap leading-relaxed">{row.description}</p>
            ) : (
              <p className="text-muted-foreground m-0 text-sm">No description provided.</p>
            )}
          </DetailField>
        </div>

        <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col">
          {!row.hasApplied ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  {onDownload ? (
                    <Button type="button" variant="secondary" size="sm" onClick={onDownload}>
                      <Download data-icon="inline-start" />
                      Download job
                    </Button>
                  ) : null}
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                  Close
                </Button>
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
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {onDownload ? (
                <Button type="button" variant="secondary" size="sm" onClick={onDownload}>
                  <Download data-icon="inline-start" />
                  Download job
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
