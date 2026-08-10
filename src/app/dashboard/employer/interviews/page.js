'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import { formatDate } from '@/lib/utils';
import { getInitialCalendarCursorFromIsoDates } from '@/lib/calendarInitialCursor';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { findDuplicateEmployerInterviewSlot } from '@/lib/interviewSlotDuplicate';
import { useToast } from '@/components/ToastProvider';
import { CalendarCheck } from 'lucide-react';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { normalizeTimeHm, validateInterviewDateTimeOrError } from '@/lib/dateOnly';
import InterviewSlotActions from '@/components/interviews/InterviewSlotActions';
import { EMPLOYER_CAMPUS_INTERVIEW_TABS, interviewSlotMatchesKind, interviewTabLabel } from '@/lib/employerInterviewOpportunity';
import { isEmployerAlumniDashboardPath } from '@/lib/employerAlumniRoutes';
import { INTERVIEW_TIMEFRAME_DISCLAIMER } from '@/lib/employerInterviewEmail';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EMPTY_EMPLOYER_FORM = {
  opportunityId: '',
  round: 'Round 1 - DSA',
  date: '',
  time: '',
  assigned: 0,
  mode: 'Virtual',
  panelNames: '',
};

const campusesFetcher = (url) =>
  fetch(url, { credentials: 'include' }).then(async (res) => {
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to load campuses');
    return json;
  });

function persistActiveCampus(campus) {
  if (!campus?.id) {
    sessionStorage.removeItem('activeCampus');
    try {
      localStorage.removeItem('activeCampus');
    } catch {
      /**/
    }
    return;
  }
  const payload = JSON.stringify({
    id: campus.id,
    name: campus.name,
    city: campus.city || '',
  });
  sessionStorage.setItem('activeCampus', payload);
  try {
    localStorage.setItem('activeCampus', payload);
  } catch {
    /**/
  }
}

