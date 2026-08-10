'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { FileEdit, Plus } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_OFFER_TEMPLATE_BODY, OFFER_TEMPLATE_PLACEHOLDERS } from '@/lib/offerTemplateRender';
import { formatCurrency } from '@/lib/utils';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import EmployerListFormLayout from '@/components/employer/EmployerListFormLayout';
import OfferEventTypeTabs, { OFFER_EVENT_TABS } from '@/components/employer/OfferEventTypeTabs';
import { countOfferEventTypes, normalizeOfferEventType, templateMatchesEventTab } from '@/lib/offerEventType';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load templates');
  return json;
};

const emptyForm = {
  name: '',
  jobTitle: '',
  salary: '',
  location: '',
  joiningDate: '',
  responseDeadline: '',
  bodyTemplate: DEFAULT_OFFER_TEMPLATE_BODY,
  eventType: 'drive',
};

const ADMIN_INPUT_CLASS =
  'border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

function eventTypeLabel(id) {
  return OFFER_EVENT_TABS.find((t) => t.id === id)?.label || id;
}

export default function EmployerOfferTemplatesPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/offer-templates', fetcher);
  const templates = useMemo(() => (Array.isArray(data?.templates) ? data.templates : []), [data?.templates]);

  const [eventTab, setEventTab] = useState('drive');
  const [mode, setMode] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const eventCounts = useMemo(
    () =>
      countOfferEventTypes(templates, (t) =>
        normalizeOfferEventType(t.eventType ?? t.event_type),
      ),
    [templates],
  );

  const tabTemplates = useMemo(
    () => templates.filter((t) => templateMatchesEventTab(t, eventTab)),
    [templates, eventTab],
  );

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, eventType: eventTab });
    setMode('form');
  };

  const openEdit = (t) => {
    setEditId(t.id);
    setForm({
      name: t.name || '',
      jobTitle: t.jobTitle || '',
      salary: t.salary != null ? String(t.salary) : '',
      location: t.location || '',
      joiningDate: t.joiningDate || '',
      responseDeadline: t.responseDeadline || '',
      bodyTemplate: t.bodyTemplate || DEFAULT_OFFER_TEMPLATE_BODY,
      eventType: normalizeOfferEventType(t.eventType ?? t.event_type),
    });
    setMode('form');
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: Number(form.salary || 0),
      };
      const url = editId ? `/api/employer/offer-templates/${editId}` : '/api/employer/offer-templates';
      const res = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast(editId ? 'Template updated.' : 'Template created.', 'success');
      setMode(null);
      await mutate();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = useCallback(
    async (id) => {
      if (!window.confirm('Remove this template? Existing offers keep their generated letters.')) return;
      try {
        const res = await fetch(`/api/employer/offer-templates/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Delete failed');
        addToast('Template removed.', 'success');
        await mutate();
      } catch (e) {
        addToast(e.message || 'Delete failed', 'error');
      }
    },
    [addToast, mutate],
  );

  if (mode === 'form') {
    return (
      <EmployerListFormLayout
        title={editId ? 'Edit offer template' : 'New offer template'}
        subtitle="CTC and dates are fixed for every student when you bulk-generate. Use placeholders in the letter body for student-specific text."
        onBack={() => setMode(null)}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setMode(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving…' : 'Save template'}
            </Button>
          </div>
        }
      >
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Template name</FieldLabel>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. TechCorp SDE — Mar 2026" />
          </Field>
          <Field>
            <FieldLabel>Event type</FieldLabel>
            <AdminFilterSelect
              className="w-full"
              value={form.eventType}
              onValueChange={(eventType) => setForm((p) => ({ ...p, eventType }))}
              emptyMapsToAll={false}
              items={OFFER_EVENT_TABS.map((t) => ({ label: t.label, value: t.id }))}
            />
          </Field>
          <Field>
            <FieldLabel>Role / job title</FieldLabel>
            <Input value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="offer-template-salary">CTC (INR annual — fixed for all offers from this template)</FieldLabel>
            <ValidatedNumberInput id="offer-template-salary" className={ADMIN_INPUT_CLASS} fieldId={FIELD_IDS.EMPLOYER_OFFER_SALARY} value={form.salary} onChange={(v) => setForm((p) => ({ ...p, salary: v }))} />
          </Field>
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="offer-template-joining-date">Joining date</FieldLabel>
            <ValidatedDateInput id="offer-template-joining-date" className={ADMIN_INPUT_CLASS} fieldId={FIELD_IDS.EMPLOYER_OFFER_JOINING} context={{ deadline: form.responseDeadline }} value={form.joiningDate} onChange={(v) => setForm((p) => ({ ...p, joiningDate: v }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="offer-template-response-deadline">Response deadline</FieldLabel>
            <ValidatedDateInput id="offer-template-response-deadline" className={ADMIN_INPUT_CLASS} fieldId={FIELD_IDS.EMPLOYER_OFFER_DEADLINE} value={form.responseDeadline} onChange={(v) => setForm((p) => ({ ...p, responseDeadline: v }))} />
          </Field>
        </FieldGroup>
        <Field className="mt-4">
          <FieldLabel>Letter body</FieldLabel>
          <FieldDescription>
            Placeholders:{' '}
            {OFFER_TEMPLATE_PLACEHOLDERS.map((p) => `{{${p.key}}}`).join(', ')}. CTC is <strong>not</strong> a placeholder — it
            comes from the CTC field above.
          </FieldDescription>
          <Textarea rows={12} value={form.bodyTemplate} onChange={(e) => setForm((p) => ({ ...p, bodyTemplate: e.target.value }))} />
        </Field>
      </EmployerListFormLayout>
    );
  }

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <FileEdit className="text-muted-foreground size-7" /> Offer templates
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm leading-relaxed">
            Reusable letter layouts with fixed CTC. Use{' '}
            <Link href="/dashboard/employer/offers" className="link-inline" style={{ fontWeight: 600 }}>
              Offers → Generate from selections
            </Link>{' '}
            to create pending offers and email all new selections.
          </p>
        </div>
        <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" /> New template</Button>
      </div>

      <OfferEventTypeTabs activeTab={eventTab} onTabChange={setEventTab} counts={eventCounts} />

      {error ? <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert> : null}
      {isLoading ? <div className="skeleton skeleton-card" style={{ height: 200 }} /> : null}

      {!isLoading && tabTemplates.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-muted-foreground m-0">
            No {eventTypeLabel(eventTab).toLowerCase()} templates yet.
            {eventTab === 'drive'
              ? ' Create one before bulk-generating drive offers.'
              : eventTab === 'internship'
                ? ' Create one for internship selection offers (and PPO job offers after internship).'
                : ' Create one for alumni job offer letters.'}
          </p>
          <Button type="button" onClick={openCreate}>
            Create {eventTypeLabel(eventTab).toLowerCase()} template
          </Button>
        </CardContent></Card>
      ) : null}

      <div className="flex flex-col gap-4">
        {tabTemplates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription className="mt-1">
                  {t.jobTitle} · CTC {formatCurrency(Number(t.salary) || 0)} · {t.location || 'Location TBD'}
                </CardDescription>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <StandardTableIconAction action="edit" onClick={() => openEdit(t)} />
                <StandardTableIconAction action="delete" variant="danger" onClick={() => deactivate(t.id)} />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
