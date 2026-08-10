'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ip/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function SuperAdminRequestsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    const res = await fetch('/api/ip/superadmin/requests');
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
  }

  useEffect(() => {
    if (session?.user?.role === 'superadmin') load();
  }, [session]);

  async function process(id, status) {
    setMsg('');
    setError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/ip/superadmin/requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed');
      else {
        setMsg(data.message || `Marked ${status}`);
        load();
      }
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Manual employer requests"
        description="Domain mismatch sign-ups that need manual review."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {msg ? (
        <Alert>
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Request queue</CardTitle>
          <CardDescription>{items.length} request(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.company_name || r.website}
                    {r.website ? (
                      <div className="text-muted-foreground text-xs">{r.website}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{r.contact_email}</TableCell>
                  <TableCell className="hidden max-w-[240px] truncate md:table-cell">
                    {r.reason || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status}>{r.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' ? (
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" disabled={busyId === r.id} onClick={() => process(r.id, 'approved')}>
                          Approve &amp; create account
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === r.id}
                          onClick={() => process(r.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    No manual requests.
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
