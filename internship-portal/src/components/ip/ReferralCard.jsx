'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { POINTS_PER_APPLICATION } from '@/lib/pointsEconomy';

/** Shared "Refer & earn" panel for candidate/employer. */
export default function ReferralCard({ role }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState('');

  async function reload() {
    const d = await fetch('/api/ip/referral').then((r) => r.json());
    setData(d);
  }

  useEffect(() => {
    reload();
  }, []);

  async function convertPoints() {
    if (role !== 'employer') return;
    setConverting(true);
    setConvertMsg('');
    try {
      const res = await fetch('/api/ip/points/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: 1 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setConvertMsg(`Converted ${body.spent} points → +${body.credited} posting credit(s).`);
      await reload();
    } catch (e) {
      setConvertMsg(e.message);
    } finally {
      setConverting(false);
    }
  }

  function copy() {
    const link = data?.viralLink || data?.referralLink;
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function shareLinkedIn() {
    const link = data?.viralLink || data?.referralLink;
    if (!link) return;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, '_blank');
  }
  function shareWhatsApp() {
    const link = data?.viralLink || data?.referralLink;
    if (!link) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Join Internship Portal using my referral link: ${link}`)}`,
      '_blank',
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Refer &amp; earn</CardTitle>
          <CardDescription>
            {role === 'employer'
              ? 'Earn points from referrals, then convert points into free internship posting credits.'
              : `Earn points from referrals. Candidate points are spent directly when applying (${POINTS_PER_APPLICATION} points per application) — no separate convert step.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input readOnly value={data?.viralLink || data?.referralLink || 'Loading…'} />
            <Button variant="outline" onClick={copy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Pretty share URL uses /r/&#123;code&#125;. Registration still accepts ?ref= as well.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={shareLinkedIn}>
              Share on LinkedIn
            </Button>
            <Button size="sm" variant="outline" onClick={shareWhatsApp}>
              Share on WhatsApp
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
            <span>
              Points: <strong>{data?.points ?? '—'}</strong>
            </span>
            {role === 'employer' ? (
              <>
                <span>
                  Free posting credits: <strong>{data?.free_post_credits ?? '—'}</strong>
                </span>
                <Button size="sm" onClick={convertPoints} disabled={converting}>
                  {converting ? 'Converting…' : 'Convert 50 pts → 1 posting credit'}
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">
                Apply cost: <strong>{POINTS_PER_APPLICATION} pts</strong> each
              </span>
            )}
          </div>
          {convertMsg ? (
            <Alert>
              <AlertDescription>{convertMsg}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referred user</TableHead>
                <TableHead className="min-w-[6.5rem]">Status</TableHead>
                <TableHead>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.referrals || []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.referred_name || r.referred_email || 'Pending signup'}</TableCell>
                  <TableCell className="min-w-[6.5rem]">
                    <Badge variant={r.status === 'completed' ? 'default' : 'outline'}>{r.status || 'pending'}</Badge>
                  </TableCell>
                  <TableCell>+{r.points_awarded}</TableCell>
                </TableRow>
              ))}
              {!data?.referrals?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No referrals yet — share your link!
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
