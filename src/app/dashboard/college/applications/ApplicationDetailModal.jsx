'use client';

import { formatDate } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  applicationKindLabel,
  getApplicationKindMeta,
  getApplicationStatusMeta,
  openingLabel,
} from './applicationRowUtils';

function DetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function ApplicationDetailModal({ row, onClose }) {
  if (!row) return null;

  const kindMeta = getApplicationKindMeta(row);
  const statusMeta = getApplicationStatusMeta(row.status);
  const opening = openingLabel(row);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="gap-4 sm:max-w-xl" showCloseButton>
        <DialogHeader className="gap-3 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusMeta.tone} showDot>
              {statusMeta.label}
            </StatusBadge>
            <StatusBadge tone={kindMeta.tone} showDot>
              {kindMeta.label || applicationKindLabel(row)}
            </StatusBadge>
          </div>
          <div>
            <DialogTitle id="college-application-detail-title" className="text-xl font-semibold">
              {row.student_name || 'Student application'}
            </DialogTitle>
            <DialogDescription className="mt-1.5 font-mono">{row.roll_number || '—'}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

        <DialogFooter>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
