'use client';

/**
 * Round-wise outcome counts (students), using server-built perRoundByStatus / perRoundUnspecified.
 */
export function HiringAssessmentRoundBreakdown({ roundLabels, perRoundByStatus, perRoundUnspecified }) {
  const labels = Array.isArray(roundLabels) ? roundLabels : [];
  const byStatus = Array.isArray(perRoundByStatus) ? perRoundByStatus : [];
  const unspecified = Array.isArray(perRoundUnspecified) ? perRoundUnspecified : [];

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
        Round-wise status (students)
      </h3>
      <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
        Totals use <strong>one line per roll number</strong>: when the same student appears in several uploads, the <strong>newest upload</strong> row is used (same
        order as the detail table). Values are grouped by the text in your CSV (e.g. Passed, shortlisted, Rejected); labels that differ only by case are combined.
      </p>
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const label = labels[i] ?? `Round ${i + 1}`;
          const buckets = byStatus[i] ?? [];
          const blank = unspecified[i] ?? 0;
          const withOutcome = buckets.reduce((s, b) => s + (b.count ?? 0), 0);
          return (
            <div key={label} className="stats-card" style={{ alignItems: 'stretch', textAlign: 'left', padding: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{label}</div>
              <div className="text-xs text-tertiary" style={{ marginBottom: '0.5rem' }}>
                With outcome: {withOutcome}
                {blank > 0 ? ` · Blank: ${blank}` : ''}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.875rem', lineHeight: 1.65 }}>
                {buckets.map((b) => (
                  <li key={b.status}>
                    <span style={{ wordBreak: 'break-word' }}>{b.status}</span>: <strong>{b.count}</strong>
                  </li>
                ))}
                {blank > 0 ? (
                  <li className="text-tertiary">
                    No outcome / blank: <strong>{blank}</strong>
                  </li>
                ) : null}
                {buckets.length === 0 && blank === 0 ? <li className="text-tertiary">No data for this round</li> : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
