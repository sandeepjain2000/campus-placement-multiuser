'use client';

/**
 * Hiring result outcome counts (students), one row per roll (newest upload wins).
 */
export function HiringResultBreakdown({ summary }) {
  const byStatus = summary?.hiringResultByStatus ?? [];
  const withResult = summary?.withHiringResult ?? 0;
  const withoutResult = summary?.withoutHiringResult ?? 0;

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
        Hiring result breakdown
      </h3>
      <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
        Totals use <strong>one line per roll number</strong> — when the same student appears in several uploads, the{' '}
        <strong>newest upload</strong> row is used.
      </p>
      <div className="stats-card" style={{ alignItems: 'stretch', textAlign: 'left', padding: '1rem', maxWidth: 480 }}>
        <div className="text-xs text-tertiary" style={{ marginBottom: '0.5rem' }}>
          With result: {withResult}
          {withoutResult > 0 ? ` · No decision yet: ${withoutResult}` : ''}
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.875rem', lineHeight: 1.65 }}>
          {byStatus.map((b) => (
            <li key={b.status}>
              <span style={{ wordBreak: 'break-word' }}>{b.status}</span>: <strong>{b.count}</strong>
            </li>
          ))}
          {byStatus.length === 0 && withoutResult === 0 ? (
            <li className="text-tertiary">No hiring results recorded yet</li>
          ) : null}
          {withoutResult > 0 ? (
            <li className="text-tertiary">
              No decision / blank: <strong>{withoutResult}</strong>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
