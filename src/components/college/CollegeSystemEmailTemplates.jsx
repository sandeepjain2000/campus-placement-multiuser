'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Mail, RotateCcw, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AdminFilterSelect from '@/components/AdminFilterSelect';

/**
 * @param {{ variant?: 'section' | 'page' }} props
 * - `section`: embedded below custom templates (legacy)
 * - `page`: full page at /dashboard/college/communication-templates
 */
export default function CollegeSystemEmailTemplates({ variant = 'section' }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [forms, setForms] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [versionPickerReset, setVersionPickerReset] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/college/system-email-templates');
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
      const res = await fetch('/api/college/system-email-templates', {
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
      addToast('Template saved for your campus.', 'success');
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
      const res = await fetch('/api/college/system-email-templates', {
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
      const res = await fetch('/api/college/system-email-templates', {
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

  const isPage = variant === 'page';

  return (
    <section className={isPage ? undefined : 'mt-10'}>
      {!isPage ? (
        <>
          <h2 className="m-0 flex items-center gap-2 text-lg font-semibold">
            <Mail className="text-primary size-5" aria-hidden />
            Automated sponsorship emails
          </h2>
          <p className="text-muted-foreground mb-4 max-w-3xl text-sm">
            Customize wording for emails your campus sends to sponsors after payment (thank-you and receipt). Scoped to{' '}
            <strong>your college only</strong>; other campuses keep their own copy or the platform default.
          </p>
        </>
      ) : null}

      {loading ? (
        <div className="skeleton h-52 rounded-xl" />
      ) : catalog.length === 0 ? (
        <Alert>
          <AlertDescription>
            Could not load email templates. Sign in as a college admin with a campus assigned. If saving fails, apply
            migration <code className="text-xs">058_email_template_overrides.sql</code>.
          </AlertDescription>
        </Alert>
      ) : (
        <div className={`flex flex-col gap-5 ${isPage ? 'max-w-4xl' : ''}`}>
          {catalog.map((row) => {
            const f = forms[row.template_key] || { subject: '', body: '', has_override: false };
            const placeholders = row.placeholders || [];
            return (
              <Card key={row.template_key}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                  <CardTitle>{row.title}</CardTitle>
                  <Badge variant={f.has_override ? 'default' : 'secondary'}>
                    {f.has_override ? 'Your campus' : 'Platform default'}
                  </Badge>
                  </div>
                  {row.summary ? <CardDescription>{row.summary}</CardDescription> : null}
                </CardHeader>
                <CardContent>
                <div className="bg-muted border-border mb-4 rounded-md border p-3 text-xs">
                  <strong>Placeholders:</strong>{' '}
                  <code style={{ whiteSpace: 'pre-wrap' }}>{placeholders.map((p) => `{{${p}}}`).join('  ')}</code>
                </div>
                <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${row.template_key}-subject`}>Subject</FieldLabel>
                  <Input
                    id={`${row.template_key}-subject`}
                    value={f.subject}
                    onChange={(e) => setFormField(row.template_key, 'subject', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${row.template_key}-body`}>Body</FieldLabel>
                  <Textarea
                    id={`${row.template_key}-body`}
                    rows={10}
                    value={f.body}
                    onChange={(e) => setFormField(row.template_key, 'body', e.target.value)}
                    className="font-mono text-sm"
                  />
                </Field>
                </FieldGroup>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingKey === row.template_key}
                    onClick={() => void save(row.template_key)}
                  >
                    <Save data-icon="inline-start" />
                    {savingKey === row.template_key ? 'Saving…' : 'Save for campus'}
                  </Button>
                  {f.has_override ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={savingKey === row.template_key}
                      onClick={() => void resetToPlatform(row.template_key)}
                    >
                      <RotateCcw data-icon="inline-start" />
                      Current platform default
                    </Button>
                  ) : null}
                  {Array.isArray(row.versions) && row.versions.length > 0 ? (
                    <Field className="ml-auto max-w-xs">
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
                {Array.isArray(row.versions) && row.versions.length > 0 ? (
                  <FieldDescription className="px-6 pb-5">
                    System keeps the original baseline and each later platform publish so you can undo campus edits.
                  </FieldDescription>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
