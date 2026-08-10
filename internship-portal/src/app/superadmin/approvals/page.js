'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ip/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const FILTERS = ['pending', 'approved', 'rejected'];

export default function SuperAdminApprovalsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    const res = await fetch(`/api/ip/superadmin/employers?status=${filter}`);
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
  }

  useEffect(() => {
    if (session?.user?.role === 'superadmin') load();
  }, [session, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id, approvalStatus) {
    setMsg('');
    setError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/ip/superadmin/employers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed');
      else {
        setMsg(`Updated to ${approvalStatus}`);
        load();
      }
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Employer approvals"
        description="Verify employer legitimacy before they can post internships."
        actions={(
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? 'default' : 'outline'}
                onClick={() => setFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        )}
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
          <CardTitle className="capitalize">{filter} employers</CardTitle>
          <CardDescription>{items.length} employer(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.company_name}</TableCell>
                  <TableCell>{e.work_email}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm">{e.website || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.approval_status}>{e.approval_status}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {filter === 'pending' ? (
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" disabled={busyId === e.id} onClick={() => setStatus(e.id, 'approved')}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === e.id}
                          onClick={() => setStatus(e.id, 'rejected')}
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
                    No {filter} employers.
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