function readStoredCampusId() {
  try {
    const stored = sessionStorage.getItem('activeCampus');
    if (!stored) return '';
    const campus = JSON.parse(stored);
    return campus?.id ? String(campus.id) : '';
  } catch {
    sessionStorage.removeItem('activeCampus');
    return '';
  }
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

export default function EmployerInterviewsPage() {
  const pathname = usePathname();
  const isAlumniScope = isEmployerAlumniDashboardPath(pathname);
  const interviewTabs = isAlumniScope ? [] : EMPLOYER_CAMPUS_INTERVIEW_TABS;
  const lockedKind = isAlumniScope ? 'jobs' : null;

  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [activeKind, setActiveKind] = useState(isAlumniScope ? 'jobs' : 'internship');
  const [view, setView] = useState('list');
  const [form, setForm] = useState(EMPTY_EMPLOYER_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notifyingId, setNotifyingId] = useState(null);

  const { data: campusData, isLoading: campusesLoading } = useSWR(
    '/api/employer/campuses',
    campusesFetcher,
    { revalidateOnFocus: false },
  );

  const approvedCampuses = useMemo(
    () =>
      (campusData?.colleges || []).filter(
        (c) => String(c.approval_status || '').toLowerCase() === 'approved',
      ),
    [campusData],
  );

  const selectedCampus = useMemo(
    () => approvedCampuses.find((c) => c.id === selectedCampusId) || null,
    [approvedCampuses, selectedCampusId],
  );

  const effectiveKind = lockedKind || activeKind;

  const opportunitiesUrl =
    selectedCampusId && effectiveKind
      ? `/api/employer/assessments/targets?tenantId=${encodeURIComponent(selectedCampusId)}&kind=${encodeURIComponent(effectiveKind)}${isAlumniScope ? '&alumniOnly=1' : ''}`
      : null;

  const { data: targetsData, isLoading: targetsLoading } = useSWR(
    opportunitiesUrl,
    campusesFetcher,
    { revalidateOnFocus: false },
  );

  const openingOptions = useMemo(
    () => (Array.isArray(targetsData?.targets) ? targetsData.targets : []),
    [targetsData],
  );

  useEffect(() => {
    if (!approvedCampuses.length) {
      setSelectedCampusId('');
      return;
    }
    setSelectedCampusId((prev) => {
      if (prev && approvedCampuses.some((c) => c.id === prev)) return prev;
      const storedId = readStoredCampusId();
      if (storedId && approvedCampuses.some((c) => c.id === storedId)) return storedId;
      return approvedCampuses[0].id;
    });
  }, [approvedCampuses]);

  useEffect(() => {
    if (selectedCampus) persistActiveCampus(selectedCampus);
  }, [selectedCampus]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedCampusId) {
        setRows([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/employer/interviews?campusId=${encodeURIComponent(selectedCampusId)}&kind=${encodeURIComponent(effectiveKind)}`,
          { credentials: 'include' },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load interview plan');
        if (!mounted) return;
        setRows(Array.isArray(json.rows) ? json.rows : []);
      } catch (e) {
        if (!mounted) return;
        setRows([]);
        addToast(e.message || 'Failed to load interview plan', 'error');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedCampusId, effectiveKind, addToast]);

  useEffect(() => {
    if (isAlumniScope) {
      setActiveKind('jobs');
    } else if (activeKind === 'jobs') {
      setActiveKind('internship');
    }
  }, [isAlumniScope]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKindChange = (kind) => {
    if (lockedKind) return;
    setActiveKind(kind);
    cancelEdit();
    setForm((p) => ({ ...EMPTY_EMPLOYER_FORM, round: p.round }));
  };

  const handleCampusChange = (campusId) => {
    setSelectedCampusId(campusId);
    cancelEdit();
    const campus = approvedCampuses.find((c) => c.id === campusId);
    if (campus) persistActiveCampus(campus);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_EMPLOYER_FORM);
  };

  const startEdit = (row) => {
    if (!lockedKind && row.opportunityKind) setActiveKind(row.opportunityKind);
    setEditingId(row.id);
    setForm({
      opportunityId: row.opportunityId || '',
      round: row.round || '',
      date: row.date || '',
      time: row.time || '',
      assigned: row.assigned ?? 0,
      mode: row.mode || 'Virtual',
      panelNames: row.panelNames || '',
    });
  };

  const notifyApplicants = async (row) => {
    if (!selectedCampusId || !row?.id) return;
    if (!row.opportunityId) {
      addToast('Edit this slot and link it to a specific opening before emailing applicants.', 'warning');
      return;
    }
    if (
      !window.confirm(
        `Email all applicants for "${row.opportunityTitle || 'this opening'}" about this interview window?\n\n${INTERVIEW_TIMEFRAME_DISCLAIMER}`,
      )
    ) {
      return;
    }
    setNotifyingId(row.id);
    try {
      const res = await fetch('/api/employer/interviews/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campusId: selectedCampusId, planId: row.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to email applicants');
      addToast(`Interview window emailed to ${json.sent} applicant${json.sent === 1 ? '' : 's'}.`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to email applicants', 'error');
    } finally {
      setNotifyingId(null);
    }
  };

  const removeSlot = async (row) => {
    if (!selectedCampusId) return;
    if (!window.confirm(`Delete interview slot ${row.campus} · ${row.round}?`)) return;
    try {
      const res = await fetch(
        `/api/employer/interviews/${row.id}?campusId=${encodeURIComponent(selectedCampusId)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete interview slot');
      setRows(Array.isArray(json.rows) ? json.rows.filter((r) => interviewSlotMatchesKind(r, effectiveKind)) : []);
      if (editingId === row.id) cancelEdit();
      addToast('Interview slot deleted.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete interview slot', 'error');
    }
  };

  const saveSlot = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time || !selectedCampusId) {
      addToast('Select a college, date, and time.', 'warning');
      return;
    }
    if (!form.opportunityId) {
      addToast(
        `Select a specific ${interviewTabLabel(effectiveKind).toLowerCase()} opening.`,
        'warning',
      );
      return;
    }
    const dateErr = validateFieldOrError(FIELD_IDS.EMPLOYER_INTERVIEW_DATE, form.date);
    if (dateErr) {
      addToast(dateErr, 'warning');
      return;
    }
    const editingRow = editingId ? rows.find((r) => r.id === editingId) : null;
    const allowPastDatetime =
      Boolean(editingRow) &&
      form.date === (editingRow.date || '') &&
      normalizeTimeHm(form.time) === normalizeTimeHm(editingRow.time);
    const dateTimeErr = validateInterviewDateTimeOrError(form.date, form.time, {
      allowPast: allowPastDatetime,
    });
    if (dateTimeErr) {
      addToast(dateTimeErr, 'warning');
      return;
    }
    const assignedErr = validateFieldOrError(FIELD_IDS.EMPLOYER_INTERVIEW_ASSIGNED, form.assigned);
    if (assignedErr) {
      addToast(assignedErr, 'warning');
      return;
    }
    const candidate = {
      campusId: selectedCampusId,
      campus: selectedCampus?.name || '',
      opportunityKind: effectiveKind,
      opportunityId: form.opportunityId,
      date: form.date,
      time: form.time,
      round: form.round,
      mode: form.mode,
    };
    const duplicate = findDuplicateEmployerInterviewSlot(rows, candidate, editingId);
    if (duplicate) {
      addToast(
        'An interview slot with the same opening, campus, date, time, round, and mode already exists.',
        'warning',
      );
      return;
    }

    const selectedOpening = openingOptions.find((o) => o.id === form.opportunityId);

    const body = {
      campusId: selectedCampusId,
      campus: selectedCampus?.name || '',
      opportunityKind: effectiveKind,
      opportunityId: form.opportunityId,
      opportunityTitle: selectedOpening?.label || '',
      round: form.round,
      date: form.date,
      time: form.time,
      assigned: Number(form.assigned) || 0,
      mode: form.mode,
      panelNames: form.panelNames,
    };

    setSaving(true);
    const isEdit = Boolean(editingId);
    try {
      const res = await fetch(isEdit ? `/api/employer/interviews/${editingId}` : '/api/employer/interviews', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save interview slot');
      setRows(Array.isArray(json.rows) ? json.rows.filter((r) => interviewSlotMatchesKind(r, effectiveKind)) : []);
      cancelEdit();
      addToast(isEdit ? 'Interview slot updated.' : 'Interview slot added.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save interview slot', 'error');
    } finally {
      setSaving(false);
    }
  };

  const calItems = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        date: r.date,
        title: `${r.opportunityTitle || interviewTabLabel(r.opportunityKind)} — ${r.round}`,
        time: formatTimeDisplay(r.time),
        meta: `${r.mode} · ${r.assigned} students`,
      })),
    [rows],
  );

  const calendarCursor = useMemo(
    () => getInitialCalendarCursorFromIsoDates(rows.map((r) => r.date)),
    [rows],
  );

  const getScheduleCsv = useCallback(
    (_scope) => ({
      headers: ['Hiring_type', 'Opening', 'Campus', 'Round', 'Date', 'Time', 'Mode', 'Assigned', 'Panel_names'],
      rows: rows.map((r) => [
        interviewTabLabel(r.opportunityKind),
        r.opportunityTitle || '',
        r.campus,
        r.round,
        r.date,
        r.time,
        r.mode,
        String(r.assigned),
        r.panelNames || '',
      ]),
    }),
    [rows],
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <CalendarCheck className="text-muted-foreground size-7" strokeWidth={1.5} />
            {isAlumniScope ? 'Alumni Interview Scheduling' : 'Interview Scheduling'}
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
            {isAlumniScope
              ? 'Schedule interview windows for a specific alumni job posting and notify alumni applicants by email.'
              : 'Map interview windows to internships, projects, or placement drives, then notify applicants by email.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" render={<Link href="/dashboard/employer/hiring-assessment" />} nativeButton={false}>
            Hiring Results Dashboard →
          </Button>
          <ExportCsvSplitButton
            filenameBase="employer_interview_schedule"
            currentCount={rows.length}
            fullCount={rows.length}
            getRows={getScheduleCsv}
          />
          <div className="bg-muted flex rounded-lg p-1" role="group" aria-label="Interview plan view">
            <Button type="button" size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} aria-pressed={view === 'list'} onClick={() => setView('list')}>
              List
            </Button>
            <Button type="button" size="sm" variant={view === 'calendar' ? 'secondary' : 'ghost'} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>
              Calendar
            </Button>
          </div>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          {INTERVIEW_TIMEFRAME_DISCLAIMER} Use the email action on a slot to notify applicants for that opening.
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertDescription>
          Round results are entered under{' '}
          <Link href="/dashboard/employer/assessment-uploads" className="text-primary font-semibold hover:underline">
            Assessment uploads (CSV)
          </Link>{' '}
          or{' '}
          <Link href="/dashboard/employer/assessment-update-online" className="text-primary font-semibold hover:underline">
            Assessment Update Online
          </Link>
          ;{' '}
          <Link href="/dashboard/employer/hiring-assessment" className="text-primary font-semibold hover:underline">
            Hiring Results Dashboard
          </Link>{' '}
          is the read-only campus summary and export of that data.
        </AlertDescription>
      </Alert>

      {!campusesLoading && approvedCampuses.length === 0 && (
        <Alert>
          <AlertTitle>No approved college partnerships yet</AlertTitle>
          <AlertDescription>
            <strong>No approved college partnerships yet.</strong> Request campus access before scheduling interviews.{' '}
            <Link href="/dashboard/employer/select-campus" className="text-primary ml-1 font-semibold hover:underline">
              Manage campuses
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {interviewTabs.length > 0 ? (
        <Tabs value={effectiveKind} onValueChange={handleKindChange}>
        <TabsList aria-label="Hiring type">
          {interviewTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              type="button"
              value={tab.id}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        </Tabs>
      ) : null}

      <div className={view === 'calendar' ? 'grid gap-4' : 'grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)]'}>
        <Card className="min-w-0">
          <CardHeader className="flex-row items-start justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>{editingId ? 'Edit Slot' : 'Create Slot'}</CardTitle>
              <CardDescription>Link each interview window to a campus opening.</CardDescription>
            </div>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                Cancel edit
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
          <form onSubmit={saveSlot}>
            <FieldGroup className={!selectedCampusId ? 'opacity-60' : undefined}>
            <Field>
              <FieldLabel htmlFor="interview-campus-select">College / campus</FieldLabel>
              <AdminFilterSelect
                id="interview-campus-select"
                className="w-full"
                value={selectedCampusId}
                disabled={campusesLoading || approvedCampuses.length === 0}
                onValueChange={handleCampusChange}
                emptyMapsToAll={approvedCampuses.length === 0}
                items={
                  approvedCampuses.length === 0
                    ? [{ label: campusesLoading ? 'Loading colleges…' : 'No approved colleges', value: 'all' }]
                    : approvedCampuses.map((c) => ({
                        label: `${c.name}${c.city ? ` (${c.city})` : ''}`,
                        value: String(c.id),
                      }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interview-opening-select">
                {isAlumniScope ? 'Alumni job' : `${interviewTabLabel(effectiveKind)} opening`}
              </FieldLabel>
              <AdminFilterSelect
                id="interview-opening-select"
                className="w-full"
                value={form.opportunityId}
                disabled={!selectedCampusId || targetsLoading || openingOptions.length === 0}
                onValueChange={(opportunityId) => setForm((p) => ({ ...p, opportunityId }))}
                items={[
                  {
                    label: targetsLoading
                      ? 'Loading openings…'
                      : openingOptions.length
                        ? isAlumniScope
                          ? 'Select alumni job…'
                          : `Select ${interviewTabLabel(effectiveKind).toLowerCase()}…`
                        : isAlumniScope
                          ? 'No alumni jobs at this campus'
                          : `No ${interviewTabLabel(effectiveKind).toLowerCase()} at this campus`,
                    value: 'all',
                  },
                  ...openingOptions.map((o) => ({ label: o.label, value: o.id })),
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interview-round">Round name</FieldLabel>
              <Input
                id="interview-round"
                name="round"
                placeholder="E.g. Round 1 — DSA"
                value={form.round}
                onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interview-date">Interview date</FieldLabel>
              <ValidatedDateInput
                id="interview-date"
                fieldId={FIELD_IDS.EMPLOYER_INTERVIEW_DATE}
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interview-time">Start time</FieldLabel>
              <Input
                id="interview-time"
                name="startTime"
                type="time"
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interview-assigned">Students assigned (expected)</FieldLabel>
              <ValidatedNumberInput
                id="interview-assigned"
                fieldId={FIELD_IDS.EMPLOYER_INTERVIEW_ASSIGNED}
                value={form.assigned}
                onChange={(v) => setForm((p) => ({ ...p, assigned: v }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interview-panel">Interviewer / panel names</FieldLabel>
              <Input
                id="interview-panel"
                name="panelNames"
                placeholder="Optional panel names…"
                value={form.panelNames}
                onChange={(e) => setForm((p) => ({ ...p, panelNames: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interview-mode">Interview mode</FieldLabel>
              <AdminFilterSelect
                id="interview-mode"
                className="w-full"
                value={form.mode}
                onValueChange={(mode) => setForm((p) => ({ ...p, mode }))}
                emptyMapsToAll={false}
                items={[
                  { label: 'Virtual', value: 'Virtual' },
                  { label: 'On-Campus', value: 'On-Campus' },
                  { label: 'Hybrid', value: 'Hybrid' },
                ]}
              />
            </Field>
            <Button
              type="submit"
              disabled={!selectedCampusId || approvedCampuses.length === 0 || saving}
              className="w-fit"
              title={
                !selectedCampusId || approvedCampuses.length === 0
                  ? 'Select an approved college partnership first'
                  : 'Save interview slot'
              }
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add Interview Slot'}
            </Button>
            </FieldGroup>
          </form>
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <CardHeader className="border-border flex-row items-center justify-between border-b px-4 py-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">
                {isAlumniScope ? 'Alumni Job Interviews' : `Interview Plan — ${interviewTabLabel(effectiveKind)}`}
              </CardTitle>
              <CardDescription>{selectedCampus ? selectedCampus.name : 'No college selected'} · {rows.length} slots</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
          {view === 'calendar' ? (
            <EmployerCalendarGrid
              items={calItems}
              initialYear={calendarCursor.initialYear}
              initialMonth={calendarCursor.initialMonth}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opening &amp; Round</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Panel</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selectedCampusId || rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                      {!selectedCampusId
                        ? 'Select a college to view its interview schedule.'
                        : isAlumniScope
                          ? 'No alumni job interview slots at this college yet.'
                          : `No interview slots for ${interviewTabLabel(effectiveKind).toLowerCase()} at this college yet.`}
                    </TableCell>
                  </TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id} data-state={editingId === r.id ? 'selected' : undefined}>
                    <TableCell>
                      <div className="font-semibold">{r.opportunityTitle || 'Unlinked opening'}</div>
                      <div className="text-muted-foreground text-xs">{interviewTabLabel(r.opportunityKind)} · {r.round}</div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(r.date)}</div>
                      <div className="text-muted-foreground text-xs">{formatTimeDisplay(r.time)}</div>
                    </TableCell>
                    <TableCell><StatusBadge tone={r.mode === 'Virtual' ? 'blue' : 'indigo'}>{r.mode || '—'}</StatusBadge></TableCell>
                    <TableCell className="max-w-48 truncate">{r.panelNames || '—'}</TableCell>
                    <TableCell className="tabular-nums">{r.assigned}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                      <InterviewSlotActions
                        onEmail={() => notifyApplicants(r)}
                        onEdit={() => startEdit(r)}
                        onDelete={() => removeSlot(r)}
                        disabled={saving || notifyingId === r.id}
                        emailDisabled={!r.opportunityId}
                      />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
