'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ip/PageHeader';

const STATUS_VARIANT = { pending: 'outline', accepted: 'default', declined: 'destructive', expired: 'secondary' };

export default function CandidateOffersPage() {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [rateFor, setRateFor] = useState(null);
  const [stars, setStars] = useState(5);

  async function load() {
    const res = await fetch('/api/ip/offers');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function respond(id, status) {
    setBusyId(id);
    try {
      await fetch(`/api/ip/offers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusyId('');
    }
  }

  async function submitRating() {
    if (!rateFor?.employer_user_id) return;
    setBusyId(rateFor.id);
    try {
      await fetch('/api/ip/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: rateFor.employer_user_id,
          stars,
          internshipId: rateFor.internship_id,
        }),
      });
      setRateFor(null);
    } finally {
      setBusyId('');
    }
  }

  function shareToLinkedIn(offer) {
    const text = encodeURIComponent(`I'm excited to share I received an internship offer for ${offer.title}!`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&summary=${text}`, '_blank');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Offers"
        description="Review, accept or decline offers from employers."
      />
      <div className="space-y-3">
        {items.map((o) => (
          <Card key={o.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{o.role_title || o.title}</CardTitle>
                <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
              </div>
              <CardDescription>{o.company_name} · Stipend {o.stipend_inr ? `₹${o.stipend_inr}/mo` : '—'} · Starts {o.start_date ? new Date(o.start_date).toLocaleDateString() : '—'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {o.message ? <p className="text-sm text-muted-foreground">{o.message}</p> : null}
              {o.letter_url ? <a href={o.letter_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">View offer letter</a> : null}
              <div className="flex gap-2 flex-wrap">
                {o.status === 'pending' ? (
                  <>
                    <Button size="sm" disabled={busyId === o.id} onClick={() => respond(o.id, 'accepted')}>Accept</Button>
                    <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => respond(o.id, 'declined')}>Decline</Button>
                  </>
                ) : null}
                {o.status === 'accepted' && o.employer_user_id ? (
                  <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => { setRateFor(o); setStars(5); }}>
                    Rate employer
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => shareToLinkedIn(o)}>Share on LinkedIn</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">No offers yet.</p> : null}
      </div>

      {rateFor ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Rate {rateFor.company_name}</CardTitle>
            <CardDescription>Mutual rating after accepted offer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)} className={n <= stars ? 'text-amber-500 text-2xl' : 'text-slate-300 text-2xl'}>★</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={busyId === rateFor.id} onClick={submitRating}>Submit rating</Button>
              <Button size="sm" variant="ghost" onClick={() => setRateFor(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
