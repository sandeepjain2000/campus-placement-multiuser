'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChangePasswordCard from '@/components/auth/ChangePasswordCard';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ip/PageHeader';
import IpUploadButton from '@/components/ip/IpUploadButton';
import { imageAcceptAttr } from '@/lib/ipFileUpload';

function OptionalYesNo({ value, onChange, id }) {
  const current = value === true ? 'yes' : value === false ? 'no' : '';
  return (
    <select
      id={id}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : v === 'yes');
      }}
    >
      <option value="">Prefer not to say</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

export default function CandidateProfilePage() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [endorsements, setEndorsements] = useState([]);

  useEffect(() => {
    fetch('/api/ip/candidate/profile').then((r) => r.json()).then((d) => setForm(d.profile));
    fetch('/api/ip/endorsements').then((r) => r.json()).then((d) => setEndorsements(d.items || [])).catch(() => {});
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/ip/candidate/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          skills: typeof form.skills === 'string' ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : form.skills,
          preferred_locations: typeof form.preferred_locations === 'string'
            ? form.preferred_locations.split(',').map((s) => s.trim()).filter(Boolean)
            : form.preferred_locations,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.profileComplete ? 'Profile saved — profile is complete!' : 'Profile saved. A few required fields are still missing.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidate profile"
        description="Complete required basics to unlock applying. Work-readiness questions are optional."
      />
      {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={save}>
            <Tabs defaultValue="basics">
              <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="readiness">Work readiness</TabsTrigger>
                <TabsTrigger value="privacy">Privacy &amp; photo</TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel>Full name</FieldLabel><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required /></Field>
                <Field><FieldLabel>Email (read-only)</FieldLabel><Input value={form.account_email || ''} disabled /></Field>
                <Field><FieldLabel>Mobile</FieldLabel><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
                <Field><FieldLabel>City</FieldLabel><Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
                <Field><FieldLabel>State</FieldLabel><Input value={form.state || ''} onChange={(e) => set('state', e.target.value)} /></Field>
                <Field><FieldLabel>Availability / start date</FieldLabel><Input type="date" value={form.availability_date ? String(form.availability_date).slice(0, 10) : ''} onChange={(e) => set('availability_date', e.target.value)} /></Field>
                <Field><FieldLabel>Preferred work mode</FieldLabel><Input value={form.preferred_work_mode || ''} onChange={(e) => set('preferred_work_mode', e.target.value)} placeholder="Remote / Hybrid / On-site" /></Field>
                <Field className="sm:col-span-2"><FieldLabel>Preferred locations (comma separated)</FieldLabel><Input value={Array.isArray(form.preferred_locations) ? form.preferred_locations.join(', ') : (form.preferred_locations || '')} onChange={(e) => set('preferred_locations', e.target.value)} /></Field>
                <Field><FieldLabel>Resume / CV URL</FieldLabel><Input value={form.resume_url || ''} onChange={(e) => set('resume_url', e.target.value)} placeholder="https://…" required /></Field>
                <Field><FieldLabel>LinkedIn URL</FieldLabel><Input value={form.linkedin_url || ''} onChange={(e) => set('linkedin_url', e.target.value)} /></Field>
                <Field className="sm:col-span-2"><FieldLabel>GitHub / portfolio URL</FieldLabel><Input value={form.github_url || form.portfolio_url || ''} onChange={(e) => set('github_url', e.target.value)} /></Field>
              </TabsContent>

              <TabsContent value="academic" className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel>College / university</FieldLabel><Input value={form.college || ''} onChange={(e) => set('college', e.target.value)} /></Field>
                <Field><FieldLabel>Degree</FieldLabel><Input value={form.degree || ''} onChange={(e) => set('degree', e.target.value)} /></Field>
                <Field><FieldLabel>Specialization</FieldLabel><Input value={form.specialization || ''} onChange={(e) => set('specialization', e.target.value)} /></Field>
                <Field><FieldLabel>Study status</FieldLabel><Input value={form.study_status || ''} onChange={(e) => set('study_status', e.target.value)} placeholder="Studying / Graduated" /></Field>
                <Field><FieldLabel>Graduation year</FieldLabel><Input type="number" value={form.graduation_year || ''} onChange={(e) => set('graduation_year', e.target.value)} /></Field>
                <Field><FieldLabel>CGPA / percentage</FieldLabel><Input value={form.cgpa || ''} onChange={(e) => set('cgpa', e.target.value)} /></Field>
                <Field className="sm:col-span-2"><FieldLabel>Skills (comma separated)</FieldLabel><Input value={Array.isArray(form.skills) ? form.skills.join(', ') : (form.skills || '')} onChange={(e) => set('skills', e.target.value)} /></Field>
              </TabsContent>

              <TabsContent value="readiness" className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  All questions on this tab are optional — answer only what you are comfortable sharing.
                </div>
                <Field>
                  <FieldLabel>Wired or Wi-Fi broadband?</FieldLabel>
                  <FieldDescription>Not mobile 4G/5G hotspot only.</FieldDescription>
                  <OptionalYesNo value={form.has_wired_broadband} onChange={(v) => set('has_wired_broadband', v)} />
                </Field>
                <Field>
                  <FieldLabel>Dedicated laptop available?</FieldLabel>
                  <FieldDescription>A laptop that is regularly available for your work.</FieldDescription>
                  <OptionalYesNo value={form.has_dedicated_laptop} onChange={(v) => set('has_dedicated_laptop', v)} />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Preferred working hours range</FieldLabel>
                  <FieldDescription>
                    Availability window (when you can work), not total hours. Examples: 10:00–18:00, 14:00–20:00, 09:00–13:00.
                  </FieldDescription>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Input type="time" className="w-36" value={form.preferred_hours_start || ''} onChange={(e) => set('preferred_hours_start', e.target.value)} />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input type="time" className="w-36" value={form.preferred_hours_end || ''} onChange={(e) => set('preferred_hours_end', e.target.value)} />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Ongoing commitment?</FieldLabel>
                  <FieldDescription>Another internship, offline classes, or similar.</FieldDescription>
                  <OptionalYesNo value={form.ongoing_commitment} onChange={(v) => set('ongoing_commitment', v)} />
                </Field>
                <Field>
                  <FieldLabel>Commitment note (optional)</FieldLabel>
                  <Input value={form.ongoing_commitment_note || ''} onChange={(e) => set('ongoing_commitment_note', e.target.value)} placeholder="e.g. evening classes Mon–Wed" />
                </Field>
              </TabsContent>

              <TabsContent value="privacy" className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel>Profile picture</FieldLabel>
                  <FieldDescription>
                    Upload a photo (stored like Placement Hub) or paste a link. You can still opt out of displaying it.
                  </FieldDescription>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {form.profile_picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.profile_picture_url}
                        alt=""
                        className="size-16 rounded-md object-cover border"
                      />
                    ) : null}
                    <IpUploadButton
                      endpoint="/api/ip/candidate/profile/photo/upload"
                      accept={imageAcceptAttr()}
                      label="Upload photo"
                      onUploaded={(data) => {
                        if (data.profile_picture_url || data.fileUrl) {
                          set('profile_picture_url', data.profile_picture_url || data.fileUrl);
                          setMessage('Photo uploaded. Display is controlled by the checkbox below.');
                        }
                      }}
                    />
                  </div>
                  <Input
                    className="mt-2"
                    value={form.profile_picture_url || ''}
                    onChange={(e) => set('profile_picture_url', e.target.value)}
                    placeholder="Or paste image URL https://…"
                  />
                </Field>
                <div className="sm:col-span-2 space-y-3">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={form.show_profile_picture !== false}
                      onCheckedChange={(v) => set('show_profile_picture', Boolean(v))}
                    />
                    <span>Display my profile picture to employers (uncheck to opt out of display while keeping the uploaded photo)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.searchable} onCheckedChange={(v) => set('searchable', Boolean(v))} />Make my profile searchable by employers (phone/email/CV stay hidden until an interaction allows it)</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.show_completed_internships} onCheckedChange={(v) => set('show_completed_internships', Boolean(v))} />Show my completed internships/ratings to employers</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.whatsapp_opt_in} onCheckedChange={(v) => set('whatsapp_opt_in', Boolean(v))} />Opt in to WhatsApp communication</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.telegram_opt_in} onCheckedChange={(v) => set('telegram_opt_in', Boolean(v))} />Opt in to Telegram communication</label>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endorsements &amp; completed internships</CardTitle>
          <CardDescription>System-generated when an employer endorses you after completion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {endorsements.map((e) => (
            <div key={e.id} className="border rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between items-start">
                <p className="font-medium">{e.company_name} — {e.role_title || 'Internship'}</p>
                <Button size="sm" variant="ghost" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`, '_blank')}>
                  Share on LinkedIn
                </Button>
              </div>
              <p className="text-muted-foreground">{e.certificate_text}</p>
              {e.skills_endorsed?.length ? (
                <div className="flex gap-1 flex-wrap">{e.skills_endorsed.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
              ) : null}
            </div>
          ))}
          {!endorsements.length ? <p className="text-sm text-muted-foreground">No endorsements yet.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Export</CardTitle><CardDescription>Export your applications and profile to Excel.</CardDescription></CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" render={<a href="/api/ip/candidate/export" />}>
            Download Excel (.csv)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
