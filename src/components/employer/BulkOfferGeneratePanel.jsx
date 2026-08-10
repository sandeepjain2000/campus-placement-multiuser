'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

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
    <Card>
      <CardHeader>
        <CardTitle>
            {isInternship ? 'Generate internship offers from selections' : 'Generate offers from selections'}
        </CardTitle>
        <CardDescription>
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
        </CardDescription>
        <CardAction>
          <Button render={<Link href="/dashboard/employer/offer-templates" />} variant="outline" size="sm">
          Manage templates
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`bulk-offer-${scope}-posting`}>{postingLabel}</FieldLabel>
          <AdminFilterSelect
            id={`bulk-offer-${scope}-posting`}
            className="w-full"
            value={postingId}
            onValueChange={setPostingId}
            items={[
              { label: `Select ${isInternship ? 'posting' : 'drive'}`, value: 'all' },
              ...postings.map((p) => ({
                label: `${p.title}${p.drive_date ? ` · ${formatDate(p.drive_date)}` : ''}${p.internship_start_date ? ` · starts ${formatDate(p.internship_start_date)}` : ''}`,
                value: p.id,
              })),
            ]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`bulk-offer-${scope}-template`}>Offer template</FieldLabel>
          <AdminFilterSelect
            id={`bulk-offer-${scope}-template`}
            className="w-full"
            value={templateId}
            onValueChange={setTemplateId}
            items={[
              { label: 'Select template', value: 'all' },
              ...templates.map((t) => ({
                label: `${t.name} · ${t.jobTitle || t.job_title}`,
                value: t.id,
              })),
            ]}
          />
        </Field>
      </FieldGroup>

      {previewLoading && postingId ? (
        <p className="text-sm text-secondary">Checking selections…</p>
      ) : null}

      {preview && postingId ? (
        <Alert>
          <AlertTitle>{previewTitle}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Selected: {preview.selectedCount}</Badge>
            <Badge variant="outline">Existing: {preview.offersExistingCount}</Badge>
            <Badge>Ready: {preview.readyToGenerateCount}</Badge>
          {preview.readyToGenerateCount > 0 && preview.pendingStudents?.length ? (
            <p className="basis-full text-xs text-muted-foreground">
              Includes:{' '}
              {preview.pendingStudents
                .slice(0, 5)
                .map((s) => s.studentName)
                .join(', ')}
              {preview.pendingStudents.length > 5 ? ` +${preview.pendingStudents.length - 5} more` : ''}
            </p>
          ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {selectedTemplate ? (
        <p className="text-xs text-secondary" style={{ marginBottom: '1rem' }}>
          Template {isInternship ? 'stipend/package' : 'CTC'} is fixed at{' '}
          <strong>₹{Number(selectedTemplate.salary || 0).toLocaleString('en-IN')}</strong> annual for every generated offer.
        </p>
      ) : null}

      <Button
        type="button"
        disabled={generating || !postingId || !templateId || !templates.length}
        onClick={runGenerate}
      >
        {generating ? 'Generating…' : 'Generate offers & send emails'}
      </Button>
      </CardContent>
    </Card>
  );
}
