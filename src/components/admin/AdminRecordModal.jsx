'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
 * Slide-over panel for super-admin view / edit flows.
 */
export default function AdminRecordModal({ title, mode, loading, saving, error, onClose, onSave, children, footer }) {
  return (
    <Dialog open={Boolean(mode)} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'view' ? 'Read-only details' : 'Update and save changes'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[62vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-10 rounded-md" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : (
            children
          )}
        </div>

        {(footer || mode === 'edit') && !loading && !error ? (
          <DialogFooter>
            {footer}
            {mode === 'edit' ? (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
