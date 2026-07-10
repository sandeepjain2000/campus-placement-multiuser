'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { ArrowLeft, Mail, RotateCcw, Save } from 'lucide-react';

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
      addToast('Reverted to platform default wording.', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Reset failed', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <Link
            href="/dashboard/employer/overview"
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem', paddingLeft: 0 }}
          >
            <ArrowLeft size={16} />
            Overview
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={22} className="text-primary" aria-hidden />
            Email templates
          </h1>
          <p>
            Customize email wording for <strong>your organization</strong>. Changes apply when you send guest confirmations
            or sponsorship thank-you messages. Platform defaults remain available via reset; Super Admins can still edit
            global defaults.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 280 }} />
      ) : catalog.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            No editable templates are configured. Ask your administrator to apply database migration{' '}
            <code className="text-xs">058_email_template_overrides.sql</code>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
          {catalog.map((row) => {
            const f = forms[row.template_key] || { subject: '', body: '', updated_at: null, has_override: false };
            const placeholders = row.placeholders || [];
            return (
              <div key={row.template_key} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>{row.title}</h2>
                  <span className={`badge ${f.has_override ? 'badge-indigo' : 'badge-gray'}`}>
                    {f.has_override ? 'Your organization' : 'Platform default'}
                  </span>
                </div>
                {row.summary ? (
                  <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
                    {row.summary}
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
                    onChange={(e) => setFormField(row.template_key, 'subject', e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Body template (plain text)</label>
                  <textarea
                    className="form-input"
                    rows={12}
                    value={f.body}
                    onChange={(e) => setFormField(row.template_key, 'body', e.target.value)}
                    style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void save(row.template_key)}
                    disabled={savingKey === row.template_key}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Save size={16} />
                      {savingKey === row.template_key ? 'Saving…' : 'Save for my organization'}
                    </span>
                  </button>
                  {f.has_override ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void resetToPlatform(row.template_key)}
                      disabled={savingKey === row.template_key}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <RotateCcw size={16} />
                        Use platform default
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
