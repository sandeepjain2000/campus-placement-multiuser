'use client';

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
    <div
      role="group"
      aria-label="Filter calendar by category"
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: '0.35rem',
        padding: '0.25rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
      }}
    >
      {COLLEGE_CALENDAR_CATEGORIES.map((cat) => {
        const active = value === cat.id;
        const count = counts[cat.id];
        return (
          <button
            key={cat.id}
            type="button"
            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={active}
            onClick={() => onChange?.(cat.id)}
            style={{ fontWeight: active ? 700 : 500 }}
          >
            {cat.label}
            {count != null ? (
              <span className="font-mono" style={{ marginLeft: '0.35rem', opacity: 0.85 }}>
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
