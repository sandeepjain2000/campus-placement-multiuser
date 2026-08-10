'use client';

import { Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Inline bulk actions shown when table rows are selected.
 */
export default function TableBulkActionBar({
  count = 0,
  onEmail,
  onClear,
  emailLabel = 'Email selected',
  style,
}) {
  if (!count) return null;

  return (
    <div
      role="status"
      style={style}
      className="table-bulk-action-bar mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground"
    >
      <span className="font-semibold">
        {count} selected
      </span>
      {onEmail ? (
        <Button type="button" variant="outline" size="sm" onClick={onEmail}>
          <Mail data-icon="inline-start" aria-hidden />
          {emailLabel}
        </Button>
      ) : null}
      {onClear ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="ml-auto">
          <X data-icon="inline-start" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
