'use client';

import { useCallback, useState, useMemo } from 'react';
import useSWR from 'swr';
import { RotateCcw, CheckCircle, Clock, XCircle, Mail, Send, FileText } from 'lucide-react';
import { formatDate, formatCurrency, formatStatus } from '@/lib/utils';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateEmployerOfferPayload } from '@/lib/apiInputValidation';
import EmployerListFormLayout from '@/components/employer/EmployerListFormLayout';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import BulkOfferGeneratePanel from '@/components/employer/BulkOfferGeneratePanel';
import OfferEventTypeTabs from '@/components/employer/OfferEventTypeTabs';
import PageLoading from '@/components/PageLoading';
import {
  classifyOfferEventType,
  countOfferEventTypes,
  templateMatchesEventTab,
} from '@/lib/offerEventType';
import { Button } from '@/components/ui/button';
import DataTableToolbar from '@/components/DataTableToolbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const emptyOfferForm = {
  studentId: '',
  driveId: '',
  jobTitle: '',
  salary: '',
  location: '',
  joiningDate: '',
  deadlineAt: '',
  offerLetterUrl: '',
};

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load offers');
  return data;
};

function OfferFields({ value, onChange, students, drives, editing = false }) {
  const set = (key, nextValue) => onChange((previous) => ({ ...previous, [key]: nextValue }));

  return (
    <FieldGroup className="grid gap-5 md:grid-cols-2">
      {!editing ? (
        <Field>
          <FieldLabel htmlFor="offer-student">Student</FieldLabel>
          <AdminFilterSelect
            id="offer-student"
            className="w-full"
            value={value.studentId}
            onValueChange={(studentId) => set('studentId', studentId)}
            items={[
              { label: 'Select student…', value: 'all' },
              ...students.map((student) => ({
                label: `${student.name}${student.collegeName ? ` — ${student.collegeName}` : ''}`,
                value: student.id,
              })),
            ]}
          />
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor="offer-drive">Drive (optional)</FieldLabel>
        <AdminFilterSelect
          id="offer-drive"
          className="w-full"
          value={value.driveId}
          onValueChange={(driveId) => set('driveId', driveId)}
          items={[
            { label: 'Not linked', value: 'all' },
            ...drives.map((drive) => ({
              label: `${drive.title}${drive.drive_date ? ` (${formatDate(drive.drive_date)})` : ''}`,
              value: drive.id,
            })),
          ]}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="offer-job-title">Job title</FieldLabel>
        <Input id="offer-job-title" name="jobTitle" value={value.jobTitle} onChange={(event) => set('jobTitle', event.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="offer-salary">Salary (INR annual)</FieldLabel>
        <ValidatedNumberInput id="offer-salary" fieldId={FIELD_IDS.EMPLOYER_OFFER_SALARY} value={value.salary} onChange={(nextValue) => set('salary', nextValue)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="offer-location">Location</FieldLabel>
        <Input id="offer-location" name="location" value={value.location} onChange={(event) => set('location', event.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="offer-joining-date">Joining date</FieldLabel>
        <ValidatedDateInput id="offer-joining-date" fieldId={FIELD_IDS.EMPLOYER_OFFER_JOINING} context={{ deadline: value.deadlineAt }} value={value.joiningDate} onChange={(nextValue) => set('joiningDate', nextValue)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="offer-deadline">Response deadline</FieldLabel>
        <ValidatedDateInput id="offer-deadline" fieldId={FIELD_IDS.EMPLOYER_OFFER_DEADLINE} value={value.deadlineAt} onChange={(nextValue) => set('deadlineAt', nextValue)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="offer-letter-url">Offer letter URL (optional)</FieldLabel>
        <Input id="offer-letter-url" name="offerLetterUrl" type="url" placeholder="https://example.com/offer-letter…" value={value.offerLetterUrl} onChange={(event) => set('offerLetterUrl', event.target.value)} />
      </Field>
    </FieldGroup>
  );
}

export default function EmployerOffersPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/offers', fetcher);
  const { data: optionsData } = useSWR('/api/employer/offers/options', fetcher);
  const { data: templatesData } = useSWR('/api/employer/offer-templates', fetcher);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  const [eventTab, setEventTab] = useState('drive');
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState(emptyOfferForm);
  const [editForm, setEditForm] = useState({
    driveId: '',
    jobTitle: '',
    salary: '',
    location: '',
    joiningDate: '',
    deadlineAt: '',
    offerLetterUrl: '',
  });

  const offers = useMemo(() => (Array.isArray(data?.offers) ? data.offers : []), [data?.offers]);
  const students = Array.isArray(optionsData?.students) ? optionsData.students : [];
  const drives = Array.isArray(optionsData?.drives) ? optionsData.drives : [];
  const internships = Array.isArray(optionsData?.internships) ? optionsData.internships : [];
  const templates = useMemo(
    () => (Array.isArray(templatesData?.templates) ? templatesData.templates : []),
    [templatesData?.templates],
  );

  const eventCounts = useMemo(
    () => countOfferEventTypes(offers, classifyOfferEventType),
    [offers],
  );

  const tabOffers = useMemo(
    () => offers.filter((o) => classifyOfferEventType(o) === eventTab),
    [offers, eventTab],
  );

  const driveTemplates = useMemo(
    () => templates.filter((t) => templateMatchesEventTab(t, 'drive')),
    [templates],
  );

  const internshipTemplates = useMemo(
    () => templates.filter((t) => templateMatchesEventTab(t, 'internship')),
    [templates],
  );

  const filteredOffers = useMemo(() => {
    const result = tabOffers.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = [o.student_name, o.college_name, o.job_title, o.location].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortOption === 'date_desc') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortOption === 'date_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortOption === 'salary_desc') return (Number(b.salary) || 0) - (Number(a.salary) || 0);
      if (sortOption === 'name_asc') return (a.student_name || '').localeCompare(b.student_name || '');
      return 0;
    });
  }, [tabOffers, search, statusFilter, sortOption]);

  const submitCreateOffer = async () => {
    if (!form.studentId || !form.jobTitle.trim()) {
      addToast('Student and job title are required.', 'warning');
      return;
    }
    const offerErr = validateEmployerOfferPayload({
      salary: form.salary,
      deadline: form.deadlineAt,
      joiningDate: form.joiningDate,
    });
    if (offerErr) {
      addToast(offerErr, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salary: Number(form.salary || 0),
          deadlineAt: form.deadlineAt ? new Date(`${form.deadlineAt}T23:59:59`).toISOString() : null,
          offerLetterUrl: form.offerLetterUrl.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to create offer');
      setShowCreate(false);
      setForm(emptyOfferForm);
      await mutate();
      addToast('Offer created successfully.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to create offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const revokeOffer = async (id) => {
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'revoked' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to revoke offer');
      await mutate();
      addToast('Offer revoked.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to revoke offer', 'error');
    }
  };

  const reopenOffer = async (id) => {
    if (!confirm('Reopen this offer as pending? Clears acceptance / decline timestamps so the student can respond again.')) {
      return;
    }
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'pending' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to reopen offer');
      await mutate();
      addToast('Offer set back to pending.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to reopen offer', 'error');
    }
  };

  const openEdit = (offer) => {
    setEditId(offer.id);
    setShowCreate(false);
    setViewRow(null);
    setEditForm({
      driveId: offer.drive_id || '',
      jobTitle: offer.job_title || '',
      salary: offer.salary != null ? String(offer.salary) : '',
      location: offer.location || '',
      joiningDate: offer.joining_date ? String(offer.joining_date).slice(0, 10) : '',
      deadlineAt: offer.deadline_at ? String(offer.deadline_at).slice(0, 10) : '',
      offerLetterUrl: offer.offer_letter_url || '',
    });
  };

  const submitEditOffer = async () => {
    if (!editId) return;
    const offerErr = validateEmployerOfferPayload({
      salary: editForm.salary,
      deadline: editForm.deadlineAt,
      joiningDate: editForm.joiningDate,
    });
    if (offerErr) {
      addToast(offerErr, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          driveId: editForm.driveId || null,
          jobTitle: editForm.jobTitle.trim(),
          salary: Number(editForm.salary || 0),
          location: editForm.location.trim() || null,
          joiningDate: editForm.joiningDate || null,
          deadlineAt: editForm.deadlineAt ? new Date(`${editForm.deadlineAt}T23:59:59`).toISOString() : null,
          offerLetterUrl: editForm.offerLetterUrl.trim() || null,
          syncReportedCompanyFromProfile: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to update offer');
      setEditId(null);
      await mutate();
      addToast('Offer updated.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteOffer = async (id) => {
    if (!confirm('Delete this offer row permanently?')) return;
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to delete offer');
      if (editId === id) setEditId(null);
      if (viewRow?.id === id) setViewRow(null);
      await mutate();
      addToast('Offer removed.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to delete offer', 'error');
    }
  };

  const resendOfferEmail = async (id) => {
    try {
      const res = await fetch(`/api/employer/offers/${id}/resend`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to resend email');
      addToast(json.message || 'Offer email sent again.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to resend email', 'error');
    }
  };

  const getOffersCsv = useCallback((_scope) => {
    const list = _scope === 'current' ? filteredOffers : tabOffers;
    const headers = ['Student', 'College', 'Role', 'Salary_INR', 'Salary_display', 'Location', 'Deadline', 'Status', 'Created'];
    const rows = list.map((o) => [
      o.student_name || '—',
      o.college_name || '—',
      o.job_title || '—',
      String(Number(o.salary) || 0),
      formatCurrency(Number(o.salary) || 0),
      o.location || '—',
      o.deadline_at || '',
      o.status || '',
      o.created_at || '',
    ]);
    return { headers, rows };
  }, [tabOffers, filteredOffers]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageLoading message="Loading offers…" inline />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertTitle>Could not load offers</AlertTitle>
          <AlertDescription>
            {error.message || 'Could not load offers.'}{' '}
            Confirm you are signed in as an employer, then reload or contact support if this continues.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const acceptedCount = tabOffers.filter((offer) => offer.status === 'accepted').length;
  const pendingCount = tabOffers.filter((offer) => offer.status === 'pending').length;
  const declinedCount = tabOffers.filter((offer) => ['rejected', 'declined'].includes(offer.status)).length;

  const closeCreateForm = () => {
    setShowCreate(false);
    setForm(emptyOfferForm);
  };

  const closeEditForm = () => setEditId(null);

  if (showCreate) {
    return (
      <EmployerListFormLayout
        title="Create offer"
        subtitle="Creates a pending offer the student can accept or decline on My Offers."
        onBack={closeCreateForm}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" disabled={submitting} onClick={closeCreateForm}>
              Cancel
            </Button>
            <Button type="button" onClick={submitCreateOffer} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Offer'}
            </Button>
          </div>
        }
      >
        <OfferFields value={form} onChange={setForm} students={students} drives={drives} />
      </EmployerListFormLayout>
    );
  }

  if (editId) {
    return (
      <EmployerListFormLayout
        title="Edit offer"
        subtitle="Updates terms for this row. Use Reopen to pending on the list to roll back status."
        onBack={closeEditForm}
        footer={
          <div className="flex gap-2">
            <Button type="button" onClick={submitEditOffer} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeEditForm} disabled={submitting}>
              Cancel
            </Button>
          </div>
        }
      >
        <OfferFields value={editForm} onChange={setEditForm} students={students} drives={drives} editing />
      </EmployerListFormLayout>
    );
  }

  const tabLabel =
    eventTab === 'internship' ? 'Internship' : eventTab === 'alumni_jobs' ? 'Alumni jobs' : 'Drive';

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Offers</h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
            Issue formal offer letters after selection. Bulk-generate from drive or internship selections, or create a single offer for special cases.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <ExportCsvSplitButton
              filenameBase="placement_offers"
              currentCount={filteredOffers.length}
              fullCount={tabOffers.length}
              getRows={getOffersCsv}
            />
            <StandardTableIconAction
              action="add"
              variant="primary"
              onClick={() => {
                setShowCreate(true);
                setEditId(null);
              }}
            />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: `${tabLabel} offers`, value: tabOffers.length, icon: Send },
          { label: 'Accepted', value: acceptedCount, icon: CheckCircle },
          { label: 'Pending response', value: pendingCount, icon: Clock },
          { label: 'Declined / rejected', value: declinedCount, icon: XCircle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardDescription>{label}</CardDescription>
              <Icon className="text-muted-foreground size-5" aria-hidden />
            </CardHeader>
            <CardContent><div className="text-3xl font-semibold tabular-nums">{value}</div></CardContent>
          </Card>
        ))}
      </div>

      <OfferEventTypeTabs activeTab={eventTab} onTabChange={setEventTab} counts={eventCounts} />

      {eventTab === 'drive' ? (
        <BulkOfferGeneratePanel scope="drive" postings={drives} templates={driveTemplates} onGenerated={mutate} />
      ) : null}

      {eventTab === 'internship' ? (
        <>
          <BulkOfferGeneratePanel
            scope="internship"
            postings={internships}
            templates={internshipTemplates}
            onGenerated={mutate}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PPO (Full-Time After Internship)</CardTitle>
              <CardDescription>
                Pre-Placement Offers are separate from internship selection offers. Confirm PPO on or after internship
                start, then generate from{' '}
                <a href="/dashboard/employer/internship-ppo" className="text-primary font-semibold hover:underline">
                  Internship PPO
                </a>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        </>
      ) : null}

      {eventTab === 'alumni_jobs' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alumni Job Offers</CardTitle>
            <CardDescription>One-off offers for alumni job selections — use Create Offer without linking a placement drive.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Offers Work on PlacementHub</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="m-0">
            <strong>Bulk generate</strong> creates pending offers for selected students who do not have one yet. Students
            accept or decline on <strong>My Offers</strong>.
          </p>
          <p className="m-0">
            <strong>Resend email</strong> if a student did not receive the letter. Each row is one student — five students
            with the same package means five rows.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-border gap-3 border-b px-4 py-3">
          <div>
            <CardTitle className="text-base">Offer Register</CardTitle>
            <CardDescription>{tabLabel} offers issued to students.</CardDescription>
          </div>
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search student, college, or role…"
            filter={statusFilter}
            onFilterChange={setStatusFilter}
            filterLabel="Status"
            filterOptions={[
              { value: '', label: 'All statuses' },
              ...['pending', 'accepted', 'declined', 'rejected', 'revoked', 'expired'].map((status) => ({
                value: status,
                label: formatStatus(status),
              })),
            ]}
            sort={sortOption}
            onSortChange={setSortOption}
            sortOptions={[
              { value: 'date_desc', label: 'Newest first' },
              { value: 'date_asc', label: 'Oldest first' },
              { value: 'salary_desc', label: 'Highest salary' },
              { value: 'name_asc', label: 'Name (A–Z)' },
            ]}
            filteredCount={filteredOffers.length}
            totalCount={tabOffers.length}
            hasActiveFilters={Boolean(search || statusFilter || sortOption !== 'date_desc')}
            onClear={() => {
              setSearch('');
              setStatusFilter('');
              setSortOption('date_desc');
            }}
          />
        </CardHeader>
        <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="min-w-[6.5rem]">Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.length > 0 ? (
                  filteredOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div className="font-semibold">{offer.student_name || '—'}</div>
                        <div className="text-muted-foreground text-xs">{offer.college_name || '—'}</div>
                      </TableCell>
                      <TableCell>{offer.job_title || '—'}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(Number(offer.salary) || 0)}</TableCell>
                      <TableCell>{offer.location || '—'}</TableCell>
                      <TableCell className="text-sm">{offer.deadline_at ? formatDate(offer.deadline_at) : '—'}</TableCell>
                      <TableCell className="min-w-[6.5rem]">
                        <StatusBadge status={offer.status || 'pending'} showDot>{formatStatus(offer.status) || 'Pending'}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <StandardTableIconAction
                            action="view"
                            showLabel={false}
                            onClick={() => {
                              setViewRow(offer);
                            }}
                          />
                          <StandardTableIconAction action="edit" showLabel={false} onClick={() => openEdit(offer)} />
                          {['accepted', 'rejected', 'revoked', 'expired'].includes(offer.status) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title="Restore pending offer"
                              aria-label="Restore pending offer"
                              onClick={() => reopenOffer(offer.id)}
                            >
                              <RotateCcw size={16} strokeWidth={2} aria-hidden />
                            </Button>
                          )}
                          {offer.status === 'pending' && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title="Resend offer email"
                                aria-label="Resend offer email"
                                onClick={() => resendOfferEmail(offer.id)}
                              >
                                <Mail size={16} strokeWidth={2} aria-hidden />
                              </Button>
                              <StandardTableIconAction
                                action="archive"
                                variant="danger"
                                showLabel={false}
                                onClick={() => revokeOffer(offer.id)}
                              />
                            </>
                          )}
                          <StandardTableIconAction
                            action="delete"
                            variant="danger"
                            showLabel={false}
                            onClick={() => deleteOffer(offer.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}
                {tabOffers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-12">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
                        <FileText className="text-muted-foreground size-8" strokeWidth={1.5} aria-hidden />
                        <h3 className="m-0 text-base font-semibold">
                          No {eventTab === 'internship' ? 'internship' : eventTab === 'alumni_jobs' ? 'alumni job' : 'drive'} offers yet
                        </h3>
                        <p className="text-muted-foreground m-0 text-sm leading-relaxed">
                          {eventTab === 'drive'
                            ? 'Mark students selected on a drive, create a Drive template, then use Generate offers above — or Create offer for one student.'
                            : eventTab === 'internship'
                              ? 'Mark students selected on Applications → Internships, create an Internship template, then use Generate internship offers above. PPO is a separate step after the internship.'
                              : 'Use Create offer for alumni selections that are not tied to a campus placement drive.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      {viewRow ? (
        <Dialog open onOpenChange={(open) => { if (!open) setViewRow(null); }}>
          <DialogContent>
          <DialogHeader><DialogTitle>Offer detail</DialogTitle><DialogDescription>Full student offer record.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-2 text-sm leading-relaxed">
            <div><strong>Student:</strong> {viewRow.student_name}</div>
            <div><strong>College:</strong> {viewRow.college_name || '—'}</div>
            <div><strong>Role:</strong> {viewRow.job_title || '—'}</div>
            <div><strong>Salary:</strong> {formatCurrency(Number(viewRow.salary) || 0)}</div>
            <div><strong>Location:</strong> {viewRow.location || '—'}</div>
            <div><strong>Joining:</strong> {viewRow.joining_date ? formatDate(viewRow.joining_date) : '—'}</div>
            <div><strong>Deadline:</strong> {viewRow.deadline_at ? formatDate(viewRow.deadline_at) : '—'}</div>
            <div className="flex items-center gap-2"><strong>Status:</strong> <StatusBadge status={viewRow.status || 'pending'} showDot>{formatStatus(viewRow.status) || 'Pending'}</StatusBadge></div>
            {viewRow.offer_letter_url ? (
              <div>
                <strong>Offer letter:</strong>{' '}
                <a href={viewRow.offer_letter_url} target="_blank" rel="noopener noreferrer" className="link-inline">
                  View document
                </a>
              </div>
            ) : null}
          </div>
          <DialogFooter><Button type="button" variant="secondary" onClick={() => setViewRow(null)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
