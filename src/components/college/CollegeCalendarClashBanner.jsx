'use client';

import { AlertTriangle } from 'lucide-react';
import { findPlacementImportedClashesFromItems } from '@/lib/calendarClashDetection';
import { useMemo } from 'react';

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
    <div
      className="card"
      role="status"
      style={{
        marginBottom: '1rem',
        padding: '0.875rem 1rem',
        borderColor: 'var(--warning-300)',
        background: 'var(--warning-50)',
      }}
    >
      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
        <AlertTriangle size={18} style={{ color: 'var(--warning-700)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--warning-900)', fontSize: '0.9rem' }}>
            {total} placement clash{total === 1 ? '' : 'es'} with calendar events
            {importedClashes.length ? ` (${importedClashes.length} imported)` : ''}
          </div>
          <p className="text-sm" style={{ margin: '0.35rem 0 0.5rem', color: 'var(--warning-900)' }}>
            Drives that fall on exams, holidays, or other blocked imported dates should be rescheduled or confirmed intentionally.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--warning-900)' }}>
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
        </div>
      </div>
    </div>
  );
}
