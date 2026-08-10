'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Hiring result outcome counts (students), one row per roll (newest upload wins).
 */
export function HiringResultBreakdown({ summary }) {
  const byStatus = summary?.hiringResultByStatus ?? [];
  const withResult = summary?.withHiringResult ?? 0;
  const withoutResult = summary?.withoutHiringResult ?? 0;

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>Hiring Result Breakdown</CardTitle>
        <CardDescription>
        Totals use <strong>one line per roll number</strong> — when the same student appears in several uploads, the{' '}
        <strong>newest upload</strong> row is used.
        </CardDescription>
      </CardHeader>
      <CardContent>
      <div className="bg-muted/50 max-w-[480px] rounded-lg border p-4 text-left">
        <div className="text-muted-foreground mb-2 text-xs tabular-nums">
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
            <li className="text-muted-foreground">No hiring results recorded yet</li>
          ) : null}
          {withoutResult > 0 ? (
            <li className="text-muted-foreground">
              No decision / blank: <strong>{withoutResult}</strong>
            </li>
          ) : null}
        </ul>
      </div>
      </CardContent>
    </Card>
  );
}
