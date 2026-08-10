'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/ip/PageHeader';

const STATUS_OPTIONS = ['applied', 'shortlisted', 'interviewing', 'rejected', 'hired', 'completed'];
const STATUS_VARIANT = {
  applied: 'outline', shortlisted: 'default', interviewing: 'default', hired: 'default',
  rejected: 'destructive', offered: 'default', completed: 'default',
};

export default function ApplicantsPipelinePage() {
  const { id } = useParams();
  const [internship, setInternship] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [offerFor, setOfferFor] = useState(null);
  const [offerForm, setOfferForm] = useState({ roleTitle: '', stipendInr: '', startDate: '', validUntil: '', letterUrl: '', message: '' });
  const [q, setQ] = useState('');
  const [status, setStatusFilter] = useState('');
  const [minMatch, setMinMatch] = useState('');

  async function load() {
    const int = await fetch(`/api/ip/employer/internships/${id}`).then((r) => r.json());
    setInternship(int.internship);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (minMatch) params.set('minMatch', minMatch);
    const apps = await fetch(`/api/ip/employer/internships/${id}/applicants?${params}`).then((r) => r.json());
    setApplicants(apps.items || []);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(appId, next) {
    await fetch(`/api/ip/employer/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    await load();
  }

  async function markComplete(appId) {
    await fetch('/api/ip/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId }),
    });
    await load();
  }

  function openOffer(a) {
    setOfferFor(a);
    setOfferForm({ roleTitle: internship?.title || '', stipendInr: internship?.stipend_inr || '', startDate: '', validUntil: '', letterUrl: '', message: '' });
  }

  async function sendOffer() {
    await fetch('/api/ip/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: offerFor.id, ...offerForm, stipendInr: offerForm.stipendInr ? Number(offerForm.stipendInr) : null }),
    });
    setOfferFor(null);
    await load();
  }

  if (!internship) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={internship.title}
        description={`${applicants.length} applicant(s)`}
      />
      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-4">
          <Input placeholder="Search name/college" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select className="h-9 rounded-md border px-2 text-sm" value={status} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.concat('offered').map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Input placeholder="Min match %" type="number" value={minMatch} onChange={(e) => setMinMatch(e.target.value)} className="max-w-[120px]" />
          <Button size="sm" onClick={load}>Filter</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Applicants</CardTitle><CardDescription>Sorted by match score</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead><TableHead>College</TableHead><TableHead>Match</TableHead>
                <TableHead>Answers</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicants.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.name}
                    <div className="text-xs text-muted-foreground">{a.skills?.join(', ')}</div>
                    {a.preferred_hours_start && a.preferred_hours_end ? (
                      <div className="text-xs text-muted-foreground">Hours {a.preferred_hours_start}–{a.preferred_hours_end}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{a.college}<div className="text-xs text-muted-foreground">{a.degree}</div></TableCell>
                  <TableCell>{a.match_score != null ? `${a.match_score}%` : '—'}</TableCell>
                  <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                    {a.answers && Object.keys(a.answers).length
                      ? Object.entries(a.answers).map(([k, v]) => <div key={k}><strong>{k}:</strong> {String(v)}</div>)
                      : '—'}
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[a.status] || 'outline'}>{a.status}</Badge></TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    {STATUS_OPTIONS.filter((s) => s !== a.status && s !== 'completed').map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => setStatus(a.id, s)}>{s}</Button>
                    ))}
                    {a.status === 'hired' || a.status === 'offered' ? (
                      <Button size="sm" variant="secondary" onClick={() => markComplete(a.id)}>Mark complete</Button>
                    ) : null}
                    <Dialog open={offerFor?.id === a.id} onOpenChange={(open) => !open && setOfferFor(null)}>
                      <DialogTrigger render={<Button size="sm" onClick={() => openOffer(a)}>Offer</Button>} />
                      <DialogContent>
                        <DialogHeader><DialogTitle>Send offer to {a.name}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <Field><FieldLabel>Role title</FieldLabel><Input value={offerForm.roleTitle} onChange={(e) => setOfferForm((f) => ({ ...f, roleTitle: e.target.value }))} /></Field>
                          <Field><FieldLabel>Stipend (INR/mo)</FieldLabel><Input type="number" value={offerForm.stipendInr} onChange={(e) => setOfferForm((f) => ({ ...f, stipendInr: e.target.value }))} /></Field>
                          <Field><FieldLabel>Start date</FieldLabel><Input type="date" value={offerForm.startDate} onChange={(e) => setOfferForm((f) => ({ ...f, startDate: e.target.value }))} /></Field>
                          <Field><FieldLabel>Valid until</FieldLabel><Input type="date" value={offerForm.validUntil} onChange={(e) => setOfferForm((f) => ({ ...f, validUntil: e.target.value }))} /></Field>
                          <Field><FieldLabel>Offer letter URL</FieldLabel><Input value={offerForm.letterUrl} onChange={(e) => setOfferForm((f) => ({ ...f, letterUrl: e.target.value }))} placeholder="https://…" /></Field>
                          <Field><FieldLabel>Message</FieldLabel><Textarea rows={3} value={offerForm.message} onChange={(e) => setOfferForm((f) => ({ ...f, message: e.target.value }))} /></Field>
                        </div>
                        <DialogFooter>
                          <Button onClick={sendOffer}>Send offer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {!applicants.length ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No applicants yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
