'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, ROLE_FILTER_OPTIONS, roleFilterFn } from '@/lib/tableQueryPresets';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { cn } from '@/lib/utils';

export default function DataEntryUsersPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'student',
    isVerified: false,
    isActive: true,
  });
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [viewRow, setViewRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRows = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/data-entry/users');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load users');
      setRows(json.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(rows, {
    getSearchText: (row) => [row.email, row.first_name, row.last_name, row.role].filter(Boolean).join(' '),
    filterFn: roleFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
  });

  const onChange = (field) => (event) => {
    const value = ['isVerified', 'isActive'].includes(field) ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAdd = () => {
    setMode('add');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'student',
      isVerified: false,
      isActive: true,
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      email: row.email,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      password: '',
      role: row.role,
      isVerified: !!row.is_verified,
      isActive: !!row.is_active,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
              firstName: form.firstName,
              lastName: form.lastName,
              role: form.role,
              isVerified: form.isVerified,
              isActive: form.isActive,
            };
      const res = await fetch('/api/data-entry/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save user');
      setSuccess(mode === 'add' ? 'User created successfully' : 'User updated successfully');
      setShowForm(false);
      await loadRows();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete user');
      setSuccess('User deleted successfully');
      await loadRows();
    } catch (e) {
      setError(e.message);
    }
  };

  const studentNameLocked = mode === 'edit' && form.role === 'student' && !isSuperAdmin;

  return (
    <div className="animate-fadeIn mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Data entry</p>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create base user records for your tenant.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StandardTableIconAction action="add" variant="primary" onClick={openAdd} />
          <Button type="button" variant="outline" onClick={loadRows}>Refresh</Button>
          <Link href="/data-entry" className={cn(buttonVariants({ variant: 'outline' }))}>Back to list</Link>
        </div>
      </header>

      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert><AlertDescription>{success}</AlertDescription></Alert> : null}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{mode === 'add' ? 'Add user' : 'Edit user'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup className="grid gap-5 md:grid-cols-2">
                <Field><FieldLabel>Email</FieldLabel><Input type="email" value={form.email} onChange={onChange('email')} required disabled={mode === 'edit'} /></Field>
                <Field><FieldLabel>Role</FieldLabel><AdminFilterSelect className="w-full" value={form.role} onValueChange={(v) => setForm((prev) => ({ ...prev, role: v }))} emptyMapsToAll={false} items={[{ label: 'student', value: 'student' }, { label: 'college_admin', value: 'college_admin' }, { label: 'employer', value: 'employer' }]} /></Field>
                <Field><FieldLabel>First name</FieldLabel><Input value={form.firstName} onChange={onChange('firstName')} required disabled={studentNameLocked} readOnly={studentNameLocked} />{studentNameLocked ? <FieldDescription>Student names can only be changed by a super admin.</FieldDescription> : null}</Field>
                <Field><FieldLabel>Last name</FieldLabel><Input value={form.lastName} onChange={onChange('lastName')} disabled={studentNameLocked} readOnly={studentNameLocked} /></Field>
                {mode === 'add' ? <Field><FieldLabel>Password</FieldLabel><Input type="password" autoComplete="new-password" placeholder="Choose initial password" value={form.password} onChange={onChange('password')} required /></Field> : null}
                <Field orientation="horizontal" className="items-center gap-4">
                  <FieldLabel className="flex items-center gap-2"><Checkbox checked={form.isVerified} onCheckedChange={(v) => setForm((prev) => ({ ...prev, isVerified: !!v }))} /> Verified</FieldLabel>
                  <FieldLabel className="flex items-center gap-2"><Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((prev) => ({ ...prev, isActive: !!v }))} /> Active</FieldLabel>
                </Field>
              </FieldGroup>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : mode === 'add' ? 'Create user' : 'Update user'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Existing users</CardTitle></CardHeader>
        <CardContent>
          {!isLoading && totalCount > 0 ? (
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search email, name, or role…"
              filter={filter}
              onFilterChange={setFilter}
              filterOptions={ROLE_FILTER_OPTIONS}
              filterLabel="Role"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
              className="mb-4"
            />
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Verified</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {displayRows.length === 0 && totalCount > 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No users match your search or filters.</TableCell></TableRow>
                ) : null}
                {displayRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.first_name} {row.last_name || ''}</TableCell>
                    <TableCell><Badge variant="secondary">{row.role}</Badge></TableCell>
                    <TableCell><Badge variant={row.is_verified ? 'default' : 'outline'}>{row.is_verified ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell><Badge variant={row.is_active ? 'default' : 'outline'}>{row.is_active ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell><div className="flex flex-wrap items-center gap-1">
                          <StandardTableIconAction action="view" onClick={() => setViewRow(row)} />
                          <StandardTableIconAction action="edit" onClick={() => openEdit(row)} />
                          <StandardTableIconAction action="delete" variant="danger" onClick={() => handleDelete(row.id)} />
                    </div></TableCell>
                  </TableRow>
                ))}
                {!isLoading && totalCount === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground">No users found.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewRow)} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>User details</DialogTitle><DialogDescription>Account and access status for this user.</DialogDescription></DialogHeader>
          {viewRow ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="font-medium">Email</dt><dd>{viewRow.email}</dd><dt className="font-medium">Name</dt><dd>{viewRow.first_name} {viewRow.last_name || ''}</dd><dt className="font-medium">Role</dt><dd>{viewRow.role}</dd><dt className="font-medium">Verified</dt><dd>{viewRow.is_verified ? 'Yes' : 'No'}</dd><dt className="font-medium">Active</dt><dd>{viewRow.is_active ? 'Yes' : 'No'}</dd></dl> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
