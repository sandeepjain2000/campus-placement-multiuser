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

function eventTypeLabel(id) {
  return OFFER_EVENT_TABS.find((t) => t.id === id)?.label || id;
}

export default function EmployerOfferTemplatesPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/offer-templates', fetcher);
  const templates = Array.isArray(data?.templates) ? data.templates : [];

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
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setMode(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        }
      >
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Template name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. TechCorp SDE — Mar 2026" />
          </div>
          <div className="form-group">
            <label className="form-label">Event type</label>
            <select
              className="form-select"
              value={form.eventType}
              onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}
            >
              {OFFER_EVENT_TABS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Role / job title</label>
            <input className="form-input" value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">CTC (INR annual — fixed for all offers from this template)</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_OFFER_SALARY} value={form.salary} onChange={(v) => setForm((p) => ({ ...p, salary: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Joining date</label>
            <ValidatedDateInput fieldId={FIELD_IDS.EMPLOYER_OFFER_JOINING} context={{ deadline: form.responseDeadline }} value={form.joiningDate} onChange={(v) => setForm((p) => ({ ...p, joiningDate: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Response deadline</label>
            <ValidatedDateInput fieldId={FIELD_IDS.EMPLOYER_OFFER_DEADLINE} value={form.responseDeadline} onChange={(v) => setForm((p) => ({ ...p, responseDeadline: v }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Letter body</label>
          <p className="text-xs text-secondary" style={{ margin: '0 0 0.5rem' }}>
            Placeholders:{' '}
            {OFFER_TEMPLATE_PLACEHOLDERS.map((p) => `{{${p.key}}}`).join(', ')}. CTC is <strong>not</strong> a placeholder — it
            comes from the CTC field above.
          </p>
          <textarea className="form-textarea" rows={12} value={form.bodyTemplate} onChange={(e) => setForm((p) => ({ ...p, bodyTemplate: e.target.value }))} />
        </div>
      </EmployerListFormLayout>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileEdit size={22} /> Offer templates
          </h1>
          <p className="text-secondary" style={{ margin: '0.25rem 0 0', lineHeight: 1.55 }}>
            Reusable letter layouts with fixed CTC. Use{' '}
            <Link href="/dashboard/employer/offers" className="link-inline" style={{ fontWeight: 600 }}>
              Offers → Generate from selections
            </Link>{' '}
            to create pending offers and email all new selections.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} aria-hidden /> New template
        </button>
      </div>

      <OfferEventTypeTabs activeTab={eventTab} onTabChange={setEventTab} counts={eventCounts} />

      {error ? <p style={{ color: 'var(--danger-600)' }}>{error.message}</p> : null}
      {isLoading ? <div className="skeleton skeleton-card" style={{ height: 200 }} /> : null}

      {!isLoading && tabTemplates.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">
            No {eventTypeLabel(eventTab).toLowerCase()} templates yet.
            {eventTab === 'drive'
              ? ' Create one before bulk-generating drive offers.'
              : eventTab === 'internship'
                ? ' Create one for internship selection offers (and PPO job offers after internship).'
                : ' Create one for alumni job offer letters.'}
          </p>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={openCreate}>
            Create {eventTypeLabel(eventTab).toLowerCase()} template
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {tabTemplates.map((t) => (
          <div key={t.id} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>{t.name}</h3>
                <p className="text-sm text-secondary" style={{ margin: 0 }}>
                  {t.jobTitle} · CTC {formatCurrency(Number(t.salary) || 0)} · {t.location || 'Location TBD'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <StandardTableIconAction action="edit" onClick={() => openEdit(t)} />
                <StandardTableIconAction action="delete" variant="danger" onClick={() => deactivate(t.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
