'use client';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMPANY_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import { CalendarDays, Users, Building2, Plus, ChevronRight } from 'lucide-react';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { normalizeTimeHm, validateInterviewDateTimeOrError } from '@/lib/dateOnly';
import { findDuplicateCollegeInterviewSlot } from '@/lib/interviewSlotDuplicate';
import InterviewSlotActions from '@/components/interviews/InterviewSlotActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const EMPTY_COLLEGE_FORM = {
  company: '',
  round: '',
  date: '',
  startTime: '',
  endTime: '',
  interviewer: '',
  panelNames: '',
  students: '',
  createdBy: 'TPO',
};

function slotToForm(slot) {
  return {
    company: slot.company || '',
    round: slot.round || '',
    date: slot.date || '',
    startTime: slot.startTime || '',
    endTime: slot.endTime || '',
    interviewer: slot.interviewer || '',
    panelNames: slot.panelNames || '',
    students: Array.isArray(slot.students) ? slot.students.join(', ') : '',
    createdBy: slot.createdBy || 'TPO',
  };
}

function formatTimeDisplay(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const am = h < 12;
  const hr = h % 12 || 12;
  const mm = String(m || 0).padStart(2, '0');
  return `${hr}:${mm} ${am ? 'AM' : 'PM'}`;
}

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load interview slots');
  return json;
};

function formatSlotRange(slot) {
  if (slot.startTime && slot.endTime) {
    return `${formatTimeDisplay(slot.startTime)} – ${formatTimeDisplay(slot.endTime)}`;
  }
  if (slot.time) return slot.time;
  return '—';
}

