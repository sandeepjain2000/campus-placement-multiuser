'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  return json;
};

/**
 * @param {object} props
 * @param {'drive'|'internship'} props.scope
 * @param {Array<{ id: string, title: string, drive_date?: string, internship_start_date?: string }>} props.postings
 * @param {Array<{ id: string, name: string, jobTitle?: string, job_title?: string }>} props.templates
 * @param {() => void | Promise<void>} [props.onGenerated]
 */
export default function BulkOfferGeneratePanel({ scope = 'drive', postings, templates, onGenerated }) {
  const { addToast } = useToast();
  const [postingId, setPostingId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [generating, setGenerating] = useState(false);

  const isInternship = scope === 'internship';
  const previewKey = postingId
    ? isInternship
      ? `/api/employer/offers/bulk-preview?jobId=${encodeURIComponent(postingId)}`
      : `/api/employer/offers/bulk-preview?driveId=${encodeURIComponent(postingId)}`
    : null;
  const { data: preview, isLoading: previewLoading, mutate: refreshPreview } = useSWR(previewKey, fetcher);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templates, templateId],
  );

  const runGenerate = async () => {
    if (!postingId || !templateId) {
      addToast(
        isInternship ? 'Choose an internship posting and an offer template.' : 'Choose a placement drive and an offer template.',
        'warning',
      );
      return;
    }

    const readyCount = Number(preview?.readyToGenerateCount) || 0;
    if (readyCount > 0) {
      const names = (preview?.pendingStudents || [])
        .slice(0, 8)
        .map((s) => s.studentName)
        .join(', ');
      const extra = readyCount > 8 ? ` and ${readyCount - 8} more` : '';
      const ok = window.confirm(
        isInternship
          ? `Send formal offer emails to ${readyCount} selected student(s) on this internship${names ? `: ${names}${extra}` : ''}?`
          : `Send formal offer emails to ${readyCount} selected student(s) on this drive${names ? `: ${names}${extra}` : ''}?`,
      );
      if (!ok) return;
    }

    setGenerating(true);
    try {
      const body = isInternship
        ? { jobId: postingId, templateId }
        : { driveId: postingId, templateId };
      const res = await fetch('/api/employer/offers/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Generate failed');
      addToast(json.message || 'Offers generated.', json.created > 0 ? 'success' : 'info');
      await refreshPreview();
      if (onGenerated) await onGenerated();
    } catch (e) {
      addToast(e.message || 'Generate failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const postingLabel = isInternship ? 'Internship posting' : 'Placement drive';
  const previewTitle = preview?.posting?.title || preview?.drive?.title;

  return (
    <section className="app-content-card app-content-card--padded" style={{ marginBottom: 0 }}>
      <div className="app-content-card__header" style={{ marginBottom: '1rem' }}>
        <div className="app-content-card__heading">
          <h2 className="app-content-card__title">
            {isInternship ? 'Generate internship offers from selections' : 'Generate offers from selections'}
          </h2>
          <p className="app-content-card__description">
            {isInternship ? (
              <>
                Mark students <strong>selected</strong> on an internship, pick an <strong>Internship</strong> template, then
                generate. Students get <strong>one formal offer email</strong> here (selection is in-app only for internships).
              </>
            ) : (
              <>
                Mark students <strong>selected</strong> on a drive, pick a <strong>Drive</strong> template, then generate.
                Safe to run again when new selections arrive.
              </>
            )}
          </p>
        </div>
        <Link href="/dashboard/employer/offer-templates" className="btn btn-secondary btn-sm">
          Manage templates
        </Link>
      </div>

      <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{postingLabel}</label>
          <select className="form-select" value={postingId} onChange={(e) => setPostingId(e.target.value)}>
            <option value="">Select {isInternship ? 'posting' : 'drive'}</option>
            {postings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.drive_date ? ` · ${formatDate(p.drive_date)}` : ''}
                {p.internship_start_date ? ` · starts ${formatDate(p.internship_start_date)}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Offer template</label>
          <select className="form-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Select template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.jobTitle || t.job_title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {previewLoading && postingId ? (
        <p className="text-sm text-secondary">Checking selections…</p>
      ) : null}

      {preview && postingId ? (
        <div className="app-stat-card app-stat-card--indigo" style={{ marginBottom: '1rem', minHeight: 'auto' }}>
          <div className="app-stat-card__label" style={{ marginTop: 0 }}>
            <strong>{previewTitle}</strong>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Selected: <strong>{preview.selectedCount}</strong> · Offers already created:{' '}
            <strong>{preview.offersExistingCount}</strong> ·{' '}
            <span style={{ color: 'var(--primary-700)' }}>
              Ready to generate: <strong>{preview.readyToGenerateCount}</strong>
            </span>
          </div>
          {preview.readyToGenerateCount > 0 && preview.pendingStudents?.length ? (
            <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0' }}>
              Includes:{' '}
              {preview.pendingStudents
                .slice(0, 5)
                .map((s) => s.studentName)
                .join(', ')}
              {preview.pendingStudents.length > 5 ? ` +${preview.pendingStudents.length - 5} more` : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {selectedTemplate ? (
        <p className="text-xs text-secondary" style={{ marginBottom: '1rem' }}>
          Template {isInternship ? 'stipend/package' : 'CTC'} is fixed at{' '}
          <strong>₹{Number(selectedTemplate.salary || 0).toLocaleString('en-IN')}</strong> annual for every generated offer.
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary"
        disabled={generating || !postingId || !templateId || !templates.length}
        onClick={runGenerate}
      >
        {generating ? 'Generating…' : 'Generate offers & send emails'}
      </button>
    </section>
  );
}
