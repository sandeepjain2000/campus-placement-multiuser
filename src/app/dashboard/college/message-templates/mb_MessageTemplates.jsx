'use client';
import { useCallback, useEffect, useState } from 'react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { variablesToFormText } from '@/lib/messageTemplateUtils';
import Link from 'next/link';
import { FileEdit, Plus, Trash2, Pencil, X, Mail, MessageSquare, Bell } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'email', label: 'Email', icon: <Mail size={14} /> },
  { value: 'notification', label: 'Notification', icon: <Bell size={14} /> },
  { value: 'sms', label: 'SMS', icon: <MessageSquare size={14} /> },
];

function emptyForm() {
  return {
    name: '',
    subject: '',
    body: '',
    templateType: 'email',
    variablesText: '',
    isActive: true,
  };
}

export default function mb_MessageTemplates() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/college/message-templates');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setRows(Array.isArray(json.templates) ? json.templates : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (t) => {
    const id = t?.id != null ? String(t.id) : '';
    if (!id) {
      addToast('This template has no id and cannot be edited.', 'error');
      return;
    }
    setEditingId(id);
    setForm({
      name: t.name || '',
      subject: t.subject || '',
      body: t.body || '',
      templateType: t.template_type || 'email',
      variablesText: variablesToFormText(t.variables),
      isActive: t.is_active !== false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        body: form.body.trim(),
        templateType: form.templateType,
        isActive: form.isActive,
        variables: form.variablesText,
      };
      if (!payload.name) throw new Error('Name is required');
      if (!payload.body) throw new Error('Body is required');

      const url = editingId
        ? `/api/college/message-templates/${encodeURIComponent(editingId)}`
        : '/api/college/message-templates';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      
      addToast(`Template ${editingId ? 'updated' : 'created'}.`, 'success');
      cancelEdit();
      await load();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/college/message-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      if (editingId === id) cancelEdit();
      addToast('Template deleted.', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Delete failed', 'error');
    }
  };

  const getTypeIcon = (type) => {
    const opt = TYPE_OPTIONS.find(o => o.value === type);
    return opt ? opt.icon : <FileEdit size={14} />;
  };

  return (
    <>
      <MobileHeader 
        title="Templates" 
        action={
          !showForm ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New
            </button>
          ) : null
        }
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        <Link
          href="/dashboard/college/communication-templates"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}
        >
          <Mail size={14} />
          Sponsorship email templates
        </Link>

        {showForm && (
          <div
            key={editingId || 'new'}
            className="card animate-fadeIn"
            style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--primary-300)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{editingId ? 'Edit template' : 'New template'}</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit} style={{ padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="text-xs text-secondary mb-1 block">Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Interview reminder"
              />
            </div>
            
            <div className="form-group">
              <label className="text-xs text-secondary mb-1 block">Type</label>
              <select
                className="form-select"
                value={form.templateType}
                onChange={(e) => setForm((f) => ({ ...f, templateType: e.target.value }))}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            
            {form.templateType === 'email' && (
              <div className="form-group">
                <label className="text-xs text-secondary mb-1 block">Subject (optional)</label>
                <input
                  className="form-input"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="text-xs text-secondary mb-1 block">Body</label>
              <textarea
                className="form-input"
                rows={6}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.85rem' }}
                placeholder="Template body... use {{variable}} for placeholders"
              />
            </div>
            
            <div className="form-group">
              <label className="text-xs text-secondary mb-1 block">Variables (comma-separated, optional)</label>
              <input
                className="form-input"
                value={form.variablesText}
                onChange={(e) => setForm((f) => ({ ...f, variablesText: e.target.value }))}
                placeholder="studentName, companyName"
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <label className="text-sm font-medium" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  style={{ width: '1.2rem', height: '1.2rem' }}
                />
                Active Template
              </label>
              
              <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {!showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: '12px' }} />)
            ) : rows.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <FileEdit size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>No templates found</div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Create your first message template.</p>
              </div>
            ) : (
              rows.map((t) => (
                <div key={t.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', paddingRight: '1rem' }}>{t.name}</div>
                    <span className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                      {t.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className="badge badge-indigo" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}>
                      {getTypeIcon(t.template_type)} {t.template_type}
                    </span>
                    {t.subject && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.subject}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem', fontFamily: 'monospace', maxHeight: '3.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.body}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', maxWidth: '60%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {Array.isArray(t.variables) && t.variables.length ? `Vars: ${t.variables.join(', ')}` : 'No variables'}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(t)} style={{ padding: '0.25rem 0.5rem' }}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(t.id)} style={{ padding: '0.25rem 0.5rem', color: 'var(--danger-600)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