export default function CollegeInterviewsPage() {
  const { addToast } = useToast();
  const { data, mutate, isLoading } = useSWR('/api/college/interviews', fetcher);
  const [section, setSection] = useState('schedule');
  const slots = useMemo(() => (Array.isArray(data?.slots) ? data.slots : []), [data?.slots]);
  const results = Array.isArray(data?.results) ? data.results : [];
  const {
    search: resultsSearch,
    setSearch: setResultsSearch,
    sort: resultsSort,
    setSort: setResultsSort,
    filtered: displayResults,
    filteredCount: resultsFilteredCount,
    totalCount: resultsTotalCount,
    hasActiveFilters: resultsHasActiveFilters,
    clearFilters: clearResultsFilters,
  } = useDataTableQuery(results, {
    getSearchText: (r) => [r.student, r.company, r.round, r.outcome].filter(Boolean).join(' '),
    sortOptions: COMPANY_SORT_OPTIONS,
    defaultSort: 'company_asc',
  });
  const [form, setForm] = useState(EMPTY_COLLEGE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_COLLEGE_FORM);
  };

  const startEdit = (slot) => {
    setEditingId(slot.id);
    setForm(slotToForm(slot));
  };

  const removeSlot = async (slot) => {
    if (!window.confirm(`Delete interview slot for ${slot.company} · ${slot.round}?`)) return;
    try {
      const res = await fetch(`/api/college/interviews/${slot.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete slot');
      if (editingId === slot.id) cancelEdit();
      await mutate();
      addToast('Interview slot deleted.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete interview slot', 'error');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.round.trim() || !form.date || !form.startTime || !form.endTime || !form.interviewer.trim()) return;
    const dateErr = validateFieldOrError(FIELD_IDS.COLLEGE_INTERVIEW_DATE, form.date);
    if (dateErr) {
      addToast(dateErr, 'warning');
      return;
    }
    const editingSlot = editingId ? slots.find((s) => s.id === editingId) : null;
    const allowPastDatetime =
      Boolean(editingSlot) &&
      form.date === (editingSlot.date || '') &&
      normalizeTimeHm(form.startTime) === normalizeTimeHm(editingSlot.startTime);
    const dateTimeErr = validateInterviewDateTimeOrError(form.date, form.startTime, {
      allowPast: allowPastDatetime,
    });
    if (dateTimeErr) {
      addToast(dateTimeErr, 'warning');
      return;
    }
    const payload = {
      ...form,
      students: form.students ? form.students.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    const duplicate = findDuplicateCollegeInterviewSlot(slots, payload, editingId);
    if (duplicate) {
      addToast('An interview slot with the same company, round, date, time, and interviewer already exists.', 'warning');
      return;
    }

    setSaving(true);
    const isEdit = Boolean(editingId);
    try {
      const url = isEdit ? `/api/college/interviews/${editingId}` : '/api/college/interviews';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || (isEdit ? 'Failed to update slot' : 'Failed to create slot'));
      await mutate();
      cancelEdit();
      addToast(isEdit ? 'Interview slot updated.' : 'Interview slot created successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save interview slot', 'error');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: slots.length,
      tpo: slots.filter((s) => s.createdBy === 'TPO').length,
      company: slots.filter((s) => s.createdBy === 'Company').length,
    }),
    [slots],
  );

  const getScheduleCsv = useCallback(
    (_scope) => ({
      headers: ['Company', 'Round', 'Date', 'Start', 'End', 'Interviewer', 'Panel_names', 'Students', 'Created_by'],
      rows: slots.map((s) => [
        s.company,
        s.round,
        s.date,
        s.startTime || '',
        s.endTime || '',
        s.interviewer,
        s.panelNames || '',
        s.students.join('; '),
        s.createdBy,
      ]),
    }),
    [slots],
  );

  const getResultsCsv = useCallback(
    (_scope) => ({
      headers: ['Student', 'Company', 'Round', 'Outcome', 'Date'],
      rows: displayResults.map((r) => [r.student, r.company, r.round, r.outcome, r.date]),
    }),
    [displayResults],
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-12">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <CalendarDays className="text-muted-foreground size-7" /> Interviews
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">Slot scheduling, panel names, and published outcomes. Evaluator feedback stays with the employer.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" render={<Link href="/dashboard/college/hiring-assessment" />} nativeButton={false}>
            Hiring Assessment <ChevronRight size={14} />
          </Button>
          {section === 'schedule' ? (
            <ExportCsvSplitButton filenameBase="college_interview_schedule" currentCount={slots.length} fullCount={slots.length} getRows={getScheduleCsv} />
          ) : (
            <ExportCsvSplitButton filenameBase="college_interview_results" currentCount={results.length} fullCount={results.length} getRows={getResultsCsv} />
          )}
        </div>
      </div>

      <Tabs value={section} onValueChange={setSection}>
      <TabsList>
        {[{ id: 'schedule', label: 'Scheduling' }, { id: 'results', label: 'Results' }].map(({ id, label }) => (
          <TabsTrigger key={id} value={id}>{label}</TabsTrigger>
        ))}
      </TabsList>
      </Tabs>

      {section === 'schedule' ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Total Slots', value: stats.total, icon: CalendarDays },
              { label: 'Scheduled by TPO', value: stats.tpo, icon: Users },
              { label: 'Scheduled by Company', value: stats.company, icon: Building2 },
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

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle>{editingId ? 'Edit Interview Slot' : 'Create Interview Slot'}</CardTitle>
                  <CardDescription>Set the window, host, and assigned students.</CardDescription>
                </div>
                {editingId ? (
                  <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                    Cancel edit
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
              <form onSubmit={submit}>
                <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="college-interview-company">Company</FieldLabel>
                  <Input id="college-interview-company" name="company" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="college-interview-round">Round</FieldLabel>
                  <Input id="college-interview-round" name="round" placeholder="E.g. Round 2 — HR" value={form.round} onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="college-interview-date">Interview date</FieldLabel>
                  <ValidatedDateInput id="college-interview-date" fieldId={FIELD_IDS.COLLEGE_INTERVIEW_DATE} value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="college-interview-start">Start time</FieldLabel>
                    <Input id="college-interview-start" name="startTime" type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="college-interview-end">End time</FieldLabel>
                    <Input id="college-interview-end" name="endTime" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="college-interview-host">Primary interviewer / host</FieldLabel>
                  <Input id="college-interview-host" name="interviewer" value={form.interviewer} onChange={(e) => setForm((p) => ({ ...p, interviewer: e.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="college-interview-panel">Panel names (optional)</FieldLabel>
                  <Input id="college-interview-panel" name="panelNames" placeholder="Comma-separated names…" value={form.panelNames} onChange={(e) => setForm((p) => ({ ...p, panelNames: e.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="college-interview-students">Assigned students</FieldLabel>
                  <Input id="college-interview-students" name="students" placeholder="Comma-separated student names…" value={form.students} onChange={(e) => setForm((p) => ({ ...p, students: e.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="college-interview-owner">Scheduled by</FieldLabel>
                  <AdminFilterSelect
                    id="college-interview-owner"
                    className="w-full"
                    value={form.createdBy}
                    onValueChange={(createdBy) => setForm((p) => ({ ...p, createdBy }))}
                    emptyMapsToAll={false}
                    items={[
                      { label: 'Scheduled by College (TPO)', value: 'TPO' },
                      { label: 'Scheduled by Company', value: 'Company' },
                    ]}
                  />
                </Field>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create Slot'}
                </Button>
                </FieldGroup>
              </form>
              </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden py-0">
              <CardHeader className="border-border border-b px-4 py-3">
                <CardTitle className="text-base">Upcoming Slots</CardTitle>
                <CardDescription>{slots.length} scheduled interview window{slots.length === 1 ? '' : 's'}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company &amp; Round</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading || slots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                          {isLoading ? 'Loading slots…' : 'No interview slots scheduled yet.'}
                        </TableCell>
                      </TableRow>
                    ) : slots.map((slot) => (
                      <TableRow key={slot.id} data-state={editingId === slot.id ? 'selected' : undefined}>
                        <TableCell>
                          <div className="font-semibold">{slot.company}</div>
                          <div className="text-muted-foreground text-xs">{slot.round}</div>
                        </TableCell>
                        <TableCell>
                          <div>{formatDate(slot.date)}</div>
                          <div className="text-muted-foreground text-xs">{formatSlotRange(slot)}</div>
                        </TableCell>
                        <TableCell className="max-w-44">
                          <div className="truncate">{slot.interviewer}</div>
                          {slot.panelNames ? <div className="text-muted-foreground truncate text-xs">{slot.panelNames}</div> : null}
                        </TableCell>
                        <TableCell><StatusBadge tone={slot.createdBy === 'TPO' ? 'indigo' : 'blue'} showDot>{slot.createdBy || 'Company'}</StatusBadge></TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                        <InterviewSlotActions
                          onEdit={() => startEdit(slot)}
                          onDelete={() => removeSlot(slot)}
                          disabled={saving}
                        />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          <Alert>
            <AlertDescription>
              Colleges see <strong>outcomes only</strong> (shortlist / reject / pending). Written feedback and rubric scores (Communication, Projects, Technical)
              are captured for the company workflow but are <strong>not displayed here</strong>.
            </AlertDescription>
          </Alert>
          {resultsTotalCount > 0 ? (
            <DataTableToolbar
              search={resultsSearch}
              onSearchChange={setResultsSearch}
              searchPlaceholder="Search student, company, or outcome…"
              sort={resultsSort}
              onSortChange={setResultsSort}
              sortOptions={COMPANY_SORT_OPTIONS}
              filteredCount={resultsFilteredCount}
              totalCount={resultsTotalCount}
              hasActiveFilters={resultsHasActiveFilters}
              onClear={clearResultsFilters}
            />
          ) : null}
          <Card className="gap-0 overflow-hidden py-0">
            <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead className="min-w-[6.5rem]">Outcome</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayResults.length === 0 && resultsTotalCount > 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                      No results match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
                {displayResults.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.student}</TableCell>
                    <TableCell>
                      <CompanyNameLink name={r.company} website={r.website} />
                    </TableCell>
                    <TableCell>{r.round}</TableCell>
                    <TableCell className="min-w-[6.5rem]"><StatusBadge status={r.outcome || 'pending'} showDot>{r.outcome || 'Pending'}</StatusBadge></TableCell>
                    <TableCell>{formatDate(r.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
