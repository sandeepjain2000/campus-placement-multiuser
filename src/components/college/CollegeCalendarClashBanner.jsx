'use client';

import { AlertTriangle } from 'lucide-react';
import { findPlacementImportedClashesFromItems } from '@/lib/calendarClashDetection';
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Warn when placement drives overlap imported / blocking academic events.
 */
export default function CollegeCalendarClashBanner({ items }) {
  const clashes = useMemo(() => findPlacementImportedClashesFromItems(items), [items]);
  if (!clashes.length) return null;

  const importedClashes = clashes.filter((c) => c.imported);
  const shown = (importedClashes.length ? importedClashes : clashes).slice(0, 5);
  const total = clashes.length;

  return (
    <Alert className="mb-4" role="status">
      <AlertTriangle aria-hidden />
      <AlertTitle>
        {total} placement clash{total === 1 ? '' : 'es'} with calendar events
        {importedClashes.length ? ` (${importedClashes.length} imported)` : ''}
      </AlertTitle>
      <AlertDescription>
          <p>
            Drives that fall on exams, holidays, or other blocked imported dates should be rescheduled or confirmed intentionally.
          </p>
          <ul className="mt-2 list-disc pl-5">
            {shown.map((c) => (
              <li key={`${c.driveId}-${c.eventId}-${c.driveDate}`}>
                <strong>{c.driveTitle}</strong> ({c.driveDate}) clashes with{' '}
                {c.imported ? 'imported ' : ''}
                {c.eventType === 'exam' ? 'exam' : c.eventType === 'holiday' ? 'holiday' : 'event'}{' '}
                <strong>{c.eventTitle}</strong> ({c.eventDate})
              </li>
            ))}
            {total > shown.length ? <li>…and {total - shown.length} more</li> : null}
          </ul>
      </AlertDescription>
    </Alert>
  );
}
