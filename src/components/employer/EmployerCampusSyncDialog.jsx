'use client';

import { Users } from 'lucide-react';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const title = jobTitle?.trim() || 'Posting';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg gap-4" showCloseButton={!submitting}>
        <DialogHeader className="gap-3 pr-8">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <Users className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <DialogTitle id="employer-campus-sync-title">Sync campuses</DialogTitle>
              <DialogDescription className="mt-1">{title}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-muted-foreground m-0 text-sm">
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

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={onSubmit}>
            {submitting ? 'Syncing…' : 'Save visibility'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
