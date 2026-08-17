'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Round-wise outcome counts (students), using server-built perRoundByStatus / perRoundUnspecified.
 */
export function HiringAssessmentRoundBreakdown({ roundLabels, perRoundByStatus, perRoundUnspecified }) {
  const labels = Array.isArray(roundLabels) ? roundLabels : [];
  const byStatus = Array.isArray(perRoundByStatus) ? perRoundByStatus : [];
  const unspecified = Array.isArray(perRoundUnspecified) ? perRoundUnspecified : [];

  return (
    <Card className="mb-5">
      <CardHeader>
      <CardTitle>Round-wise Status (Students)</CardTitle>
      <CardDescription>
        Totals use <strong>one line per roll number</strong>: when the same student appears in several uploads, the <strong>newest upload</strong> row is used (same
        order as the detail table). Values are grouped by the text in your CSV (e.g. Passed, shortlisted, Rejected); labels that differ only by case are combined.
      </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => {
          const label = labels[i] ?? `Round ${i + 1}`;
          const buckets = byStatus[i] ?? [];
          const blank = unspecified[i] ?? 0;
          const withOutcome = buckets.reduce((s, b) => s + (b.count ?? 0), 0);
          return (
            <div key={label} className="bg-muted/50 rounded-lg border p-4 text-left">
              <div className="mb-2 font-medium">{label}</div>
              <div className="text-muted-foreground mb-2 text-xs tabular-nums">
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
                  <li className="text-muted-foreground">
                    No outcome / blank: <strong>{blank}</strong>
                  </li>
                ) : null}
                {buckets.length === 0 && blank === 0 ? <li className="text-muted-foreground">No data for this round</li> : null}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
