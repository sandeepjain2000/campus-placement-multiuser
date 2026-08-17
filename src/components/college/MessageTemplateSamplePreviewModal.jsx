'use client';

import { Eye } from 'lucide-react';
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

/**
 * Modal showing a message/email template rendered with sample placeholder values.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   subject?: string,
 *   body?: string,
 *   sampleVars?: Record<string, string>,
 * }} props
 */
export default function MessageTemplateSamplePreviewModal({
  open,
  onClose,
  title = 'Preview with sample data',
  subject = '',
  body = '',
  sampleVars = {},
}) {
  const varEntries = Object.entries(sampleVars || {});

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="text-muted-foreground" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>Placeholders filled with demo values. Nothing is sent.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {varEntries.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Sample data used</h3>
              <div className="flex flex-wrap gap-2">
                {varEntries.map(([key, value]) => (
                  <Badge key={key} variant="secondary" title={`{{${key}}}`}>
                    <code>{key}</code><span aria-hidden>→</span>
                    {value}
                  </Badge>
                ))}
              </div>
            </section>
          ) : (
            <p className="text-muted-foreground text-sm">No placeholders found in this template.</p>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Subject</h3>
            <div className="bg-muted rounded-md border px-3 py-2 font-medium break-words">{subject?.trim() ? subject : '—'}</div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Body</h3>
            <pre className="bg-muted m-0 whitespace-pre-wrap break-words rounded-md border p-3 text-sm leading-relaxed">
              {body?.trim() ? body : '—'}
            </pre>
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
