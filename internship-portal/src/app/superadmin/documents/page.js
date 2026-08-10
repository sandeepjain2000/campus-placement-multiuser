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

export default function SuperAdminDocumentsPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [flagFor, setFlagFor] = useState(null);
  const [notes, setNotes] = useState('');

  async function load() {
    const res = await fetch('/api/ip/superadmin/documents');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function review(id, reviewStatus, reviewNotes = '') {
    setBusy(id);
    setError('');
    try {
      const res = await fetch('/api/ip/superadmin/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reviewStatus, notes: reviewNotes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Review failed');
        return;
      }
      setFlagFor(null);
      setNotes('');
      await load();
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Verification documents"
        description="Review Shop Act / LLP / PAN uploads from employers."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Queue</CardTitle>
          <CardDescription>{items.length} document(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    {d.company_name}
                    <div className="text-muted-foreground text-xs">{d.work_email}</div>
                  </TableCell>
                  <TableCell>{d.doc_type}</TableCell>
                  <TableCell>
                    {d.url ? (
                      <a className="text-primary text-sm underline" href={d.url} target="_blank" rel="noreferrer">
                        {d.file_name || 'Open'}
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.review_status || 'pending'}>
                      {d.review_status || 'pending'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" disabled={busy === d.id} onClick={() => review(d.id, 'approved')}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === d.id}
                        onClick={() => { setFlagFor(d); setNotes(''); }}
                      >
                        Flag
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    No documents uploaded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!flagFor} onOpenChange={(open) => { if (!open) setFlagFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag document</DialogTitle>
            <DialogDescription>
              Optional notes for {flagFor?.company_name || 'this employer'}.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="doc-flag-notes">Notes (optional)</FieldLabel>
            <Textarea
              id="doc-flag-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this document is flagged"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagFor(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy === flagFor?.id}
              onClick={() => review(flagFor.id, 'flagged', notes)}
            >
              Flag document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
