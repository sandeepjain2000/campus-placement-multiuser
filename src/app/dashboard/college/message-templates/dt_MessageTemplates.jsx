'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { variablesToFormText } from '@/lib/messageTemplateUtils';
import { FileEdit, Mail, Plus, Trash2, Pencil, X } from 'lucide-react';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

const TYPE_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'notification', label: 'Notification' },
  { value: 'sms', label: 'SMS' },
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

export default function CollegeMessageTemplatesPage() {
  const { addToast } = useToast();
  const formRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(rows, {
    getSearchText: (t) =>
      [t.name, t.subject, t.template_type, Array.isArray(t.variables) ? t.variables.join(' ') : '', t.is_active ? 'active' : 'inactive']
        .filter(Boolean)
        .join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
  });

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
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
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

      if (editingId) {
        const res = await fetch(`/api/college/message-templates/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Save failed');
        addToast('Template updated.', 'success');
      } else {
        const res = await fetch('/api/college/message-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Save failed');
        addToast('Template created.', 'success');
      }
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
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      if (editingId === id) cancelEdit();
      addToast('Template deleted.', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileEdit size={22} className="text-primary" aria-hidden />
            Message &amp; email templates
          </h1>
          <p>
            Reusable email, notification, and SMS bodies for your placement office. For sponsorship thank-you and receipt
            emails, use{' '}
            <Link href="/dashboard/college/communication-templates" className="text-primary">
              Email templates
            </Link>
            . Placeholders like <code className="text-xs">{`{{studentName}}`}</code> are substituted when sent.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/college/communication-templates" className="btn btn-secondary btn-sm">
            <Mail size={14} style={{ marginRight: 6 }} />
            Email templates
          </Link>
          <Link href="/dashboard/college/overview" className="btn btn-secondary btn-sm">
            Overview
          </Link>
        </div>
      </div>

      <div
        ref={formRef}
        className="card"
        key={editingId || 'new'}
        style={{
          padding: '1.25rem',
          marginBottom: '1rem',
          border: editingId ? '1px solid var(--primary-300)' : undefined,
          boxShadow: editingId ? '0 0 0 1px var(--primary-100)' : undefined,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0 }}>{editingId ? 'Edit template' : 'New template'}</h2>
          {editingId ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
              <X size={16} style={{ marginRight: 4 }} />
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Interview reminder"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={form.templateType}
            onChange={(e) => setForm((f) => ({ ...f, templateType: e.target.value }))}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Subject (optional)</label>
          <input
            className="form-input"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Body</label>
          <textarea
            className="form-input"
            rows={8}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.9rem' }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Variable names (comma-separated, optional)</label>
          <input
            className="form-input"
            value={form.variablesText}
            onChange={(e) => setForm((f) => ({ ...f, variablesText: e.target.value }))}
            placeholder="studentName, driveTitle, companyName"
          />
        </div>
        <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Active
        </label>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : editingId ? 'Update template' : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              Add template
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <>
          {totalCount > 0 ? (
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, subject, or type…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          ) : null}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Variables</th>
                <th>Status</th>
                <th style={{ width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && totalCount > 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-secondary">
                    No templates match your search.
                  </td>
                </tr>
              ) : null}
              {displayRows.map((t) => (
                <tr key={t.id} style={editingId === String(t.id) ? { background: 'var(--primary-50)' } : undefined}>
                  <td className="font-medium">{t.name}</td>
                  <td>
                    <span className="badge badge-indigo">{t.template_type}</span>
                  </td>
                  <td className="text-sm text-secondary">{t.subject || '—'}</td>
                  <td className="text-xs text-secondary" style={{ maxWidth: 200 }}>
                    {Array.isArray(t.variables) && t.variables.length ? t.variables.join(', ') : '—'}
                  </td>
                  <td>{t.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Off</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <StandardTableIconAction action="edit" variant="ghost" onClick={() => startEdit(t)} />
                    <StandardTableIconAction action="delete" variant="danger" onClick={() => void remove(t.id)} />
                  </td>
                </tr>
              ))}
              {totalCount === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-secondary">
                    No templates yet. Add one above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
