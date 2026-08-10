'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { ArrowLeft, Mail, Save } from 'lucide-react';
import {
  EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS,
  SYSTEM_EMAIL_TEMPLATE_META,
} from '@/lib/systemEmailTemplates';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function emptyForms() {
  /** @type {Record<string, { subject: string, body: string, description: string, updated_at: string | null, versions: any[] }>} */
  const o = {};
  for (const key of EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS) {
    o[key] = { subject: '', body: '', description: '', updated_at: null, versions: [] };
  }
  return o;
}

export default function AdminEmailTemplatesPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState(emptyForms);
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-templates');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      const next = emptyForms();
      for (const row of json.templates || []) {
        if (next[row.template_key]) {
          next[row.template_key] = {
            subject: row.subject_template || '',
            body: row.body_template || '',
            description: row.description || '',
            updated_at: row.updated_at || null,
            versions: Array.isArray(row.versions) ? row.versions : [],
          };
        }
      }
      setForms(next);
      if (!(json.templates || []).length) {
        addToast('No templates found. Apply migrations 027 and 032 for system email templates.', 'warning');
      }
    } catch (e) {
      addToast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (templateKey) => {
    const f = forms[templateKey];
    if (!f) return;
    setSavingKey(templateKey);
    try {
      const res = await fetch('/api/admin/email-templates', {
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
      if (json.template?.updated_at) {
        setForms((prev) => ({
          ...prev,
          [templateKey]: {
            ...prev[templateKey],
            updated_at: json.template.updated_at,
            versions: Array.isArray(json.versions) ? json.versions : prev[templateKey].versions,
          },
        }));
      }
      addToast(
        json.unchanged
          ? 'No changes to publish.'
          : (json.version
            ? `Template saved as ${json.version.label || `v${json.version.version_number}`}. Baseline retained.`
            : 'Template saved.'),
        'success',
      );
      if (Array.isArray(json.versions)) {
        setForms((prev) => ({
          ...prev,
          [templateKey]: { ...prev[templateKey], versions: json.versions },
        }));
      } else {
        await load();
      }
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const setFormField = (templateKey, field, value) => {
    setForms((prev) => ({
      ...prev,
      [templateKey]: { ...prev[templateKey], [field]: value },
    }));
  };

  return (
    <div className="animate-fadeIn flex max-w-4xl flex-col gap-4 pb-12">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/admin/overview" />}><ArrowLeft data-icon="inline-start" />Back to Admin</Button>
        <h1 className="mt-3 mb-0 flex items-center gap-2 text-2xl font-semibold tracking-tight"><Mail aria-hidden />Email templates</h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
          Edit platform-wide email copy. Each save keeps the original baseline and adds a system version so colleges can
          undo their campus edits later. Use <code className="text-xs">{`{{placeholder}}`}</code> in subject or body;
          unknown placeholders are removed when a message is rendered.
        </p>
      </div>

      {loading ? (
        <Card><CardHeader><CardTitle>Email templates</CardTitle><CardDescription>Loading templates…</CardDescription></CardHeader></Card>
      ) : (
        <div className="flex flex-col gap-5">
          {EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS.map((templateKey) => {
            const meta = SYSTEM_EMAIL_TEMPLATE_META[templateKey];
            const f = forms[templateKey] || { subject: '', body: '', description: '', updated_at: null };
            const placeholders = meta?.placeholders || [];
            return (
              <Card key={templateKey}>
                <CardHeader><CardTitle>{meta?.title || templateKey}</CardTitle><CardDescription>{[meta?.summary, f.description].filter(Boolean).join(' ')}</CardDescription></CardHeader>
                <CardContent><FieldGroup>
                {f.updated_at ? (
                  <p className="text-muted-foreground text-xs">
                    Last updated: {new Date(f.updated_at).toLocaleString()}
                  </p>
                ) : null}

                <Alert><AlertDescription>
                  <strong>Placeholders</strong> (double curly braces):
                  <code className="mt-1 block whitespace-pre-wrap text-xs">
                    {placeholders.map((p) => `{{${p}}}`).join('  ')}
                  </code>
                </AlertDescription></Alert>

                <Field>
                  <FieldLabel htmlFor={`${templateKey}-subject`}>Subject template</FieldLabel>
                  <Input
                    id={`${templateKey}-subject`}
                    value={f.subject}
                    onChange={(e) => setFormField(templateKey, 'subject', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${templateKey}-body`}>Body template (plain text)</FieldLabel>
                  <Textarea
                    id={`${templateKey}-body`}
                    rows={14}
                    value={f.body}
                    onChange={(e) => setFormField(templateKey, 'body', e.target.value)}
                    className="font-mono text-sm"
                  />
                </Field>
                {Array.isArray(f.versions) && f.versions.length > 0 ? (
                  <Field>
                    <FieldLabel>Retained system versions</FieldLabel>
                    <div>
                    <ul className="text-muted-foreground m-0 list-disc pl-5 text-sm">
                      {f.versions.map((v) => (
                        <li key={v.id}>
                          <strong>
                            {v.is_baseline ? 'Baseline' : (v.label || `v${v.version_number}`)}
                          </strong>
                          {v.is_current ? ' · current live' : ''}
                          {v.created_at ? ` · ${new Date(v.created_at).toLocaleString()}` : ''}
                        </li>
                      ))}
                    </ul>
                    </div>
                  </Field>
                ) : null}
                </FieldGroup></CardContent>
                <CardFooter className="border-t"><Button type="button" onClick={() => void save(templateKey)} disabled={savingKey === templateKey}><Save data-icon="inline-start" />{savingKey === templateKey ? 'Saving…' : 'Save template'}</Button></CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
