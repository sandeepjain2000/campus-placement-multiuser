'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Full-page skeleton for /dashboard/alerts — avoids blank flash on reload.
 */
export default function AlertsInboxSkeleton() {
  return (
    <div className="animate-fadeIn alerts-inbox-root flex flex-col gap-4" aria-busy="true" aria-label="Loading alerts">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-[220px]" />
        <Skeleton className="h-4 w-full max-w-[520px]" />
      </div>
      <Card className="alerts-inbox-card min-h-[420px]">
        <CardHeader className="sr-only">
          <CardTitle>Alerts Inbox</CardTitle>
          <CardDescription>Loading alert folders and messages.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[380px] p-0">
          <div className="alerts-inbox-nav flex w-[200px] shrink-0 flex-col gap-2 border-r p-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
          <div className="alerts-inbox-list flex flex-1 flex-col gap-2.5 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
