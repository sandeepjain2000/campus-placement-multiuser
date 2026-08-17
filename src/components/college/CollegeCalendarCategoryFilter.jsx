'use client';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';

export const COLLEGE_CALENDAR_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'placement', label: 'Placement' },
  { id: 'imported', label: 'Imported' },
  { id: 'program', label: 'Programs' },
];

/**
 * Segmented category filter for college placement calendar.
 *
 * @param {{
 *   value: string,
 *   onChange: (id: string) => void,
 *   counts?: Record<string, number>,
 * }} props
 */
export default function CollegeCalendarCategoryFilter({ value = 'all', onChange, counts = {} }) {
  return (
    <div role="group" aria-label="Filter calendar by category" className="bg-muted inline-flex flex-wrap gap-1 rounded-lg p-1">
      {COLLEGE_CALENDAR_CATEGORIES.map((cat) => {
        const active = value === cat.id;
        const count = counts[cat.id];
        return (
          <Button
            key={cat.id}
            type="button"
            size="sm"
            variant={active ? 'default' : 'ghost'}
            aria-pressed={active}
            onClick={() => onChange?.(cat.id)}
          >
            {cat.label}
            {count != null ? (
              <StatusBadge tone={active ? 'indigo' : 'gray'}>{count}</StatusBadge>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
