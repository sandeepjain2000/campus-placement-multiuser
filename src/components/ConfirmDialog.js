'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function ConfirmDialogOpen({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  /** When set, user must type this exact phrase before Confirm is enabled (e.g. REJECT). */
  confirmPhrase = '',
  confirmPhraseLabel = '',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const requiredPhrase = String(confirmPhrase || '').trim();
  const phraseOk = !requiredPhrase || typedPhrase === requiredPhrase;

  const confirmVariant = confirmTone === 'danger' ? 'destructive' : 'default';

  return (
    <Dialog open onOpenChange={(nextOpen) => {
      if (!nextOpen && !loading) onCancel?.();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{message}</DialogDescription>
        </DialogHeader>
        {requiredPhrase ? (
          <Field>
            <FieldLabel htmlFor="confirm-dialog-phrase">
              {confirmPhraseLabel || `Type ${requiredPhrase} to confirm`}
            </FieldLabel>
            <Input
              id="confirm-dialog-phrase"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              value={typedPhrase}
              disabled={loading}
              placeholder={requiredPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && phraseOk && !loading) {
                  e.preventDefault();
                  onConfirm?.();
                }
              }}
            />
          </Field>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            className={confirmTone === 'success' ? 'bg-green-600 text-white hover:bg-green-700' : undefined}
            onClick={onConfirm}
            disabled={loading || !phraseOk}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ConfirmDialog({ open, ...props }) {
  if (!open) return null;
  return <ConfirmDialogOpen {...props} />;
}
