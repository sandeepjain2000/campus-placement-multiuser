'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { ArrowLeft, Mail, RotateCcw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AdminFilterSelect from '@/components/AdminFilterSelect';

function emptyForms() {
  return {};
}

export default function EmployerCommunicationTemplatesPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  /** @type {[Array<{ template_key: string, title: string, summary: string, placeholders: string[], subject_template: string, body_template: string, updated_at: string | null, source: string, has_override: boolean }>, Function]} */
  const [catalog, setCatalog] = useState([]);
  const [forms, setForms] = useState(emptyForms);
  const [savingKey, setSavingKey] = useState(null);
  const [versionPickerReset, setVersionPickerReset] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/email-templates');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      const list = Array.isArray(json.templates) ? json.templates : [];
      setCatalog(list);
      const next = {};
      for (const row of list) {
        next[row.template_key] = {
          subject: row.subject_template || '',
          body: row.body_template || '',
          updated_at: row.updated_at || null,
          has_override: row.has_override,
        };
      }
      setForms(next);
    } catch (e) {
      addToast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFormField = (templateKey, field, value) => {
    setForms((prev) => ({
      ...prev,
      [templateKey]: { ...prev[templateKey], [field]: value },
    }));
  };

  const save = async (templateKey) => {
    const f = forms[templateKey];
    if (!f) return;
    setSavingKey(templateKey);
    try {
      const res = await fetch('/api/employer/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey,
          subjectTemplate: f.subject,
          bodyTemplate: f.body,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Template saved for your organization.', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const resetToPlatform = async (templateKey) => {
    setSavingKey(templateKey);
    try {
      const res = await fetch('/api/employer/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey, resetToPlatform: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Reset failed');
      addToast('Reverted to current platform default wording.', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Reset failed', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const restoreSystemVersion = async (templateKey, versionId) => {
    if (!versionId) return;
    setSavingKey(templateKey);
    try {
      const res = await fetch('/api/employer/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey, restoreSystemVersionId: versionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Restore failed');
      const v = json.restoredVersion;
      const label = v?.is_baseline
        ? 'system baseline'
        : (v?.label || `system v${v?.version_number || ''}`);
      addToast(`Restored ${label}.`, 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Restore failed', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-3">
        <div>
          <Button variant="ghost" size="sm" render={<Link href="/dashboard/employer/overview" />}>
            <ArrowLeft data-icon="inline-start" aria-hidden />
            Overview
          </Button>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Mail className="text-muted-foreground" aria-hidden />
            Email Templates
          </h1>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
            Customize email wording for <strong>your organization</strong>. Changes apply when you send guest confirmations
            or sponsorship thank-you messages. Platform defaults remain available via reset; Super Admins can still edit
            global defaults.
          </p>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="text-muted-foreground py-16 text-center">Loading templates…</CardContent></Card>
      ) : catalog.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No editable templates are configured. Ask your administrator to apply database migration{' '}
            <code className="text-xs">058_email_template_overrides.sql</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="flex max-w-4xl flex-col gap-5">
          {catalog.map((row) => {
            const f = forms[row.template_key] || { subject: '', body: '', updated_at: null, has_override: false };
            const placeholders = row.placeholders || [];
            return (
              <Card key={row.template_key}>
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle>{row.title}</CardTitle>
                    {row.summary ? <CardDescription className="mt-1">{row.summary}</CardDescription> : null}
                  </div>
                  <Badge variant={f.has_override ? 'default' : 'secondary'}>
                    {f.has_override ? 'Your organization' : 'Platform default'}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  {f.updated_at ? (
                  <p className="text-muted-foreground text-xs">
                    Last updated: {new Date(f.updated_at).toLocaleString()}
                  </p>
                ) : null}

                <div className="bg-muted/50 rounded-lg border p-3 text-xs">
                  <strong>Placeholders</strong> (double curly braces):
                  <code className="mt-1 block break-words whitespace-pre-wrap text-xs">
                    {placeholders.map((p) => `{{${p}}}`).join('  ')}
                  </code>
                </div>

                <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${row.template_key}-subject`}>Subject template</FieldLabel>
                  <Input
                    id={`${row.template_key}-subject`}
                    name={`${row.template_key}-subject`}
                    value={f.subject}
                    onChange={(e) => setFormField(row.template_key, 'subject', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${row.template_key}-body`}>Body template (plain text)</FieldLabel>
                  <Textarea
                    id={`${row.template_key}-body`}
                    name={`${row.template_key}-body`}
                    rows={12}
                    value={f.body}
                    onChange={(e) => setFormField(row.template_key, 'body', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <FieldDescription>Use only the listed placeholders; messages are sent as plain text.</FieldDescription>
                </Field>
                </FieldGroup>
                </CardContent>
                <CardFooter className="flex-wrap">
                  <Button
                    onClick={() => void save(row.template_key)}
                    disabled={savingKey === row.template_key}
                  >
                    <Save data-icon="inline-start" aria-hidden />
                    {savingKey === row.template_key ? 'Saving…' : 'Save for My Organization'}
                  </Button>
                  {f.has_override ? (
                    <Button
                      variant="outline"
                      onClick={() => void resetToPlatform(row.template_key)}
                      disabled={savingKey === row.template_key}
                    >
                      <RotateCcw data-icon="inline-start" aria-hidden />
                      Current Platform Default
                    </Button>
                  ) : null}
                  {Array.isArray(row.versions) && row.versions.length > 0 ? (
                    <Field orientation="horizontal" className="w-auto">
                      <FieldLabel htmlFor={`${row.template_key}-version`}>Restore system version</FieldLabel>
                      <AdminFilterSelect
                        key={`${row.template_key}-version-${versionPickerReset[row.template_key] ?? 0}`}
                        id={`${row.template_key}-version`}
                        className="min-w-44"
                        value=""
                        disabled={savingKey === row.template_key}
                        emptyMapsToAll={false}
                        onValueChange={(id) => {
                          if (id) {
                            void restoreSystemVersion(row.template_key, id);
                            setVersionPickerReset((prev) => ({
                              ...prev,
                              [row.template_key]: (prev[row.template_key] ?? 0) + 1,
                            }));
                          }
                        }}
                        items={[
                          { label: 'Choose…', value: '' },
                          ...row.versions.map((v) => ({
                            label: `${v.is_baseline ? 'Baseline' : (v.label || `v${v.version_number}`)}${v.is_current ? ' (current)' : ''} — v${v.version_number}`,
                            value: String(v.id),
                          })),
                        ]}
                      />
                    </Field>
                  ) : null}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
