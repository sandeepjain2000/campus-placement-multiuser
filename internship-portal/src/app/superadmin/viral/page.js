'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ip/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SuperAdminViralPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [processMsg, setProcessMsg] = useState('');

  async function load() {
    const res = await fetch('/api/ip/viral');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function act(id, action) {
    setBusy(id + action);
    try {
      await fetch(`/api/ip/viral/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: action === 'fail' ? 'Rejected by SuperAdmin' : 'Verified by SuperAdmin',
        }),
      });
      await load();
    } finally {
      setBusy('');
    }
  }

  async function processDue() {
    setProcessMsg('Running…');
    const res = await fetch('/api/ip/viral/process-due', { method: 'POST' });
    const data = await res.json();
    setProcessMsg(`Processed ${data.processed || 0} due share(s).`);
    await load();
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Viral LinkedIn shares"
        description="Verify scheduled Google searches (~24h) or fast-track claims."
        actions={(
          <Button variant="outline" onClick={processDue}>Run due checks now</Button>
        )}
      />

      {processMsg ? (
        <Alert>
          <AlertDescription>{processMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Queue</CardTitle>
          <CardDescription>{items.length} share(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {s.user_name}
                    <div className="text-muted-foreground text-xs">{s.email}</div>
                  </TableCell>
                  <TableCell>{s.channel}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs">
                    <a href={s.share_url} className="underline" target="_blank" rel="noreferrer">
                      {s.share_url}
                    </a>
                    {s.claimed_post_url ? (
                      <div className="truncate">Post: {s.claimed_post_url}</div>
                    ) : null}
                    {s.search_notes ? (
                      <div className="text-muted-foreground">{s.search_notes}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status}>{s.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1 whitespace-nowrap">
                      <Button size="sm" disabled={!!busy} onClick={() => act(s.id, 'run_search')}>
                        Search
                      </Button>
                      <Button size="sm" disabled={!!busy} onClick={() => act(s.id, 'verify')}>
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!!busy}
                        onClick={() => act(s.id, 'fail')}
                      >
                        Fail
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    No viral shares.
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
