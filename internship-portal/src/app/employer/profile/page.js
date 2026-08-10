'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import ChangePasswordCard from '@/components/auth/ChangePasswordCard';
import PageHeader from '@/components/ip/PageHeader';
import IpUploadButton from '@/components/ip/IpUploadButton';
import { documentAcceptAttr, imageAcceptAttr } from '@/lib/ipFileUpload';

const DOC_TYPES = ['Shop Act', 'LLP registration', 'Business PAN', 'Other'];

export default function EmployerProfilePage() {
  const [form, setForm] = useState(null);
  const [docs, setDocs] = useState([]);
  const [ethicsItems, setEthicsItems] = useState([]);
  const [ethicsVersion, setEthicsVersion] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [docUrl, setDocUrl] = useState('');
  const [docFileName, setDocFileName] = useState('');

  async function load() {
    const res = await fetch('/api/ip/employer/profile');
    const data = await res.json();
    setForm({
      ...data.profile,
      ethics_acks: data.profile?.ethics_acks || {},
    });
    setDocs(data.documents || []);
    setEthicsItems(data.ethicsItems || []);
    setEthicsVersion(data.ethicsVersion || '');
  }

  useEffect(() => { load(); }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setEthics(id, checked) {
    setForm((f) => ({
      ...f,
      ethics_acks: { ...(f.ethics_acks || {}), [id]: Boolean(checked) },
    }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/ip/employer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.profileComplete) {
        setMessage('Profile saved — complete! (Company fields + all Guidelines & Ethics checkboxes.)');
      } else if (!data.ethicsComplete) {
        setMessage('Profile saved, but Guidelines & Ethics is incomplete — check all boxes to finish profile completion.');
      } else {
        setMessage('Profile saved. A few required company fields are still missing.');
      }
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addDoc(e) {
    e.preventDefault();
    if (!docFileName && !docUrl) return;
    await fetch('/api/ip/employer/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, fileName: docFileName, url: docUrl }),
    });
    setDocFileName('');
    setDocUrl('');
    await load();
  }

  if (!form) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employer profile"
        description="Complete this to unlock posting internships."
        actions={
          <Badge variant={form.approval_status === 'approved' ? 'default' : 'outline'} className="min-w-fit">
            {form.approval_status || 'Pending'}
          </Badge>
        }
      />
      {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
      <Card>
        <CardHeader><CardTitle className="text-base">Company details</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <Field><FieldLabel>Company / legal name</FieldLabel><Input value={form.company_name || ''} onChange={(e) => set('company_name', e.target.value)} required /></Field>
            <Field><FieldLabel>Brand / trading name</FieldLabel><Input value={form.brand_name || ''} onChange={(e) => set('brand_name', e.target.value)} /></Field>
            <Field><FieldLabel>Website</FieldLabel><Input value={form.website || ''} onChange={(e) => set('website', e.target.value)} required /></Field>
            <Field><FieldLabel>Work email</FieldLabel><Input value={form.work_email || ''} onChange={(e) => set('work_email', e.target.value)} required /></Field>
            <Field><FieldLabel>Industry</FieldLabel><Input value={form.industry || ''} onChange={(e) => set('industry', e.target.value)} required /></Field>
            <Field><FieldLabel>Company size</FieldLabel><Input value={form.company_size || ''} onChange={(e) => set('company_size', e.target.value)} placeholder="1-10 / 11-50 / 51-200…" /></Field>
            <Field><FieldLabel>HQ city</FieldLabel><Input value={form.hq_city || ''} onChange={(e) => set('hq_city', e.target.value)} required /></Field>
            <Field><FieldLabel>HQ state</FieldLabel><Input value={form.hq_state || ''} onChange={(e) => set('hq_state', e.target.value)} /></Field>
            <Field><FieldLabel>Contact person</FieldLabel><Input value={form.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} required /></Field>
            <Field><FieldLabel>Designation</FieldLabel><Input value={form.contact_designation || ''} onChange={(e) => set('contact_designation', e.target.value)} /></Field>
            <Field><FieldLabel>Contact phone</FieldLabel><Input value={form.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} required /></Field>
            <Field className="sm:col-span-2">
              <FieldLabel>Company logo</FieldLabel>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url} alt="" className="size-14 rounded-md object-contain border bg-white" />
                ) : null}
                <IpUploadButton
                  endpoint="/api/ip/employer/profile/logo/upload"
                  accept={imageAcceptAttr()}
                  label="Upload logo"
                  onUploaded={(data) => {
                    if (data.logo_url || data.fileUrl) {
                      set('logo_url', data.logo_url || data.fileUrl);
                      setMessage('Logo uploaded to cloud storage.');
                    }
                  }}
                />
              </div>
              <Input
                className="mt-2"
                value={form.logo_url || ''}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="Or paste logo URL https://…"
              />
            </Field>
            <Field><FieldLabel>LinkedIn / company page</FieldLabel><Input value={form.linkedin_url || ''} onChange={(e) => set('linkedin_url', e.target.value)} /></Field>
            <Field className="sm:col-span-2"><FieldLabel>About the company</FieldLabel><Textarea rows={3} value={form.about || ''} onChange={(e) => set('about', e.target.value)} /></Field>

            <div className="sm:col-span-2 space-y-2 pt-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.show_identity_on_posting} onCheckedChange={(v) => set('show_identity_on_posting', Boolean(v))} />Show company identity on internship postings</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.show_hiring_numbers} onCheckedChange={(v) => set('show_hiring_numbers', Boolean(v))} />Show hiring numbers to applicants</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.whatsapp_opt_in} onCheckedChange={(v) => set('whatsapp_opt_in', Boolean(v))} />Opt in to WhatsApp communication</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.telegram_opt_in} onCheckedChange={(v) => set('telegram_opt_in', Boolean(v))} />Opt in to Telegram communication</label>
            </div>
            <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guidelines &amp; Ethics</CardTitle>
          <CardDescription>
            Required for profile completion before posting. Confirm each item. Version: {ethicsVersion || '—'}
            {form.ethics_accepted_at ? ` · Accepted ${new Date(form.ethics_accepted_at).toLocaleString()}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(ethicsItems.length ? ethicsItems : []).map((item) => (
            <label key={item.id} className="flex items-start gap-3 text-sm border rounded-md p-3 bg-slate-50">
              <Checkbox
                className="mt-0.5"
                checked={!!form.ethics_acks?.[item.id]}
                onCheckedChange={(v) => setEthics(item.id, v)}
              />
              <span>{item.label}</span>
            </label>
          ))}
          {!ethicsItems.length ? (
            <p className="text-sm text-muted-foreground">Ethics checklist failed to load. Refresh the page.</p>
          ) : null}
          <Button type="button" disabled={saving} onClick={(e) => save(e)}>
            {saving ? 'Saving…' : 'Save ethics acknowledgements'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification documents (optional)</CardTitle>
          <CardDescription>
            Shop Act, LLP registration, Business PAN, or other company-registration evidence. Upload a file (PDF/image)
            or paste a link reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between border rounded-md p-2 text-sm gap-2">
              <span className="min-w-0 truncate">
                {d.doc_type} —{' '}
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                    {d.file_name || 'Open file'}
                  </a>
                ) : (
                  d.file_name || '—'
                )}
              </span>
              <Badge variant={d.review_status === 'approved' ? 'default' : 'outline'}>{d.review_status}</Badge>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 items-end">
            <select className="border rounded-md h-9 px-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <IpUploadButton
              endpoint="/api/ip/employer/documents/upload"
              accept={documentAcceptAttr()}
              label="Upload file"
              extraFormData={{ docType }}
              onUploaded={async () => {
                setMessage('Document uploaded.');
                await load();
              }}
            />
          </div>
          <form className="flex flex-wrap gap-2 items-end" onSubmit={addDoc}>
            <Input placeholder="File name" value={docFileName} onChange={(e) => setDocFileName(e.target.value)} className="max-w-[160px]" />
            <Input placeholder="URL (optional)" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} className="max-w-[220px]" />
            <Button type="submit" size="sm" variant="outline">Add link reference</Button>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
