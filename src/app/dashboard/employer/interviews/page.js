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
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarCheck size={22} strokeWidth={1.75} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
            {isAlumniScope ? 'Alumni Interview Scheduling' : 'Interview Scheduling'}
          </h1>
          <p className="text-secondary" style={{ margin: 0 }}>
            {isAlumniScope
              ? 'Schedule interview windows for a specific alumni job posting and notify alumni applicants by email.'
              : 'Map interview windows to internships, projects, or placement drives, then notify applicants by email.'}
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/dashboard/employer/hiring-assessment" className="btn btn-secondary">
            Hiring Results Dashboard →
          </Link>
          <ExportCsvSplitButton
            filenameBase="employer_interview_schedule"
            currentCount={rows.length}
            fullCount={rows.length}
            getRows={getScheduleCsv}
          />
          <div className="view-toggle" role="group" aria-label="Interview plan view">
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              List
            </button>
            <button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
              Calendar
            </button>
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{ marginBottom: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)' }}
      >
        <p className="text-sm text-secondary" style={{ margin: 0 }}>
          {INTERVIEW_TIMEFRAME_DISCLAIMER} Use the email action on a slot to notify applicants for that opening.
        </p>
      </div>

      <div
        className="card"
        style={{ marginBottom: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)' }}
      >
        <p className="text-sm text-secondary" style={{ margin: 0 }}>
          Round results are entered under{' '}
          <Link href="/dashboard/employer/assessment-uploads" style={{ color: 'var(--text-link)', fontWeight: 600 }}>
            Assessment uploads (CSV)
          </Link>{' '}
          or{' '}
          <Link href="/dashboard/employer/assessment-update-online" style={{ color: 'var(--text-link)', fontWeight: 600 }}>
            Assessment Update Online
          </Link>
          ;{' '}
          <Link href="/dashboard/employer/hiring-assessment" style={{ color: 'var(--text-link)', fontWeight: 600 }}>
            Hiring Results Dashboard
          </Link>{' '}
          is the read-only campus summary and export of that data.
        </p>
      </div>

      {!campusesLoading && approvedCampuses.length === 0 && (
        <div
          className="card"
          style={{ marginBottom: '1rem', background: 'var(--warning-50)', border: '1px solid var(--warning-200)' }}
        >
          <p className="text-sm" style={{ margin: 0, color: 'var(--text-primary)' }}>
            <strong>No approved college partnerships yet.</strong> Request campus access before scheduling interviews.{' '}
            <Link
              href="/dashboard/employer/select-campus"
              className="btn btn-primary btn-sm"
              style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}
            >
              Manage campuses
            </Link>
          </p>
        </div>
      )}

      {interviewTabs.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }} role="tablist" aria-label="Hiring type">
          {interviewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={effectiveKind === tab.id}
              onClick={() => handleKindChange(tab.id)}
              className={effectiveKind === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: view === 'calendar' ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
          alignItems: 'start',
          width: '100%',
        }}
      >
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{editingId ? 'Edit Slot' : 'Create Slot'}</h3>
            {editingId ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <form
            onSubmit={saveSlot}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              opacity: selectedCampusId ? 1 : 0.55,
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-campus-select">
                College / campus
              </label>
              <select
                id="interview-campus-select"
                className="form-select"
                value={selectedCampusId}
                disabled={campusesLoading || approvedCampuses.length === 0}
                onChange={(e) => handleCampusChange(e.target.value)}
                required
              >
                {approvedCampuses.length === 0 ? (
                  <option value="">{campusesLoading ? 'Loading colleges…' : 'No approved colleges'}</option>
                ) : (
                  approvedCampuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? ` (${c.city})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-opening-select">
                {isAlumniScope ? 'Alumni job' : `${interviewTabLabel(effectiveKind)} opening`}
              </label>
              <select
                id="interview-opening-select"
                className="form-select"
                value={form.opportunityId}
                disabled={!selectedCampusId || targetsLoading || openingOptions.length === 0}
                onChange={(e) => setForm((p) => ({ ...p, opportunityId: e.target.value }))}
                required
              >
                <option value="">
                  {targetsLoading
                    ? 'Loading openings…'
                    : openingOptions.length
                      ? isAlumniScope
                        ? 'Select alumni job…'
                        : `Select ${interviewTabLabel(effectiveKind).toLowerCase()}…`
                      : isAlumniScope
                        ? 'No alumni jobs at this campus'
                        : `No ${interviewTabLabel(effectiveKind).toLowerCase()} at this campus`}
                </option>
                {openingOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-round">
                Round name
              </label>
              <input
                id="interview-round"
                className="form-input"
                placeholder="e.g. Round 1 — DSA"
                value={form.round}
                onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-date">
                Interview date
              </label>
              <ValidatedDateInput
                id="interview-date"
                fieldId={FIELD_IDS.EMPLOYER_INTERVIEW_DATE}
                className="form-input"
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-time">
                Start time
              </label>
              <input
                id="interview-time"
                className="form-input"
                type="time"
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-assigned">
                Students assigned (expected)
              </label>
              <ValidatedNumberInput
                id="interview-assigned"
                fieldId={FIELD_IDS.EMPLOYER_INTERVIEW_ASSIGNED}
                className="form-input"
                value={form.assigned}
                onChange={(v) => setForm((p) => ({ ...p, assigned: v }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-panel">
                Interviewer / panel names
              </label>
              <input
                id="interview-panel"
                className="form-input"
                placeholder="Optional"
                value={form.panelNames}
                onChange={(e) => setForm((p) => ({ ...p, panelNames: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="interview-mode">
                Interview mode
              </label>
              <select
                id="interview-mode"
                className="form-select"
                value={form.mode}
                onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}
              >
                <option>Virtual</option>
                <option>On-Campus</option>
                <option>Hybrid</option>
              </select>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!selectedCampusId || approvedCampuses.length === 0 || saving}
              style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}
              title={
                !selectedCampusId || approvedCampuses.length === 0
                  ? 'Select an approved college partnership first'
                  : 'Save interview slot'
              }
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add Interview Slot'}
            </button>
          </form>
        </div>

        <div
          className="card"
          style={{
            minWidth: 0,
            width: '100%',
            paddingBottom: rows.length === 0 && view === 'list' ? '0.75rem' : undefined,
          }}
        >
          <div
            className="card-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              paddingBottom: rows.length === 0 && view === 'list' ? '0.5rem' : undefined,
              borderBottom: '1px solid var(--border-default)',
              marginBottom: view === 'list' && rows.length === 0 ? '0.5rem' : undefined,
            }}
          >
            <h3 className="card-title" style={{ margin: 0 }}>
              {isAlumniScope ? 'Alumni job interviews' : `Interview Plan — ${interviewTabLabel(effectiveKind)}`}
            </h3>
            <span className="text-sm text-secondary">
              {selectedCampus ? selectedCampus.name : 'No college selected'} · {rows.length} slots
            </span>
          </div>
          {view === 'calendar' ? (
            <EmployerCalendarGrid
              items={calItems}
              initialYear={calendarCursor.initialYear}
              initialMonth={calendarCursor.initialMonth}
            />
          ) : (
            <div style={{ display: 'grid', gap: rows.length ? '0.6rem' : 0 }}>
              {!selectedCampusId ? (
                <p className="text-sm text-secondary" style={{ margin: 0, padding: '0.25rem 0' }}>
                  Select a college to view its interview schedule.
                </p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-secondary" style={{ margin: 0, padding: '0.25rem 0 0' }}>
                  {isAlumniScope
                    ? 'No alumni job interview slots at this college yet.'
                    : `No interview slots for ${interviewTabLabel(effectiveKind).toLowerCase()} at this college yet.`}
                </p>
              ) : (
                rows.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: `1px solid ${editingId === r.id ? 'var(--primary-400)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.7rem',
                      background: editingId === r.id ? 'var(--primary-50)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div className="font-semibold">
                        {r.opportunityTitle || 'Unlinked opening'} • {r.round}
                      </div>
                      <InterviewSlotActions
                        onEmail={() => notifyApplicants(r)}
                        onEdit={() => startEdit(r)}
                        onDelete={() => removeSlot(r)}
                        disabled={saving || notifyingId === r.id}
                        emailDisabled={!r.opportunityId}
                      />
                    </div>
                    <div className="text-xs text-tertiary" style={{ marginTop: '0.15rem' }}>
                      {interviewTabLabel(r.opportunityKind)} · {r.campus}
                    </div>
                    <div className="text-sm text-secondary">
                      {formatDate(r.date)} • {formatTimeDisplay(r.time)} • {r.mode}
                    </div>
                    {r.panelNames ? <div className="text-xs text-tertiary">{r.panelNames}</div> : null}
                    <div className="text-xs text-tertiary">{r.assigned} assigned students</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
