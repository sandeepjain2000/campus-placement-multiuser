'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import PageHeader from '@/components/ip/PageHeader';

export default function CandidateSearchPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [postings, setPostings] = useState([]);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [selectedInternship, setSelectedInternship] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch(`/api/ip/employer/candidates${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
    fetch('/api/ip/employer/internships').then((r) => r.json()).then((d) => setPostings((d.items || []).filter((i) => i.status === 'published')));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function invite() {
    if (!selectedInternship) return;
    const res = await fetch(`/api/ip/employer/candidates/${inviteTarget.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internshipId: selectedInternship }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Invite sent!' : data.error);
    setTimeout(() => { setInviteTarget(null); setMessage(''); }, 1200);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Search candidates"
        description="Only searchable profiles appear here. Phone/email/CV stay private until an interaction allows it."
      />
      <Card>
        <CardContent className="flex gap-2 pt-4">
          <Input placeholder="Search college, degree, city…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Button onClick={load}>Search</Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{c.name}</CardTitle>
              <CardDescription>{c.college} · {c.degree} {c.specialization ? `(${c.specialization})` : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-1 flex-wrap">{(c.skills || []).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
              <p className="text-xs text-muted-foreground">{c.city}{c.state ? `, ${c.state}` : ''} · {c.study_status}</p>
              <Dialog open={inviteTarget?.id === c.id} onOpenChange={(open) => !open && setInviteTarget(null)}>
                <DialogTrigger render={<Button size="sm" variant="outline" onClick={() => setInviteTarget(c)}>Invite to apply</Button>} />
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite {c.name}</DialogTitle></DialogHeader>
                  {message ? <p className="text-sm text-muted-foreground">{message}</p> : (
                    <div className="space-y-3">
                      <Select value={selectedInternship} onValueChange={setSelectedInternship}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose a posting" /></SelectTrigger>
                        <SelectContent>
                          {postings.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <DialogFooter><Button onClick={invite} disabled={!selectedInternship}>Send invite</Button></DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">No searchable candidates match yet.</p> : null}
      </div>
    </div>
  );
}
