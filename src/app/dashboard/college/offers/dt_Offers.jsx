'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import { Send } from 'lucide-react';
import { formatDate, formatCurrency, formatStatus } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import CompanyNameLink from '@/components/CompanyNameLink';
import { toDateOnlyString } from '@/lib/dateOnly';
import { validateCollegeOfferPayload } from '@/lib/apiInputValidation';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

const STATUS_OPTIONS = ['pending', 'accepted', 'rejected', 'expired', 'revoked'];

const OFFER_TABLE_COLUMNS = [
  'Student',
  'College',
  'Role',
  'Salary',
  'Location',
  'Deadline',
  'Status',
  'Actions',
];

function OfferEditorFields({ form, setForm, students, editingRow }) {
  const editing = Boolean(editingRow);

  return (
    <FieldGroup className="grid gap-5 md:grid-cols-2">
      {!editing ? (
        <Field>
          <FieldLabel htmlFor="college-offer-student">Student (master list)</FieldLabel>
          <AdminFilterSelect
            id="college-offer-student"
            className="w-full"
            value={form.studentId}
            onValueChange={(studentId) => setForm((p) => ({ ...p, studentId }))}
            items={[
              { label: 'Select student…', value: 'all' },
              ...students.map((student) => ({ label: student.label, value: student.id })),
            ]}
          />
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor="college-offer-company">Company name</FieldLabel>
        <Input id="college-offer-company" name="companyName" value={form.reportedCompanyName} onChange={(e) => setForm((p) => ({ ...p, reportedCompanyName: e.target.value }))} placeholder="Company named in the offer…" disabled={Boolean(editing && editingRow?.linked_employer)} />
        {editing && editingRow?.linked_employer ? <FieldDescription>Company comes from the linked employer account.</FieldDescription> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="college-offer-role">Role / job title</FieldLabel>
        <Input id="college-offer-role" name="jobTitle" value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
      </Field>
      <Field>
        <FieldLabel htmlFor="college-offer-salary">Salary (INR annual)</FieldLabel>
        <ValidatedNumberInput id="college-offer-salary" fieldId={FIELD_IDS.COLLEGE_OFFER_SALARY} value={form.salary} onChange={(value) => setForm((p) => ({ ...p, salary: value }))} />
      </Field>
      <Field>
        <FieldLabel htmlFor="college-offer-location">Location</FieldLabel>
        <Input id="college-offer-location" name="location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
      </Field>
      <Field>
        <FieldLabel htmlFor="college-offer-deadline">Response deadline</FieldLabel>
        <ValidatedDateInput id="college-offer-deadline" fieldId={FIELD_IDS.COLLEGE_OFFER_DEADLINE} value={form.deadline} onChange={(value) => setForm((p) => ({ ...p, deadline: value }))} />
      </Field>
      <Field>
        <FieldLabel htmlFor="college-offer-joining">Joining date</FieldLabel>
        <ValidatedDateInput id="college-offer-joining" fieldId={FIELD_IDS.COLLEGE_OFFER_JOINING} context={{ deadline: form.deadline }} value={form.joiningDate} onChange={(value) => setForm((p) => ({ ...p, joiningDate: value }))} />
      </Field>
      <Field>
        <FieldLabel htmlFor="college-offer-status">Status</FieldLabel>
        <AdminFilterSelect
          id="college-offer-status"
          className="w-full"
          value={form.status}
          onValueChange={(status) => setForm((p) => ({ ...p, status }))}
          emptyMapsToAll={false}
          items={STATUS_OPTIONS.map((status) => ({ label: formatStatus(status), value: status }))}
        />
      </Field>
    </FieldGroup>
  );
}

export default function DtCollegeOffers() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/offers', fetcher);
  const { data: studentsPayload } = useSWR('/api/college/students', fetcher);

  const offers = useMemo(() => (Array.isArray(data?.offers) ? data.offers : []), [data?.offers]);
  const offerFilterOptions = useMemo(
    () => [FILTER_ALL, ...STATUS_OPTIONS.map((s) => ({ value: s, label: formatStatus(s) }))],
    [],
  );
  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayOffers,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(offers, {
    getSearchText: (o) =>
      [o.student_name, o.roll_number, o.college_name, o.job_title, o.location, o.status].filter(Boolean).join(' '),
    filterFn: (row, f) => !f || String(row.status || '') === f,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });
  const summary = data?.summary || { total: 0, accepted: 0, pending: 0, rejected: 0, avgSalary: 0 };
  const students = useMemo(() => {
    const list = Array.isArray(studentsPayload?.students)
      ? studentsPayload.students
      : Array.isArray(studentsPayload)
        ? studentsPayload
        : [];
    return list.map((s) => ({
      id: s.id,
      label: `${s.name || '—'} (${s.roll || 'no roll'})`,
    }));
  }, [studentsPayload]);

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState({
    studentId: '',
    reportedCompanyName: '',
    jobTitle: '',
    salary: '',
    location: '',
    deadline: '',
    joiningDate: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const editingRow = useMemo(() => offers.find((o) => o.id === editId), [offers, editId]);

  const resetForm = () => {
    setForm({
      studentId: '',
      reportedCompanyName: '',
      jobTitle: '',
      salary: '',
      location: '',
      deadline: '',
      joiningDate: '',
      status: 'pending',
    });
  };

  const submitAdd = async () => {
    if (!form.studentId || !form.reportedCompanyName.trim() || !form.jobTitle.trim()) {
      addToast('Student, company name, and job title are required.', 'warning');
      return;
    }
    const offerErr = validateCollegeOfferPayload({
      salary: form.salary,
      deadline: form.deadline,
      joiningDate: form.joiningDate,
    });
    if (offerErr) {
      addToast(offerErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: form.studentId,
          reportedCompanyName: form.reportedCompanyName.trim(),
          jobTitle: form.jobTitle.trim(),
          salary: Number(form.salary || 0),
          location: form.location.trim() || null,
          deadline: form.deadline || null,
          joiningDate: form.joiningDate || null,
          status: form.status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Offer added.', 'success');
      setShowAdd(false);
      resetForm();
      await mutate();
    } catch (err) {
      addToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      studentId: row.student_id || '',
      reportedCompanyName: row.company_name || '',
      jobTitle: row.job_title || '',
      salary: row.salary != null ? String(row.salary) : '',
      location: row.location || '',
      deadline: row.deadline ? toDateOnlyString(row.deadline) : '',
      joiningDate: row.joining_date ? toDateOnlyString(row.joining_date) : '',
      status: row.status || 'pending',
    });
  };

  const submitEdit = async () => {
    if (!editId) return;
    if (!form.reportedCompanyName.trim() || !form.jobTitle.trim()) {
      addToast('Company name and job title are required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          reportedCompanyName: form.reportedCompanyName.trim(),
          jobTitle: form.jobTitle.trim(),
          salary: Number(form.salary || 0),
          location: form.location.trim() || null,
          deadline: form.deadline || null,
          joiningDate: form.joiningDate || null,
          status: form.status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      addToast('Offer updated.', 'success');
      setEditId(null);
      resetForm();
      await mutate();
    } catch (err) {
      addToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeOffer = async (id) => {
    if (!confirm('Delete this offer row?')) return;
    try {
      const res = await fetch('/api/college/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      addToast('Offer removed.', 'success');
      await mutate();
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  const closeModals = useCallback(() => {
    setShowAdd(false);
    setEditId(null);
    setViewRow(null);
    resetForm();
  }, []);

  const summaryLine = isLoading
    ? 'Loading offers…'
    : error
      ? 'Could not load counts'
      : `${summary.total ?? offers.length} offers · ${summary.accepted ?? 0} accepted · ${summary.pending ?? 0} pending · ${summary.rejected ?? 0} declined`;

  const avgSalaryLine =
    !isLoading && !error && summary.avgSalary
      ? `Avg accepted salary ${formatCurrency(summary.avgSalary)}`
      : null;

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-12">
      {error ? (
        <Alert variant="destructive"><AlertDescription>{error.message || 'Could not load offers.'}</AlertDescription></Alert>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Send className="text-muted-foreground size-7" aria-hidden />
            Placement Offers
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">{summaryLine}</p>
          {avgSalaryLine ? (
            <p className="text-muted-foreground mt-1 mb-0 text-xs">{avgSalaryLine}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StandardTableIconAction
            action="add"
            variant="primary"
            onClick={() => {
              resetForm();
              setShowAdd(true);
              setEditId(null);
            }}
          />
        </div>
      </div>

      <Alert aria-label="Student acceptance">
        <AlertDescription>
          If the student signs in, they can accept or decline <strong>pending</strong> rows on <strong>My Offers</strong>; status then syncs here. You can also set
          status manually when you already know the outcome (e.g. accepted from email). To roll back a mistaken status, open <strong>Edit</strong>, set{' '}
          <strong>Status</strong> to <strong>pending</strong> again, and save — or use <strong>Delete</strong> to remove a row (an older revision may become current
          automatically).
        </AlertDescription>
      </Alert>

      <Dialog open={showAdd || Boolean(editId)} onOpenChange={(open) => { if (!open) closeModals(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Offer' : 'Add Offer'}</DialogTitle>
            <DialogDescription>Record the offer terms and response status.</DialogDescription>
          </DialogHeader>
          <OfferEditorFields form={form} setForm={setForm} students={students} editingRow={editingRow} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={editId ? submitEdit : submitAdd}>
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search student, role, or company…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={offerFilterOptions}
          filterLabel="Status"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {OFFER_TABLE_COLUMNS.map((col, i) => (
                <TableHead
                  key={col}
                  style={
                    i === 0
                      ? { paddingLeft: '1.5rem' }
                      : i === OFFER_TABLE_COLUMNS.length - 1
                        ? { paddingRight: '1.5rem' }
                        : undefined
                  }
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !offers.length ? (
              <TableRow>
                <TableCell colSpan={OFFER_TABLE_COLUMNS.length} className="text-muted-foreground h-24 text-center">
                  Loading offers…
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && !error && displayOffers.length === 0 && totalCount > 0 ? (
              <TableRow>
                <TableCell colSpan={OFFER_TABLE_COLUMNS.length} className="text-muted-foreground h-24 text-center">
                  No offers match your search or filters.
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading &&
              !error &&
              displayOffers.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell className="pl-6 font-semibold">
                  {offer.student_name}
                  {offer.roll_number ? <div className="text-xs text-tertiary font-mono">{offer.roll_number}</div> : null}
                </TableCell>
                <TableCell>{offer.college_name || '—'}</TableCell>
                <TableCell>{offer.job_title || '—'}</TableCell>
                <TableCell>{offer.salary ? formatCurrency(Number(offer.salary)) : '—'}</TableCell>
                <TableCell>{offer.location || '—'}</TableCell>
                <TableCell>{offer.deadline ? formatDate(offer.deadline) : '—'}</TableCell>
                <TableCell className="min-w-[6.5rem]">
                  <StatusBadge status={offer.status || 'pending'} showDot>{formatStatus(offer.status) || 'Pending'}</StatusBadge>
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex flex-wrap items-center gap-1">
                    <StandardTableIconAction action="view" onClick={() => setViewRow(offer)} />
                    <StandardTableIconAction
                      action="edit"
                      onClick={() => {
                        setShowAdd(false);
                        openEdit(offer);
                      }}
                    />
                    <StandardTableIconAction action="delete" variant="danger" onClick={() => removeOffer(offer.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !error && offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={OFFER_TABLE_COLUMNS.length} className="px-8 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Send className="text-muted-foreground size-9 opacity-40" aria-hidden />
                    <div className="font-semibold">No offers yet</div>
                    <div className="text-muted-foreground text-sm">Use Add Offer above to log off-platform placements.</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      {viewRow && (
        <Dialog open onOpenChange={(open) => { if (!open) setViewRow(null); }}>
          <DialogContent>
          <DialogHeader><DialogTitle>Offer detail</DialogTitle><DialogDescription>Full placement offer record.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-2 text-sm leading-relaxed">
            <div>
              <strong>Student:</strong> {viewRow.student_name} ({viewRow.roll_number || '—'})
            </div>
            <div>
              <strong>College:</strong> {viewRow.college_name}
            </div>
            <div>
              <strong>Company:</strong>{' '}
              <CompanyNameLink name={viewRow.company_name} website={viewRow.company_website} />
            </div>
            <div>
              <strong>Role:</strong> {viewRow.job_title || '—'}
            </div>
            <div>
              <strong>Salary:</strong> {viewRow.salary ? formatCurrency(Number(viewRow.salary)) : '—'}
            </div>
            <div>
              <strong>Location:</strong> {viewRow.location || '—'}
            </div>
            <div>
              <strong>Deadline:</strong> {viewRow.deadline ? formatDate(viewRow.deadline) : '—'}
            </div>
            <div className="flex items-center gap-2">
              <strong>Status:</strong> <StatusBadge status={viewRow.status || 'pending'} showDot>{formatStatus(viewRow.status) || 'Pending'}</StatusBadge>
            </div>
            <div className="text-muted-foreground mt-2 text-xs">
              Linked employer account: {viewRow.linked_employer ? 'yes' : 'no (college-reported text company)'}
            </div>
          </div>
          <DialogFooter><Button type="button" variant="secondary" onClick={() => setViewRow(null)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
