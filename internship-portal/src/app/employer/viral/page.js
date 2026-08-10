'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ip/PageHeader';
import UrlClaimDialog from '@/components/ip/UrlClaimDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EmployerViralPage() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [lastShare, setLastShare] = useState(null);
  const [claimId, setClaimId] = useState(null);

  async function load() {
    const d = await fetch('/api/ip/viral').then((r) => r.json());
    setData(d);
  }

  useEffect(() => {
    load();
  }, []);

  async function createShare(channel) {
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const res = await fetch('/api/ip/viral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setLastShare(body);
      setMsg(body.note || 'Share created.');
      if (channel === 'linkedin') {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(body.shareUrl)}`,
          '_blank',
        );
      } else if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(body.suggestedPostText)}`, '_blank');
      } else {
        await navigator.clipboard?.writeText(body.shareUrl);
        setMsg(`${body.note} Link copied.`);
      }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPostUrl(url) {
    if (!claimId) return;
    await fetch(`/api/ip/viral/${claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimedPostUrl: url }),
    });
    setClaimId(null);
    setMsg('Post URL submitted for SuperAdmin fast-track.');
    await load();
  }

  const shareLink = data?.referral_code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${data.referral_code}`
    : 'Loading…';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Viral board"
        description="Earn points / posting credits by sharing your referral link. LinkedIn posts are verified ~24h later via Google search (stub until search API keys are set)."
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Points</CardDescription>
            <CardTitle className="text-2xl">{data?.points ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Free post credits</CardDescription>
            <CardTitle className="text-2xl">{data?.free_post_credits ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reward per verified LinkedIn</CardDescription>
            <CardTitle className="text-lg">
              +{data?.rewardPreview?.points ?? 30} pts / +{data?.rewardPreview?.credits ?? 1} credit
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your shareable link</CardTitle>
          <CardDescription>Format: /r/&#123;your-code&#125; (tracks referrals like register?ref=)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input readOnly value={shareLink} />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/r/${data?.referral_code}`);
                setMsg('Link copied.');
              }}
            >
              Copy
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => createShare('linkedin')}>
              Share on LinkedIn (verify in ~24h)
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => createShare('whatsapp')}>
              Share on WhatsApp
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => createShare('other')}>
              Copy tracked link
            </Button>
          </div>
          {lastShare?.shareUrl ? (
            <p className="break-all text-xs text-muted-foreground">Tracked URL: {lastShare.shareUrl}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Share history</CardTitle>
          <CardDescription>Scheduled LinkedIn checks and other social shares.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="min-w-[6.5rem]">Status</TableHead>
                <TableHead>Check after</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.channel}</TableCell>
                  <TableCell className="min-w-[6.5rem]">
                    <Badge variant="outline">{s.status || 'pending'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.check_after ? new Date(s.check_after).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {s.channel === 'linkedin' &&
                    ['scheduled', 'pending', 'fast_track_pending'].includes(s.status) ? (
                      <Button size="sm" variant="ghost" onClick={() => setClaimId(s.id)}>
                        Paste post URL
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No shares yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UrlClaimDialog
        open={Boolean(claimId)}
        onOpenChange={(open) => {
          if (!open) setClaimId(null);
        }}
        title="Paste LinkedIn post URL"
        description="Fast-track for SuperAdmin if automated Google search is slow."
        confirmLabel="Submit URL"
        onConfirm={submitPostUrl}
      />
    </div>
  );
}
