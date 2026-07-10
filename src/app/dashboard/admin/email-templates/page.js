'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { ArrowLeft, Mail, Save } from 'lucide-react';
import {
  EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS,
  SYSTEM_EMAIL_TEMPLATE_META,
} from '@/lib/systemEmailTemplates';

function emptyForms() {
  /** @type {Record<string, { subject: string, body: string, description: string, updated_at: string | null }>} */
  const o = {};
  for (const key of EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS) {
    o[key] = { subject: '', body: '', description: '', updated_at: null };
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
          [templateKey]: { ...prev[templateKey], updated_at: json.template.updated_at },
        }));
      }
      addToast('Template saved.', 'success');
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
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/dashboard/admin/overview"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', paddingLeft: 0 }}
        >
          <ArrowLeft size={16} />
          Back to Admin
        </Link>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.35rem',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              display: 'flex',
              padding: '0.35rem',
              background: 'var(--primary-50)',
              borderRadius: '8px',
              color: 'var(--primary-600)',
            }}
          >
            <Mail size={22} />
          </span>
          Email templates
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 720 }}>
          Edit platform-wide email copy. Use <code className="text-xs">{`{{placeholder}}`}</code> in subject or body;
          unknown placeholders are removed when a message is rendered.
        </p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 280 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
          {EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEYS.map((templateKey) => {
            const meta = SYSTEM_EMAIL_TEMPLATE_META[templateKey];
            const f = forms[templateKey] || { subject: '', body: '', description: '', updated_at: null };
            const placeholders = meta?.placeholders || [];
            return (
              <div key={templateKey} className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>{meta?.title || templateKey}</h2>
                {meta?.summary ? (
                  <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
                    {meta.summary}
                  </p>
                ) : null}
                {f.description ? (
                  <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                    {f.description}
                  </p>
                ) : null}
                {f.updated_at ? (
                  <p className="text-xs text-secondary" style={{ marginBottom: '1rem' }}>
                    Last updated: {new Date(f.updated_at).toLocaleString()}
                  </p>
                ) : null}

                <div
                  className="text-xs"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <strong>Placeholders</strong> (double curly braces):
                  <code style={{ display: 'block', marginTop: '0.35rem', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                    {placeholders.map((p) => `{{${p}}}`).join('  ')}
                  </code>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject template</label>
                  <input
                    className="form-input"
                    value={f.subject}
                    onChange={(e) => setFormField(templateKey, 'subject', e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Body template (plain text)</label>
                  <textarea
                    className="form-input"
                    rows={14}
                    value={f.body}
                    onChange={(e) => setFormField(templateKey, 'body', e.target.value)}
                    style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.85rem' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void save(templateKey)}
                  disabled={savingKey === templateKey}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Save size={16} />
                    {savingKey === templateKey ? 'Saving…' : 'Save template'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
