'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/ip/PageHeader';

const STATUS_VARIANT = { pending: 'outline', accepted: 'default', declined: 'destructive', expired: 'secondary' };

export default function EmployerOffersPage() {
  const [items, setItems] = useState([]);
  const [endorseFor, setEndorseFor] = useState(null);
  const [endorseForm, setEndorseForm] = useState({ periodLabel: '', skillsEndorsed: '' });
  const [rateFor, setRateFor] = useState(null);
  const [stars, setStars] = useState(5);

  async function load() {
    const res = await fetch('/api/ip/offers');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function endorse() {
    await fetch('/api/ip/endorsements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: endorseFor.candidate_id,
        internshipId: endorseFor.internship_id,
        roleTitle: endorseFor.title,
        periodLabel: endorseForm.periodLabel,
        skillsEndorsed: endorseForm.skillsEndorsed.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setEndorseFor(null);
  }

  async function rate() {
    // candidate's account user id is not directly on offer row; ratings target user id resolved server-side via candidate.
    await fetch('/api/ip/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: rateFor.candidate_user_id, stars, internshipId: rateFor.internship_id }),
    });
    setRateFor(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Offers"
        description="Track offers sent from applicant pipelines."
      />
      <div className="space-y-3">
        {items.map((o) => (
          <Card key={o.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{o.role_title || o.title} — {o.candidate_name}</CardTitle>
                <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
              </div>
              <CardDescription>Stipend {o.stipend_inr ? `₹${o.stipend_inr}/mo` : '—'} · Starts {o.start_date ? new Date(o.start_date).toLocaleDateString() : '—'}</CardDescription>
            </CardHeader>
            {o.status === 'accepted' ? (
              <CardContent className="flex gap-2 flex-wrap">
                <Dialog open={endorseFor?.id === o.id} onOpenChange={(open) => !open && setEndorseFor(null)}>
                  <DialogTrigger render={<Button size="sm" variant="outline" onClick={() => setEndorseFor(o)}>Endorse candidate</Button>} />
                  <DialogContent>
                    <DialogHeader><DialogTitle>Endorse {o.candidate_name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Field><FieldLabel>Period (e.g. Jan–Mar 2026)</FieldLabel><Input value={endorseForm.periodLabel} onChange={(e) => setEndorseForm((f) => ({ ...f, periodLabel: e.target.value }))} /></Field>
                      <Field><FieldLabel>Skills endorsed (comma separated)</FieldLabel><Textarea rows={2} value={endorseForm.skillsEndorsed} onChange={(e) => setEndorseForm((f) => ({ ...f, skillsEndorsed: e.target.value }))} /></Field>
                    </div>
                    <DialogFooter><Button onClick={endorse}>Generate endorsement</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={rateFor?.id === o.id} onOpenChange={(open) => !open && setRateFor(null)}>
                  <DialogTrigger render={<Button size="sm" variant="outline" onClick={() => setRateFor(o)}>Rate candidate</Button>} />
                  <DialogContent>
                    <DialogHeader><DialogTitle>Rate {o.candidate_name}</DialogTitle></DialogHeader>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setStars(n)} className={n <= stars ? 'text-amber-500 text-2xl' : 'text-slate-300 text-2xl'}>★</button>
                      ))}
                    </div>
                    <DialogFooter><Button onClick={rate}>Submit rating</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
                <p className="text-xs text-muted-foreground w-full">Prefer marking the application complete on the applicants page after the internship ends.</p>
              </CardContent>
            ) : null}
          </Card>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">No offers yet — send one from a posting&apos;s applicant list.</p> : null}
      </div>
    </div>
  );
}
