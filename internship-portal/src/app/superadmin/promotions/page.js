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

export default function SuperAdminPromotionsPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);
  const [notes, setNotes] = useState('');

  async function load() {
    const res = await fetch('/api/ip/promotions?status=');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function submitAct() {
    if (!review) return;
    setBusy(review.id);
    setError('');
    try {
      const res = await fetch(`/api/ip/promotions/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: review.action, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Action failed');
        return;
      }
      setReview(null);
      setNotes('');
      await load();
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="LinkedIn promotions"
        description="Verify pending / fast-track promotion claims (Google/Bing auto-verify deferred)."
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
          <CardDescription>{items.length} promotion(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company / role</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Claimed URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.company_name}
                    <div className="text-muted-foreground text-xs">{p.title}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.token}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">
                    {p.claimed_post_url ? (
                      <a href={p.claimed_post_url} className="underline" target="_blank" rel="noreferrer">
                        {p.claimed_post_url}
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status}>{p.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {['pending', 'fast_track_pending'].includes(p.status) ? (
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          disabled={busy === p.id}
                          onClick={() => { setReview({ id: p.id, action: 'verify', label: 'Verify + reward' }); setNotes(''); }}
                        >
                          Verify + reward
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy === p.id}
                          onClick={() => { setReview({ id: p.id, action: 'fail', label: 'Fail' }); setNotes(''); }}
                        >
                          Fail
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
                    No promotions yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!review} onOpenChange={(open) => { if (!open) setReview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{review?.label || 'Review promotion'}</DialogTitle>
            <DialogDescription>Optional review notes for this promotion claim.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="promo-notes">Review notes (optional)</FieldLabel>
            <Textarea
              id="promo-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(null)}>Cancel</Button>
            <Button
              variant={review?.action === 'fail' ? 'destructive' : 'default'}
              disabled={busy === review?.id}
              onClick={submitAct}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
