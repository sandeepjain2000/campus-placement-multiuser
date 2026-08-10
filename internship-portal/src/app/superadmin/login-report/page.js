'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ip/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function LoginReportPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/ip/superadmin/login-report').then((r) => r.json()).then((d) => setItems(d.items || []));
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Login report"
        description="Recent authentication activity across all roles."
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Last 100</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>{ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}</TableCell>
                  <TableCell>{ev.email}</TableCell>
                  <TableCell>{ev.role || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={ev.success ? 'success' : 'error'} tone={ev.success ? 'green' : 'red'}>
                      {ev.success ? 'success' : 'failed'}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    No login events yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
