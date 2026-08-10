'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ip/PageHeader';
import UrlClaimDialog from '@/components/ip/UrlClaimDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function EmployerInternshipsPage() {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [promoteFor, setPromoteFor] = useState(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  async function load() {
    const res = await fetch('/api/ip/employer/internships');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id, status) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/ip/employer/internships/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  }

  async function startPromote(i) {
    setBusyId(i.id);
    setError('');
    setMsg('');
    try {
      const res = await fetch('/api/ip/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internshipId: i.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.shareUrl)}`, '_blank');
      setPendingPromotion(data);
      setPromoteFor(i);
      setClaimOpen(true);
      setMsg(`Promotion created. Include token ${data.token} in your post.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  }

  async function submitClaimUrl(postUrl) {
    if (!pendingPromotion?.id) return;
    setError('');
    try {
      await fetch(`/api/ip/promotions/${pendingPromotion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimedPostUrl: postUrl }),
      });
      setMsg('Submitted for SuperAdmin fast-track verification.');
    } catch (e) {
      setError(e.message || 'Failed to submit URL');
    } finally {
      setPendingPromotion(null);
      setPromoteFor(null);
    }
  }

  function share(i) {
    const url = `${window.location.origin}/candidate/internships/${i.id}`;
    const text = encodeURIComponent(`We're hiring: ${i.title}`);
    return {
      whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Postings"
        description={`${items.length} posting(s)`}
        actions={<Button render={<Link href="/employer/internships/new" />}>Post an internship</Button>}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage</CardTitle>
          <CardDescription>Publish, pause, promote, or close postings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Stipend</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead className="min-w-[6.5rem]">Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    <Link href={`/employer/internships/${i.id}`} className="hover:underline">
                      {i.title}
                    </Link>
                  </TableCell>
                  <TableCell>{i.stipend_inr ? `₹${i.stipend_inr}/mo` : 'Unpaid'}</TableCell>
                  <TableCell>{i.applicant_count}</TableCell>
                  <TableCell className="min-w-[6.5rem]">
                    <Badge variant={i.status === 'published' ? 'default' : 'outline'}>{i.status || 'draft'}</Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="outline" render={<Link href={`/employer/internships/${i.id}/edit`} />}>
                      Edit
                    </Button>
                    {i.status === 'published' ? (
                      <Button size="sm" variant="ghost" disabled={busyId === i.id} onClick={() => setStatus(i.id, 'paused')}>
                        Pause
                      </Button>
                    ) : i.status === 'paused' || i.status === 'draft' ? (
                      <Button size="sm" variant="ghost" disabled={busyId === i.id} onClick={() => setStatus(i.id, 'published')}>
                        Publish
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" disabled={busyId === i.id} onClick={() => startPromote(i)}>
                      Promote + verify
                    </Button>
                    <Button size="sm" variant="ghost" render={<a href={share(i).whatsapp} target="_blank" rel="noreferrer" />}>
                      WhatsApp
                    </Button>
                    <Button size="sm" variant="ghost" render={<a href={share(i).linkedin} target="_blank" rel="noreferrer" />}>
                      LinkedIn
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No postings yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UrlClaimDialog
        open={claimOpen}
        onOpenChange={(open) => {
          setClaimOpen(open);
          if (!open) {
            setPendingPromotion(null);
            setPromoteFor(null);
          }
        }}
        title={promoteFor ? `Fast-track: ${promoteFor.title}` : 'Paste LinkedIn post URL'}
        description="Optional. Paste the public LinkedIn post URL after sharing, or cancel to skip fast-track."
        confirmLabel="Submit for verification"
        onConfirm={submitClaimUrl}
      />
    </div>
  );
}
