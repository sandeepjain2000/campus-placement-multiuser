'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateDataEntryOfferPayload } from '@/lib/apiInputValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { cn } from '@/lib/utils';

export default function DataEntryOffersPage() {
  const [options, setOptions] = useState({ studentProfiles: [], drives: [], employers: [] });
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    id: '',
    studentId: '',
    driveId: '',
    employerId: '',
    jobTitle: '',
    location: '',
    salary: '',
    status: 'accepted',
    joiningDate: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [viewRow, setViewRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [optionsRes, offersRes] = await Promise.all([
        fetch('/api/data-entry/options'),
        fetch('/api/data-entry/offers'),
      ]);
      const optionsJson = await optionsRes.json();
      const offersJson = await offersRes.json();
      if (!optionsRes.ok) throw new Error(optionsJson?.error || 'Failed to load options');
      if (!offersRes.ok) throw new Error(offersJson?.error || 'Failed to load offers');
      setOptions({
        studentProfiles: optionsJson.studentProfiles || [],
        drives: optionsJson.drives || [],
        employers: optionsJson.employers || [],
      });
      setRows(offersJson.offers || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    getSearchText: (row) =>
      [row.student_email, row.job_title, row.location, row.status, row.employer_name, row.drive_title].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openAdd = () => {
    setMode('add');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: '',
      studentId: '',
      driveId: '',
      employerId: '',
      jobTitle: '',
      location: '',
      salary: '',
      status: 'accepted',
      joiningDate: '',
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      studentId: row.student_id || '',
      driveId: row.drive_id || '',
      employerId: row.employer_id || '',
      jobTitle: row.job_title || '',
      location: row.location || '',
      salary: row.salary ? String(row.salary) : '',
      status: row.status || 'accepted',
      joiningDate: row.joining_date ? String(row.joining_date).slice(0, 10) : '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const offerErr = validateDataEntryOfferPayload({ salary: form.salary, joiningDate: form.joiningDate });
    if (offerErr) {
      setError(offerErr);
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const method = mode === 'add' ? 'POST' : 'PUT';
      const res = await fetch('/api/data-entry/offers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save offer');
      setSuccess(mode === 'add' ? 'Offer created' : 'Offer updated');
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offer?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete offer');
      setSuccess('Offer deleted');
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="animate-fadeIn mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Data entry</p><h1 className="text-3xl font-bold tracking-tight">Offers</h1><p className="mt-1 text-sm text-muted-foreground">Super-admin backfill for exceptional offer records.</p></div><div className="flex flex-wrap gap-2"><StandardTableIconAction action="add" variant="primary" onClick={openAdd} /><Button variant="outline" onClick={loadData}>Refresh</Button><Link href="/data-entry" className={cn(buttonVariants({ variant: 'outline' }))}>Back to list</Link></div></header>
      <Alert><AlertDescription>Students accept or decline on Dashboard → My Offers. Employers create offers from Dashboard → Offers. Use this screen only for exceptional data entry.</AlertDescription></Alert>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert><AlertDescription>{success}</AlertDescription></Alert> : null}

        {showForm && (
          <Card><CardHeader><CardTitle>{mode === 'add' ? 'Add offer' : 'Edit offer'}</CardTitle><CardDescription>Link the offer to a student and optional drive or employer.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field><FieldLabel>Student profile</FieldLabel><AdminFilterSelect className="w-full" value={form.studentId} onValueChange={(v) => setForm((prev) => ({ ...prev, studentId: v }))} disabled={isLoading || mode === 'edit'} items={[{ label: 'Select student profile', value: 'all' }, ...options.studentProfiles.map((sp) => ({ label: `${(sp.first_name || '').trim()} ${(sp.last_name || '').trim()} (${sp.email || sp.id})`.trim(), value: String(sp.id) }))]} /></Field>
            <Field><FieldLabel>Drive (optional)</FieldLabel><AdminFilterSelect className="w-full" value={form.driveId} onValueChange={(v) => setForm((prev) => ({ ...prev, driveId: v }))} disabled={isLoading} items={[{ label: 'No drive selected', value: 'all' }, ...options.drives.map((d) => ({ label: `${d.title} (${d.status})`, value: String(d.id) }))]} /></Field>
            <Field><FieldLabel>Employer (optional)</FieldLabel><AdminFilterSelect className="w-full" value={form.employerId} onValueChange={(v) => setForm((prev) => ({ ...prev, employerId: v }))} disabled={isLoading} items={[{ label: 'No employer selected', value: 'all' }, ...options.employers.map((e) => ({ label: e.company_name, value: String(e.id) }))]} /></Field>
            <Field><FieldLabel>Status</FieldLabel><AdminFilterSelect className="w-full" value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))} emptyMapsToAll={false} items={[{ label: 'accepted', value: 'accepted' }, { label: 'pending', value: 'pending' }, { label: 'rejected', value: 'rejected' }, { label: 'expired', value: 'expired' }, { label: 'revoked', value: 'revoked' }]} /></Field>
            <Field><FieldLabel>Job title</FieldLabel><Input value={form.jobTitle} onChange={onChange('jobTitle')} required /></Field>
            <Field><FieldLabel>Location</FieldLabel><Input value={form.location} onChange={onChange('location')} /></Field>
            <Field><FieldLabel>Salary (INR)</FieldLabel><ValidatedNumberInput className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" fieldId={FIELD_IDS.EMPLOYER_OFFER_SALARY} value={form.salary} onChange={(v) => setForm((p) => ({ ...p, salary: v }))} /></Field>
            <Field><FieldLabel>Joining date</FieldLabel><ValidatedDateInput className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" fieldId={FIELD_IDS.EMPLOYER_OFFER_JOINING} value={form.joiningDate} onChange={(v) => setForm((p) => ({ ...p, joiningDate: v }))} /></Field>
          </FieldGroup>
          <div className="flex gap-2"><Button type="submit" disabled={isSubmitting || isLoading}>{isSubmitting ? 'Saving...' : mode === 'add' ? 'Create offer' : 'Update offer'}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </form></CardContent></Card>
        )}

        <Card><CardHeader><CardTitle>Existing offers</CardTitle></CardHeader><CardContent>
          {!isLoading && totalCount > 0 ? (
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search student, role, or status…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          ) : null}
          <div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Job title</TableHead><TableHead>Salary</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
                {displayRows.length === 0 && totalCount > 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No offers match your search.</TableCell></TableRow>
                ) : null}
                {displayRows.map((row) => (
                  <TableRow key={row.id}><TableCell>{row.first_name} {row.last_name || ''} ({row.email || '-'})</TableCell><TableCell>{row.job_title}</TableCell><TableCell>{row.salary ?? 0}</TableCell><TableCell><StatusBadge status={row.status} showDot>{row.status || '—'}</StatusBadge></TableCell><TableCell><div className="flex flex-wrap gap-1">
                          <StandardTableIconAction action="view" onClick={() => setViewRow(row)} />
                          <StandardTableIconAction action="edit" onClick={() => openEdit(row)} />
                          <StandardTableIconAction action="delete" variant="danger" onClick={() => handleDelete(row.id)} />
                  </div></TableCell></TableRow>
                ))}
                {!isLoading && totalCount === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-muted-foreground">No offers found.</TableCell></TableRow>
                ) : null}
              </TableBody></Table></div>
        </CardContent></Card>
        <Dialog open={Boolean(viewRow)} onOpenChange={(open) => !open && setViewRow(null)}><DialogContent><DialogHeader><DialogTitle>Offer details</DialogTitle><DialogDescription>Student, role, and placement linkage.</DialogDescription></DialogHeader>{viewRow ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="font-medium">Student</dt><dd>{viewRow.first_name} {viewRow.last_name || ''}</dd><dt className="font-medium">Job title</dt><dd>{viewRow.job_title}</dd><dt className="font-medium">Salary</dt><dd>{viewRow.salary ?? 0}</dd><dt className="font-medium">Status</dt><dd>{viewRow.status}</dd><dt className="font-medium">Drive</dt><dd>{viewRow.drive_title || '-'}</dd><dt className="font-medium">Employer</dt><dd>{viewRow.company_name || '-'}</dd></dl> : null}</DialogContent></Dialog>
    </div>
  );
}
