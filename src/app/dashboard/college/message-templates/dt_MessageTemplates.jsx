'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { variablesToFormText, previewMessageTemplateWithSample } from '@/lib/messageTemplateUtils';
import { FileEdit, Mail, Plus, Eye, X } from 'lucide-react';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import MessageTemplateSamplePreviewModal from '@/components/college/MessageTemplateSamplePreviewModal';
const TYPE_OPTIONS = [{
  value: 'email',
  label: 'Email'
}, {
  value: 'notification',
  label: 'Notification'
}, {
  value: 'sms',
  label: 'SMS'
}];
function emptyForm() {
  return {
    name: '',
    subject: '',
    body: '',
    templateType: 'email',
    variablesText: '',
    isActive: true
  };
}
export default function CollegeMessageTemplatesPage() {
  const {
    addToast
  } = useToast();
  const formRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const openSamplePreview = opts => {
    const rendered = previewMessageTemplateWithSample(opts);
    setPreview(rendered);
  };
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
    clearFilters
  } = useDataTableQuery(rows, {
    getSearchText: t => [t.name, t.subject, t.template_type, Array.isArray(t.variables) ? t.variables.join(' ') : '', t.is_active ? 'active' : 'inactive'].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS
  });
  const startEdit = t => {
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
      isActive: t.is_active !== false
    });
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
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
        variables: form.variablesText
      };
      if (!payload.name) throw new Error('Name is required');
      if (!payload.body) throw new Error('Body is required');
      if (editingId) {
        const res = await fetch(`/api/college/message-templates/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Save failed');
        addToast('Template updated.', 'success');
      } else {
        const res = await fetch('/api/college/message-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
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
  const remove = async id => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/college/message-templates/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      if (editingId === id) cancelEdit();
      addToast('Template deleted.', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Delete failed', 'error');
    }
  };
  return <div className="animate-fadeIn" style={{
    paddingBottom: '2rem'
  }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
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
        <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
          <Link href="/dashboard/college/communication-templates">
            <Mail size={14} style={{
            marginRight: 6
          }} />
            Email templates
          </Link>
          <Link href="/dashboard/college/overview">
            Overview
          </Link>
        </div>
      </div>

      <Card ref={formRef} key={editingId || 'new'} style={{
      padding: '1.25rem',
      marginBottom: '1rem',
      border: editingId ? '1px solid var(--primary-300)' : undefined,
      boxShadow: editingId ? '0 0 0 1px var(--primary-100)' : undefined
    }}><CardContent>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <h2 style={{
            fontSize: '1.05rem',
            margin: 0
          }}>{editingId ? 'Edit template' : 'New template'}</h2>
          {editingId ? <Button type="button" onClick={cancelEdit} variant="ghost" size="sm">
              <X size={16} style={{
              marginRight: 4
            }} />
              Cancel edit
            </Button> : null}
        </div>

        <Field style={{
          marginTop: '1rem'
        }}>
          <FieldLabel>Name</FieldLabel>
          <Input value={form.name} onChange={e => setForm(f => ({
            ...f,
            name: e.target.value
          }))} placeholder="e.g. Interview reminder" />
        </Field>
        <Field>
          <FieldLabel>Type</FieldLabel>
          <AdminFilterSelect
            className="w-full"
            value={form.templateType}
            onValueChange={(templateType) => setForm((f) => ({ ...f, templateType }))}
            emptyMapsToAll={false}
            items={TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          />
        </Field>
        <Field>
          <FieldLabel>Subject (optional)</FieldLabel>
          <Input value={form.subject} onChange={e => setForm(f => ({
            ...f,
            subject: e.target.value
          }))} />
        </Field>
        <Field>
          <FieldLabel>Body</FieldLabel>
          <Textarea rows={8} value={form.body} onChange={e => setForm(f => ({
            ...f,
            body: e.target.value
          }))} style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: '0.9rem'
          }} />
        </Field>
        <Field>
          <FieldLabel>Variable names (comma-separated, optional)</FieldLabel>
          <Input value={form.variablesText} onChange={e => setForm(f => ({
            ...f,
            variablesText: e.target.value
          }))} placeholder="studentName, driveTitle, companyName" />
        </Field>
        <label className="text-sm" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: '1rem'
        }}>
          <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm(f => ({
            ...f,
            isActive: !!v
          }))} />
          Active
        </label>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : editingId ? 'Update template' : <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
              <Plus size={16} />
              Add template
            </span>}
        </Button>
        <Button type="button" style={{
          marginLeft: '0.5rem'
        }} disabled={!form.body.trim()} onClick={() => openSamplePreview({
          name: form.name || (editingId ? 'Edit template' : 'New template'),
          subject: form.subject,
          body: form.body,
          variables: form.variablesText
        })} variant="outline">
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Eye size={16} />
            Preview with sample data
          </span>
        </Button>
      </CardContent></Card>

      {loading ? <div className="skeleton" style={{
      height: 200
    }} /> : <>
          {totalCount > 0 ? <DataTableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search name, subject, or type…" sort={sort} onSortChange={setSort} sortOptions={COMMON_SORT_OPTIONS} filteredCount={filteredCount} totalCount={totalCount} hasActiveFilters={hasActiveFilters} onClear={clearFilters} /> : null}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead style={{
                width: 1
              }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 && totalCount > 0 ? <TableRow>
                  <TableCell colSpan={6} className="text-center text-secondary">
                    No templates match your search.
                  </TableCell>
                </TableRow> : null}
              {displayRows.map(t => <TableRow key={t.id} style={editingId === String(t.id) ? {
              background: 'var(--primary-50)'
            } : undefined}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <StatusBadge tone="indigo">{t.template_type}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-secondary">{t.subject || '—'}</TableCell>
                  <TableCell className="text-xs text-secondary" style={{
                maxWidth: 200
              }}>
                    {Array.isArray(t.variables) && t.variables.length ? t.variables.join(', ') : '—'}
                  </TableCell>
                  <TableCell>{t.is_active ? <StatusBadge tone="green">Active</StatusBadge> : <StatusBadge tone="gray">Off</StatusBadge>}</TableCell>
                  <TableCell style={{
                whiteSpace: 'nowrap'
              }}>
                    <StandardTableIconAction action="view" variant="ghost" tooltip="Preview with sample data" onClick={() => openSamplePreview({
                  name: t.name,
                  subject: t.subject,
                  body: t.body,
                  variables: t.variables
                })} />
                    <StandardTableIconAction action="edit" variant="ghost" onClick={() => startEdit(t)} />
                    <StandardTableIconAction action="delete" variant="danger" onClick={() => void remove(t.id)} />
                  </TableCell>
                </TableRow>)}
              {totalCount === 0 ? <TableRow>
                  <TableCell colSpan={6} className="text-center text-secondary">
                    No templates yet. Add one above.
                  </TableCell>
                </TableRow> : null}
            </TableBody>
          </Table>
        </div>
        </>}

      <MessageTemplateSamplePreviewModal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name ? `Preview — ${preview.name}` : 'Preview with sample data'} subject={preview?.subject} body={preview?.body} sampleVars={preview?.sampleVars} />
    </div>;
}
