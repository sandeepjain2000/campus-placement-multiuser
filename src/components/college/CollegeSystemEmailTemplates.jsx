'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Mail, RotateCcw, Save } from 'lucide-react';

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
    <section style={isPage ? undefined : { marginTop: '2.5rem' }}>
      {!isPage ? (
        <>
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              margin: '0 0 0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Mail size={20} className="text-primary" aria-hidden />
            Automated sponsorship emails
          </h2>
          <p className="text-sm text-secondary" style={{ marginBottom: '1rem', maxWidth: 720 }}>
            Customize wording for emails your campus sends to sponsors after payment (thank-you and receipt). Scoped to{' '}
            <strong>your college only</strong>; other campuses keep their own copy or the platform default.
          </p>
        </>
      ) : null}

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : catalog.length === 0 ? (
        <div className="card" style={{ padding: '1.5rem' }}>
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            Could not load email templates. Sign in as a college admin with a campus assigned. If saving fails, apply
            migration <code className="text-xs">058_email_template_overrides.sql</code>.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxWidth: isPage ? 900 : undefined,
          }}
        >
          {catalog.map((row) => {
            const f = forms[row.template_key] || { subject: '', body: '', has_override: false };
            const placeholders = row.placeholders || [];
            return (
              <div key={row.template_key} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>{row.title}</h3>
                  <span className={`badge ${f.has_override ? 'badge-indigo' : 'badge-gray'}`}>
                    {f.has_override ? 'Your campus' : 'Platform default'}
                  </span>
                </div>
                {row.summary ? <p className="text-sm text-secondary">{row.summary}</p> : null}
                <div
                  className="text-xs"
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.65rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <strong>Placeholders:</strong>{' '}
                  <code style={{ whiteSpace: 'pre-wrap' }}>{placeholders.map((p) => `{{${p}}}`).join('  ')}</code>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    className="form-input"
                    value={f.subject}
                    onChange={(e) => setFormField(row.template_key, 'subject', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Body</label>
                  <textarea
                    className="form-input"
                    rows={10}
                    value={f.body}
                    onChange={(e) => setFormField(row.template_key, 'body', e.target.value)}
                    style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={savingKey === row.template_key}
                    onClick={() => void save(row.template_key)}
                  >
                    <Save size={14} style={{ marginRight: 4 }} />
                    {savingKey === row.template_key ? 'Saving…' : 'Save for campus'}
                  </button>
                  {f.has_override ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={savingKey === row.template_key}
                      onClick={() => void resetToPlatform(row.template_key)}
                    >
                      <RotateCcw size={14} style={{ marginRight: 4 }} />
                      Current platform default
                    </button>
                  ) : null}
                  {Array.isArray(row.versions) && row.versions.length > 0 ? (
                    <label className="text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="text-secondary">Restore system version</span>
                      <select
                        className="form-select"
                        style={{ width: 'auto', minWidth: 180 }}
                        defaultValue=""
                        disabled={savingKey === row.template_key}
                        onChange={(e) => {
                          const id = e.target.value;
                          e.target.value = '';
                          if (id) void restoreSystemVersion(row.template_key, id);
                        }}
                      >
                        <option value="">Choose…</option>
                        {row.versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.is_baseline ? 'Baseline' : (v.label || `v${v.version_number}`)}
                            {v.is_current ? ' (current)' : ''}
                            {` — v${v.version_number}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                {Array.isArray(row.versions) && row.versions.length > 0 ? (
                  <p className="text-xs text-secondary" style={{ margin: '0.65rem 0 0' }}>
                    System keeps the original baseline and each later platform publish so you can undo campus edits.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
