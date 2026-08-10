'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ip/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

export default function SuperAdminPostingsPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [moderation, setModeration] = useState(null);
  const [reason, setReason] = useState('');

  async function load() {
    const res = await fetch('/api/ip/superadmin/postings');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function applyStatus(id, status, moderationReason = '') {
    setBusy(id);
    setError('');
    try {
      const res = await fetch('/api/ip/superadmin/postings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reason: moderationReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Update failed');
        return;
      }
      setModeration(null);
      setReason('');
      await load();
    } finally {
      setBusy('');
    }
  }

  function requestStatus(item, status) {
    if (status === 'closed' || status === 'paused') {
      setModeration({ id: item.id, title: item.title, status });
      setReason('');
      return;
    }
    applyStatus(item.id, status);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Posting moderation"
        description="Publish, pause, or take down internship postings."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>All postings</CardTitle>
          <CardDescription>{items.length} listing(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.title}</TableCell>
                  <TableCell>{i.company_name}</TableCell>
                  <TableCell>{i.applicant_count}</TableCell>
                  <TableCell>
                    <StatusBadge status={i.status}>{i.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === i.id}
                        onClick={() => requestStatus(i, 'published')}
                      >
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === i.id}
                        onClick={() => requestStatus(i, 'paused')}
                      >
                        Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === i.id}
                        onClick={() => requestStatus(i, 'closed')}
                      >
                        Take down
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    No postings.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!moderation} onOpenChange={(open) => { if (!open) setModeration(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderation?.status === 'closed' ? 'Take down posting' : 'Pause posting'}
            </DialogTitle>
            <DialogDescription>
              Optional moderation reason for {moderation?.title || 'this listing'}.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="posting-reason">Reason (optional)</FieldLabel>
            <Textarea
              id="posting-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Moderation reason"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeration(null)}>Cancel</Button>
            <Button
              variant={moderation?.status === 'closed' ? 'destructive' : 'default'}
              disabled={busy === moderation?.id}
              onClick={() => applyStatus(moderation.id, moderation.status, reason)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
