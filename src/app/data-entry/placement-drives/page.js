'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate, formatStatus } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateDataEntryDrivePayload } from '@/lib/apiInputValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function DataEntryPlacementDrivesPage() {
  const [employers, setEmployers] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    status: 'scheduled',
    driveDate: '',
    venue: '',
    maxStudents: '',
    employerId: '',
  });
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [mode, setMode] = useState('add');
  const [viewRow, setViewRow] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [optionsRes, drivesRes] = await Promise.all([
        fetch('/api/data-entry/options'),
        fetch('/api/data-entry/placement-drives'),
      ]);
      const optionsJson = await optionsRes.json();
      const drivesJson = await drivesRes.json();
      if (!optionsRes.ok) throw new Error(optionsJson?.error || 'Failed to load options');
      if (!drivesRes.ok) throw new Error(drivesJson?.error || 'Failed to load placement drives');
      setEmployers(optionsJson.employers || []);
      setRows(drivesJson.placementDrives || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openAdd = () => {
    setMode('add');
    setShowFormModal(true);
    setError('');
    setSuccess('');
    setForm({
      id: '',
      title: '',
      description: '',
      status: 'scheduled',
      driveDate: '',
      venue: '',
      maxStudents: '',
      employerId: '',
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowFormModal(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      status: row.status || 'scheduled',
      driveDate: row.drive_date ? String(row.drive_date).slice(0, 10) : '',
      venue: row.venue || '',
      maxStudents: row.max_students ? String(row.max_students) : '',
      employerId: row.employer_id || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const driveErr = validateDataEntryDrivePayload({
      driveDate: form.driveDate,
      maxStudents: form.maxStudents,
    });
    if (driveErr) {
      setError(driveErr);
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const method = mode === 'add' ? 'POST' : 'PUT';
      const res = await fetch('/api/data-entry/placement-drives', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save drive');
      setSuccess(mode === 'add' ? 'Placement drive created' : 'Placement drive updated');
      setShowFormModal(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this placement drive?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/placement-drives', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete drive');
      setSuccess('Placement drive deleted');
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  const getEmployerName = (id) => {
    const emp = employers.find(e => e.id === id);
    return emp ? emp.company_name : 'No employer linked';
  };

  return (
    <div className="animate-fadeIn mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-muted-foreground">Data entry</p><h1 className="text-3xl font-bold tracking-tight">Placement drives</h1><p className="mt-1 text-sm text-muted-foreground">Manage master records for campus placement drives.</p></div>
        <div className="flex flex-wrap gap-2"><StandardTableIconAction action="add" variant="primary" onClick={openAdd} /><Button variant="outline" onClick={loadData}>Refresh</Button><Link href="/data-entry" className={cn(buttonVariants({ variant: 'outline' }))}>Back to list</Link></div>
      </header>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert><AlertDescription>{success}</AlertDescription></Alert> : null}
      <Card>
        <CardHeader><CardTitle>Placement drives</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading placement drives…</p> : rows.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-center"><CalendarDays className="text-muted-foreground" /><p className="font-medium">No drives recorded</p><p className="text-sm text-muted-foreground">Create your first placement drive to see it listed here.</p><StandardTableIconAction action="add" variant="primary" onClick={openAdd} /></div> : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Drive</TableHead><TableHead>Employer</TableHead><TableHead>Date</TableHead><TableHead>Venue</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.title}</TableCell><TableCell>{getEmployerName(row.employer_id)}</TableCell><TableCell>{row.drive_date ? formatDate(row.drive_date) : '—'}</TableCell><TableCell>{row.venue || '—'}</TableCell><TableCell><StatusBadge status={row.status} showDot>{formatStatus(row.status) || 'Open'}</StatusBadge></TableCell><TableCell><div className="flex gap-1"><StandardTableIconAction action="view" onClick={() => setViewRow(row)} /><StandardTableIconAction action="edit" onClick={() => openEdit(row)} /><StandardTableIconAction action="delete" variant="danger" onClick={() => handleDelete(row.id)} /></div></TableCell></TableRow>)}</TableBody></Table></div>
          )}
        </CardContent>
      </Card>
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <DialogHeader><DialogTitle>{mode === 'add' ? 'Create placement drive' : 'Edit placement drive'}</DialogTitle><DialogDescription>Enter scheduling, employer, and capacity details.</DialogDescription></DialogHeader>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <Field className="md:col-span-2"><FieldLabel>Drive title</FieldLabel><Input value={form.title} onChange={onChange('title')} required placeholder="e.g. Google Campus Hiring 2026" /></Field>
              <Field className="md:col-span-2"><FieldLabel>Description</FieldLabel><Textarea rows={3} value={form.description} onChange={onChange('description')} /></Field>
              <Field><FieldLabel>Employer / company</FieldLabel><AdminFilterSelect className="w-full" value={form.employerId} onValueChange={(v) => setForm((prev) => ({ ...prev, employerId: v }))} disabled={isLoading} items={[{ label: 'No employer selected', value: 'all' }, ...employers.map((e) => ({ label: e.company_name, value: String(e.id) }))]} /></Field>
              <Field><FieldLabel>Status</FieldLabel><AdminFilterSelect className="w-full" value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))} emptyMapsToAll={false} items={[{ label: 'Requested', value: 'requested' }, { label: 'Approved', value: 'approved' }, { label: 'Scheduled', value: 'scheduled' }, { label: 'In progress', value: 'in_progress' }, { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' }]} /></Field>
              <Field><FieldLabel>Drive date</FieldLabel><ValidatedDateInput className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" fieldId={FIELD_IDS.EMPLOYER_DRIVE_DATE} value={form.driveDate} onChange={(v) => setForm((p) => ({ ...p, driveDate: v }))} /></Field>
              <Field><FieldLabel>Venue / platform</FieldLabel><Input value={form.venue} onChange={onChange('venue')} /></Field>
              <Field><FieldLabel>Max students</FieldLabel><ValidatedNumberInput className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" fieldId={FIELD_IDS.DRIVE_MAX_STUDENTS} value={form.maxStudents} onChange={(v) => setForm((p) => ({ ...p, maxStudents: v }))} /></Field>
            </FieldGroup>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : mode === 'add' ? 'Create drive' : 'Save changes'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(viewRow)} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent><DialogHeader><DialogTitle>Drive details</DialogTitle><DialogDescription>{viewRow?.title}</DialogDescription></DialogHeader>{viewRow ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="font-medium">Status</dt><dd><StatusBadge status={viewRow.status} showDot>{formatStatus(viewRow.status) || 'Open'}</StatusBadge></dd><dt className="font-medium">Employer</dt><dd>{getEmployerName(viewRow.employer_id)}</dd><dt className="font-medium">Date</dt><dd>{viewRow.drive_date ? formatDate(viewRow.drive_date) : '—'}</dd><dt className="font-medium">Venue</dt><dd>{viewRow.venue || '—'}</dd><dt className="font-medium">Capacity</dt><dd>{viewRow.max_students ? `${viewRow.max_students} students` : 'Unlimited'}</dd><dt className="font-medium">Description</dt><dd>{viewRow.description || 'No description provided.'}</dd></dl> : null}</DialogContent>
      </Dialog>
    </div>
  );
}
