'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateDataEntryStudentPayload } from '@/lib/apiInputValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { cn } from '@/lib/utils';

export default function DataEntryStudentProfilesPage() {
  const [studentUsers, setStudentUsers] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    id: '',
    userId: '',
    department: '',
    cgpa: '7.50',
    placementStatus: 'unplaced',
    batchYear: '',
    graduationYear: '',
    isVerified: false,
  });
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [viewRow, setViewRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [optionsRes, profilesRes] = await Promise.all([
        fetch('/api/data-entry/options'),
        fetch('/api/data-entry/student-profiles'),
      ]);
      const optionsJson = await optionsRes.json();
      const profilesJson = await profilesRes.json();
      if (!optionsRes.ok) throw new Error(optionsJson?.error || 'Failed to load options');
      if (!profilesRes.ok) throw new Error(profilesJson?.error || 'Failed to load student profiles');
      const studentsOnly = optionsJson.studentUsers || [];
      const allUsers = optionsJson.tenantUsers || [];
      setStudentUsers(studentsOnly.length > 0 ? studentsOnly : allUsers);
      setRows(profilesJson.studentProfiles || []);
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
      [row.email, row.department, row.placement_status, row.batch_year, row.graduation_year].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
  });

  const onChange = (field) => (event) => {
    const value = field === 'isVerified' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAdd = () => {
    setMode('add');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: '',
      userId: '',
      department: '',
      cgpa: '7.50',
      placementStatus: 'unplaced',
      batchYear: '',
      graduationYear: '',
      isVerified: false,
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      userId: row.user_id,
      department: row.department || '',
      cgpa: String(row.cgpa ?? ''),
      placementStatus: row.placement_status || 'unplaced',
      batchYear: String(row.batch_year ?? ''),
      graduationYear: String(row.graduation_year ?? ''),
      isVerified: !!row.is_verified,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErr = validateDataEntryStudentPayload(form);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const method = mode === 'add' ? 'POST' : 'PUT';
      const payload =
        mode === 'add'
          ? form
          : {
              id: form.id,
              department: form.department,
              cgpa: form.cgpa,
              placementStatus: form.placementStatus,
              batchYear: form.batchYear,
              graduationYear: form.graduationYear,
              isVerified: form.isVerified,
            };
      const res = await fetch('/api/data-entry/student-profiles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save student profile');
      setSuccess(mode === 'add' ? 'Student profile created' : 'Student profile updated');
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student profile?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/student-profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete student profile');
      setSuccess('Student profile deleted');
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="animate-fadeIn mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-muted-foreground">Data entry</p><h1 className="text-3xl font-bold tracking-tight">Student profiles</h1><p className="mt-1 text-sm text-muted-foreground">Create profile rows linked to student users.</p></div>
        <div className="flex flex-wrap gap-2"><StandardTableIconAction action="add" variant="primary" onClick={openAdd} /><Button variant="outline" onClick={loadData}>Refresh</Button><Link href="/data-entry" className={cn(buttonVariants({ variant: 'outline' }))}>Back to list</Link></div>
      </header>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert><AlertDescription>{success}</AlertDescription></Alert> : null}
      {showForm ? <Card><CardHeader><CardTitle>{mode === 'add' ? 'Add student profile' : 'Edit student profile'}</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6"><FieldGroup className="grid gap-5 md:grid-cols-2">
          <Field className="md:col-span-2"><FieldLabel>Student user</FieldLabel><AdminFilterSelect className="w-full" value={form.userId} onValueChange={(v) => setForm((prev) => ({ ...prev, userId: v }))} disabled={isLoading || mode === 'edit'} items={[{ label: 'Select a student user', value: 'all' }, ...studentUsers.map((u) => ({ label: `${u.first_name} ${u.last_name || ''} (${u.email})`.trim(), value: String(u.id) }))]} /></Field>
          <Field><FieldLabel>Department</FieldLabel><Input value={form.department} onChange={onChange('department')} required /></Field>
          <Field><FieldLabel>CGPA</FieldLabel><ValidatedNumberInput className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" fieldId={FIELD_IDS.STUDENT_CGPA} step="0.01" value={form.cgpa} onChange={(v) => setForm((p) => ({ ...p, cgpa: v }))} /></Field>
          <Field><FieldLabel>Placement status</FieldLabel><AdminFilterSelect className="w-full" value={form.placementStatus} onValueChange={(v) => setForm((prev) => ({ ...prev, placementStatus: v }))} emptyMapsToAll={false} items={[{ label: 'Unplaced', value: 'unplaced' }, { label: 'Placed', value: 'placed' }, { label: 'Opted out', value: 'opted_out' }, { label: 'Higher studies', value: 'higher_studies' }]} /></Field>
          <Field><FieldLabel>Batch year</FieldLabel><ValidatedNumberInput className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" fieldId={FIELD_IDS.STUDENT_BATCH_YEAR} value={form.batchYear} onChange={(v) => setForm((p) => ({ ...p, batchYear: v }))} /></Field>
          <Field><FieldLabel>Graduation year</FieldLabel><ValidatedNumberInput className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" fieldId={FIELD_IDS.STUDENT_GRAD_YEAR} context={{ batchYear: form.batchYear }} value={form.graduationYear} onChange={(v) => setForm((p) => ({ ...p, graduationYear: v }))} /></Field>
          <Field orientation="horizontal" className="items-center"><Checkbox id="profile-verified" checked={form.isVerified} onCheckedChange={(v) => setForm((prev) => ({ ...prev, isVerified: !!v }))} /><FieldLabel htmlFor="profile-verified">Mark verified</FieldLabel></Field>
        </FieldGroup><div className="flex gap-2"><Button type="submit" disabled={isSubmitting || isLoading}>{isSubmitting ? 'Saving...' : mode === 'add' ? 'Create student profile' : 'Update student profile'}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div></form>
      </CardContent></Card> : null}
      <Card><CardHeader><CardTitle>Existing student profiles</CardTitle></CardHeader><CardContent>
          {!isLoading && totalCount > 0 ? (
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search student, department, or status…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          ) : null}
          <div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Department</TableHead><TableHead>CGPA</TableHead><TableHead>Status</TableHead><TableHead>Verified</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
                {displayRows.length === 0 && totalCount > 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No profiles match your search.</TableCell></TableRow>
                ) : null}
                {displayRows.map((row) => (
                  <TableRow key={row.id}><TableCell>{row.first_name} {row.last_name || ''} ({row.email || '-'})</TableCell><TableCell>{row.department || '-'}</TableCell><TableCell>{row.cgpa ?? '-'}</TableCell><TableCell><Badge variant="secondary">{row.placement_status || '-'}</Badge></TableCell><TableCell><Badge variant={row.is_verified ? 'default' : 'outline'}>{row.is_verified ? 'Yes' : 'No'}</Badge></TableCell><TableCell><div className="flex flex-wrap gap-1">
                          <StandardTableIconAction action="view" onClick={() => setViewRow(row)} />
                          <StandardTableIconAction action="edit" onClick={() => openEdit(row)} />
                          <StandardTableIconAction action="delete" variant="danger" onClick={() => handleDelete(row.id)} />
                  </div></TableCell></TableRow>
                ))}
                {!isLoading && totalCount === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground">No student profiles found.</TableCell></TableRow>
                ) : null}
              </TableBody></Table>
          </div>
      </CardContent></Card>
      <Dialog open={Boolean(viewRow)} onOpenChange={(open) => !open && setViewRow(null)}><DialogContent><DialogHeader><DialogTitle>Student profile details</DialogTitle><DialogDescription>Academic and placement information.</DialogDescription></DialogHeader>{viewRow ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="font-medium">Student</dt><dd>{viewRow.first_name} {viewRow.last_name || ''}</dd><dt className="font-medium">Email</dt><dd>{viewRow.email || '-'}</dd><dt className="font-medium">Department</dt><dd>{viewRow.department || '-'}</dd><dt className="font-medium">CGPA</dt><dd>{viewRow.cgpa ?? '-'}</dd><dt className="font-medium">Status</dt><dd>{viewRow.placement_status || '-'}</dd></dl> : null}</DialogContent></Dialog>
    </div>
  );
}
