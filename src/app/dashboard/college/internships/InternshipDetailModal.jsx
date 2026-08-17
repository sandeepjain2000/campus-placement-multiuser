'use client';

import { formatDate } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getJobTypeMeta, getCollegeStatusMeta, stipendLabel } from './internshipRowUtils';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';

function DetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
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
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl gap-4" showCloseButton>
        <DialogHeader className="gap-3 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={typeMeta.tone} showDot>
              {typeMeta.label}
            </StatusBadge>
            <StatusBadge tone={campusMeta.tone} showDot>
              {campusMeta.label}
            </StatusBadge>
            <Badge variant="outline">Employer published</Badge>
          </div>
          <div>
            <DialogTitle id="college-internship-detail-title" className="text-xl font-semibold">
              {row.title}
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              <CompanyNameLink name={row.company_name} website={row.website} />
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailField label="Stipend">{stipendLabel(row.salary_min, row.salary_max)}</DetailField>
            <DetailField label="Min CGPA">{row.min_cgpa != null ? Number(row.min_cgpa) : '—'}</DetailField>
            <DetailField label="Openings">{row.vacancies ?? '—'}</DetailField>
            <DetailField label="Posted">{row.created_at ? formatDate(row.created_at) : '—'}</DetailField>
            <DetailField label="Campus approval">
              {campusMeta.label}
              {row.college_approved_at ? ` · ${formatDate(row.college_approved_at)}` : ''}
            </DetailField>
            {row.rejection_reason ? <DetailField label="Rejection note">{row.rejection_reason}</DetailField> : null}
          </div>

          <PostingEligibilitySection
            opportunity={{
              minCgpa: row.min_cgpa != null ? Number(row.min_cgpa) : null,
              status: 'published',
            }}
            audience="college"
          />

          <DetailField label="Description">{row.description?.trim() ? row.description : '—'}</DetailField>

          {row.skills_required?.length ? (
            <DetailField label="Skills">
              <div className="flex flex-wrap gap-1.5">
                {row.skills_required.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </DetailField>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-muted-foreground m-0 flex-1 text-left text-sm">
            {canApprove || canReject
              ? status === 'pending'
                ? 'Students cannot apply until you approve this listing for your campus.'
                : 'This listing was rejected. Approve it to make it visible to students.'
              : 'This listing is already approved and visible to students on your campus.'}
          </p>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            {canReject ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onReject?.(row.id)}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Reject
              </Button>
            ) : null}
            {canApprove ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => onApprove?.(row.id)}>
                {busy ? 'Approving…' : 'Approve for campus'}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
