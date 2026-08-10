'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import {
  Building2,
  Calendar,
  Clock,
  IndianRupee,
  MapPin,
  Search,
  Target,
  Users,
} from 'lucide-react';
import { cn, formatDate, formatStatus } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import MonthYearPicker from '@/components/MonthYearPicker';
import CompanyNameLink from '@/components/CompanyNameLink';
import StudentApplyResumeBanner from '@/components/StudentApplyResumeBanner';
import StudentBrowsePrerequisitePanel from '@/components/student/StudentBrowsePrerequisitePanel';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';
import StudentApplyEligibilityControls from '@/components/student/StudentApplyEligibilityControls';
import { useStudentApplyWithCvModal } from '@/components/student/StudentCvApply';
import PageLoading from '@/components/PageLoading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  globalApplyBlockedReason,
  resolveApplyBlockReason,
} from '@/lib/getApplyBlockReason';
import { buildStudentApplyContext, programOpportunityFromRow } from '@/lib/studentApplyContext';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import DriveVenueUnconfirmedWarning from '@/components/student/DriveVenueUnconfirmedWarning';
import { formatDriveVenueForStudent } from '@/lib/driveVenueWarning';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const SELECT_CLASS =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50';

function getTimeLeft(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diff = d - now;
  if (diff < 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return '< 1h left';
}

function driveTypeLabel(type) {
  if (type === 'virtual') return 'Virtual';
  if (type === 'off_campus') return 'Off-campus';
  if (type === 'hybrid') return 'Hybrid';
  return 'On-campus';
}

function driveTypeTone(type) {
  if (type === 'virtual') return 'blue';
  if (type === 'off_campus') return 'amber';
  if (type === 'hybrid') return 'amber';
  return 'indigo';
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Parse drive date to calendar components (local noon anchor for date-only strings). */
function parseDriveYmd(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const y = +iso[1];
    const mo = +iso[2];
    const d = +iso[3];
    return { y, mo, d, monthKey: `${y}-${String(mo).padStart(2, '0')}` };
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const x = new Date(t);
  const y = x.getFullYear();
  const mo = x.getMonth() + 1;
  const d = x.getDate();
  return { y, mo, d, monthKey: `${y}-${String(mo).padStart(2, '0')}` };
}

function startOfDayFromDriveRaw(raw) {
  const ymd = parseDriveYmd(raw);
  if (!ymd) return null;
  return startOfDay(new Date(ymd.y, ymd.mo - 1, ymd.d, 12, 0, 0, 0));
}

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch data');
  }
  return res.json();
};

export default function StudentDrivesPage() {
  const { addToast } = useToast();
  const { data: drivesData, error: drivesError, isLoading: drivesLoading } = useSWR('/api/student/drives', fetcher);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [locationPref, setLocationPref] = useState('');
  const applyingDriveRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const drives = useMemo(() => {
    return Array.isArray(drivesData?.drives) ? drivesData.drives : [];
  }, [drivesData]);

  const canApply = drivesData?.canApply !== false;
  const placementLocked = drivesData?.placementLocked === true;
  const applyBlockedReason = drivesData?.applyBlockedReason || '';
  const globalBlockedReason = globalApplyBlockedReason(canApply, applyBlockedReason);
  const canBrowseListings = drivesData?.canBrowseListings !== false;
  const browseGateProps = {
    canBrowseListings,
    browseGateTitle: drivesData?.browseGateTitle,
    browseGateMessage: drivesData?.browseGateMessage,
    profileComplete: drivesData?.profileComplete !== false,
    hasResume: drivesData?.hasResume !== false,
    profileMissingLabels: drivesData?.profileMissingLabels || [],
  };
  const currentStudent = buildStudentApplyContext(drivesData);
  const driveOpenStatuses = ['approved', 'scheduled'];
  const driveApplyOptions = {
    openStatuses: driveOpenStatuses,
    requireCvVerification: Boolean(currentStudent.cvVerificationRequired),
  };

  function driveOpportunity(drive) {
    return programOpportunityFromRow(drive);
  }

  const { openApplyModal, applyModal } = useStudentApplyWithCvModal({
    onApply: async (cvId, metadata) => {
      const drive = metadata?.drive;
      if (!drive) return;
      const body = { drive_id: drive.id, location_preference: locationPref || '' };
      if (cvId) body.cvId = cvId;
      const res = await fetch('/api/student/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success) {
        await swrMutate('/api/student/drives');
        await swrMutate('/api/student/applications');
        addToast(`Applied to ${drive.company}. Good luck!`, 'info');
        applyingDriveRef.current = null;
        setLocationPref('');
      } else {
        addToast(data.error || 'Could not record application. Try again.', 'warning');
        throw new Error(data.error || 'apply failed');
      }
    },
    onError: (msg) => addToast(msg, 'warning'),
    renderExtras: (metadata, { submitting = false } = {}) => {
      const drive = metadata?.drive;
      if (!drive) return null;
      return (
        <>
          <PostingEligibilitySection
            opportunity={driveOpportunity(drive)}
            student={currentStudent}
            audience="student"
            openStatuses={driveOpenStatuses}
          />
          <Field>
            <FieldLabel htmlFor="drive-apply-location-pref">Preferred location (optional)</FieldLabel>
            <Input
              id="drive-apply-location-pref"
              type="text"
              placeholder="E.g. Bangalore, Remote, Any"
              value={locationPref}
              onChange={(e) => setLocationPref(e.target.value)}
              disabled={submitting}
            />
          </Field>
        </>
      );
    },
  });

  const monthBounds = useMemo(() => {
    const y = new Date().getFullYear();
    return { minYear: y - 1, maxYear: y + 2 };
  }, []);

  const filteredDrives = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const monthActive = datePreset !== 'range' && Boolean(monthFilter);
    return drives.filter((d) => {
      if (search && !d.company.toLowerCase().includes(search.toLowerCase()) && !d.role.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType && d.type !== filterType) return false;
      if (filterStatus && d.status !== filterStatus) return false;

      const driveDay = startOfDayFromDriveRaw(d.date);
      if (!driveDay) return false;

      if (monthActive) {
        const ymd = parseDriveYmd(d.date);
        if (!ymd || ymd.monthKey !== monthFilter) return false;
      }

      if (datePreset === 'past' && driveDay >= todayStart) return false;
      if (datePreset === 'future' && driveDay < todayStart) return false;

      if (datePreset === 'range') {
        if (rangeFrom) {
          const from = startOfDay(new Date(rangeFrom + 'T12:00:00'));
          if (driveDay < from) return false;
        }
        if (rangeTo) {
          const to = startOfDay(new Date(rangeTo + 'T12:00:00'));
          if (driveDay > to) return false;
        }
      }

      return true;
    });
  }, [drives, search, filterType, filterStatus, datePreset, monthFilter, rangeFrom, rangeTo]);

  const openApplyModalForDrive = (drive) => {
    if (drive.applied) return;
    const blockReason = resolveApplyBlockReason(driveOpportunity(drive), currentStudent, {
      ...driveApplyOptions,
      globalBlockedReason,
    });
    if (blockReason) return;
    applyingDriveRef.current = drive;
    setLocationPref('');
    openApplyModal({
      title: `Apply to ${drive.company}`,
      description: `Confirm application for ${drive.role}. Choose a CV, then submit.`,
      blockReason,
      submitLabel: 'Submit application',
      metadata: { drive },
    });
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Target className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Placement Drives
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Browse on-campus, virtual, and off-campus drives — filter by date and apply when open.
          </p>
        </div>
        {!drivesLoading && !drivesError && canBrowseListings && filteredDrives.length > 0 ? (
          <StatusBadge tone="blue" className="min-w-fit px-3 py-1 text-sm">
            {filteredDrives.length} drive{filteredDrives.length !== 1 ? 's' : ''} match
          </StatusBadge>
        ) : null}
      </div>

      {drivesError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load drives</AlertTitle>
          <AlertDescription>{drivesError.message || 'Could not load drives.'}</AlertDescription>
        </Alert>
      ) : null}

      {drivesLoading ? <PageLoading message="Loading placement drives…" variant="skeleton-card" inline /> : null}

      {!drivesLoading && !drivesError ? (
        <StudentBrowsePrerequisitePanel {...browseGateProps}>
          <div className="flex flex-col gap-4">
            <StudentApplyResumeBanner
              canApply={canApply}
              placementLocked={placementLocked}
              applyBlockedReason={applyBlockedReason}
            />

            {canBrowseListings ? (
              <Card className="gap-0 py-0">
                <CardHeader className="border-border gap-1 border-b px-4 py-3">
                  <CardTitle className="text-base">Filter drives</CardTitle>
                  <CardDescription>Search by company or role, then narrow by mode, status, and date.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-4 py-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field className="min-w-[220px] flex-1 max-w-md">
                      <FieldLabel htmlFor="drive-search" className="sr-only">
                        Search company or role
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Search aria-hidden />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="drive-search"
                          placeholder="Search company or role…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </InputGroup>
                    </Field>
                    <Field className="w-auto">
                      <FieldLabel htmlFor="drive-filter-type" className="text-xs">
                        Mode
                      </FieldLabel>
                      <AdminFilterSelect
                        id="drive-filter-type"
                        className={SELECT_CLASS}
                        value={filterType}
                        onValueChange={setFilterType}
                        items={[
                          { label: 'All modes', value: 'all' },
                          { label: 'On-campus', value: 'on_campus' },
                          { label: 'Virtual', value: 'virtual' },
                          { label: 'Off-campus', value: 'off_campus' },
                          { label: 'Hybrid', value: 'hybrid' },
                        ]}
                      />
                    </Field>
                    <Field className="w-auto">
                      <FieldLabel htmlFor="drive-filter-status" className="text-xs">
                        Status
                      </FieldLabel>
                      <AdminFilterSelect
                        id="drive-filter-status"
                        className={SELECT_CLASS}
                        value={filterStatus}
                        onValueChange={setFilterStatus}
                        items={[
                          { label: 'All statuses', value: 'all' },
                          { label: 'Scheduled', value: 'scheduled' },
                          { label: 'Approved', value: 'approved' },
                        ]}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-end gap-4">
                    <Field className="min-w-40">
                      <FieldLabel htmlFor="drive-when-preset" className="text-xs">
                        When
                      </FieldLabel>
                      <AdminFilterSelect
                        id="drive-when-preset"
                        className={cn(SELECT_CLASS, 'min-w-44 w-full')}
                        value={datePreset}
                        onValueChange={(v) => {
                          setDatePreset(v);
                          if (v === 'range') setMonthFilter('');
                        }}
                        items={[
                          { label: 'Any date', value: 'all' },
                          { label: 'Upcoming only', value: 'future' },
                          { label: 'Past drives', value: 'past' },
                          { label: 'Custom range…', value: 'range' },
                        ]}
                      />
                    </Field>

                    {datePreset === 'range' ? (
                      <>
                        <Field className="w-auto">
                          <FieldLabel htmlFor="drive-range-from" className="text-xs">
                            From
                          </FieldLabel>
                          <ValidatedDateInput
                            id="drive-range-from"
                            fieldId={FIELD_IDS.DATE_RANGE_FROM}
                            context={{ dateTo: rangeTo, maxSpanYears: 5 }}
                            value={rangeFrom}
                            onChange={setRangeFrom}
                          />
                        </Field>
                        <Field className="w-auto">
                          <FieldLabel htmlFor="drive-range-to" className="text-xs">
                            To
                          </FieldLabel>
                          <ValidatedDateInput
                            id="drive-range-to"
                            fieldId={FIELD_IDS.DATE_RANGE_TO}
                            context={{ dateFrom: rangeFrom, maxSpanYears: 5 }}
                            value={rangeTo}
                            onChange={setRangeTo}
                          />
                        </Field>
                      </>
                    ) : (
                      <Field className="min-w-48 max-w-xs flex-1">
                        <FieldLabel htmlFor="drive-month-year-picker" className="text-xs">
                          Month &amp; year
                        </FieldLabel>
                        <MonthYearPicker
                          id="drive-month-year-picker"
                          value={monthFilter}
                          onChange={setMonthFilter}
                          minYear={monthBounds.minYear}
                          maxYear={monthBounds.maxYear}
                        />
                      </Field>
                    )}

                    <p className="text-muted-foreground m-0 ml-auto min-h-9 self-end text-sm whitespace-nowrap">
                      {filteredDrives.length} drives match
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {canBrowseListings && filteredDrives.length === 0 ? (
              <Card className="gap-0 py-10">
                <CardContent className="flex flex-col items-center px-6 text-center">
                  <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
                    <Target className="size-7" />
                  </div>
                  <CardTitle className="mb-1 text-lg">No drives found</CardTitle>
                  <CardDescription className="max-w-md text-sm">
                    No drives match your current filters. Try clearing search or date filters.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : null}

            {canBrowseListings && filteredDrives.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredDrives.map((drive) => {
                  const isExpired = drive.deadline ? new Date(drive.deadline) < now : false;
                  const timeLeft = getTimeLeft(drive.deadline);
                  const activeApplication = Boolean(drive.applied);
                  const st = drive.applicationStatus ? String(drive.applicationStatus).toLowerCase() : '';
                  const isWithdrawnFinal = st === 'withdrawn';
                  const isRejected = st === 'rejected';
                  const hasPriorApplication = isWithdrawnFinal || isRejected;
                  const blockReason =
                    !isExpired && !hasPriorApplication && !activeApplication
                      ? resolveApplyBlockReason(driveOpportunity(drive), currentStudent, {
                          ...driveApplyOptions,
                          globalBlockedReason,
                        })
                      : null;

                  return (
                    <Card
                      key={drive.id}
                      size="sm"
                      className={cn('gap-3', isExpired && !activeApplication && 'opacity-75')}
                    >
                      <CardHeader className="gap-2 px-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <CardTitle className="text-base">
                                <CompanyNameLink name={drive.company} website={drive.website} />
                              </CardTitle>
                              <StatusBadge status={drive.status} showDot className="min-w-fit">
                                {formatStatus(drive.status) || 'Open'}
                              </StatusBadge>
                              <StatusBadge tone={driveTypeTone(drive.type)} showDot className="min-w-fit">
                                {driveTypeLabel(drive.type)}
                              </StatusBadge>
                            </div>
                            <CardDescription className="text-foreground text-sm font-medium">{drive.role}</CardDescription>
                            <p className="text-muted-foreground m-0 mt-1 flex flex-wrap items-center gap-1 text-xs">
                              <MapPin className="size-3.5 shrink-0" aria-hidden />
                              {formatDriveVenueForStudent(drive.venue)}
                              {drive.offCampusCity ? ` · ${drive.offCampusCity}` : ''}
                            </p>
                            <DriveVenueUnconfirmedWarning
                              venue={drive.venue}
                              driveDate={drive.date}
                              className="mt-1.5"
                            />
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {activeApplication ? (
                              <StatusBadge status={drive.applicationStatus || 'applied'} showDot className="min-w-fit">
                                {formatStatus(drive.applicationStatus) || 'Applied'}
                              </StatusBadge>
                            ) : isExpired ? (
                              <Button type="button" variant="outline" size="sm" disabled aria-disabled="true">
                                Closed
                              </Button>
                            ) : hasPriorApplication ? (
                              <Button type="button" variant="outline" size="sm" disabled aria-disabled="true">
                                {isWithdrawnFinal ? 'Withdrawn (final)' : 'Rejected'}
                              </Button>
                            ) : (
                              <StudentApplyEligibilityControls
                                opportunity={driveOpportunity(drive)}
                                student={currentStudent}
                                applyLabel="Apply now"
                                blockReason={blockReason}
                                globalBlockedReason={globalBlockedReason}
                                openStatuses={driveOpenStatuses}
                                size="sm"
                                onApply={() => openApplyModalForDrive(drive)}
                              />
                            )}
                            {timeLeft ? (
                              <p
                                className={cn(
                                  'm-0 flex items-center gap-1 text-xs font-semibold',
                                  isExpired ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
                                )}
                              >
                                <Clock className="size-3.5 shrink-0" aria-hidden />
                                {isExpired ? 'Deadline passed' : `Ends in ${timeLeft}`}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex flex-col gap-3 px-4">
                        <div className="text-muted-foreground grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Date
                            </div>
                            <div className="text-foreground inline-flex items-center gap-1">
                              <Calendar className="size-3.5" aria-hidden />
                              {formatDate(drive.date)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Package
                            </div>
                            <div className="text-foreground inline-flex items-center gap-1">
                              <IndianRupee className="size-3.5" aria-hidden />
                              {drive.salary}
                            </div>
                            {drive.salaryWords ? (
                              <p className="text-muted-foreground m-0 mt-0.5 text-xs leading-snug">{drive.salaryWords}</p>
                            ) : null}
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Mode
                            </div>
                            <StatusBadge tone={driveTypeTone(drive.type)} showDot className="min-w-fit">
                              {driveTypeLabel(drive.type)}
                            </StatusBadge>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Min CGPA
                            </div>
                            <div className="text-foreground inline-flex items-center gap-1">
                              <Building2 className="size-3.5" aria-hidden />
                              {drive.cgpa}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Vacancies
                            </div>
                            <div className="text-foreground">{drive.vacancies}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Registered
                            </div>
                            <div className="text-foreground inline-flex items-center gap-1">
                              <Users className="size-3.5" aria-hidden />
                              {drive.registered} students
                            </div>
                          </div>
                        </div>

                        {drive.branch?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {drive.branch.map((b) => (
                              <StatusBadge key={b} tone="gray" className="min-w-fit">
                                {b}
                              </StatusBadge>
                            ))}
                          </div>
                        ) : null}

                        {drive.description ? (
                          <div className="border-border border-t pt-3">
                            <p className="text-muted-foreground m-0 mb-1 text-xs font-semibold tracking-wide uppercase">
                              Job description
                            </p>
                            <p className="text-muted-foreground m-0 text-sm leading-relaxed whitespace-pre-wrap">
                              {drive.description}
                            </p>
                          </div>
                        ) : null}

                        {Array.isArray(drive.skillsRequired) && drive.skillsRequired.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {drive.skillsRequired.map((skill) => (
                              <StatusBadge key={skill} tone="gray" className="min-w-fit">
                                {skill}
                              </StatusBadge>
                            ))}
                          </div>
                        ) : null}

                        {!activeApplication && !isExpired && !hasPriorApplication ? (
                          <PostingEligibilitySection
                            opportunity={driveOpportunity(drive)}
                            student={currentStudent}
                            audience="student"
                            openStatuses={driveOpenStatuses}
                          />
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : null}
          </div>
        </StudentBrowsePrerequisitePanel>
      ) : null}

      {applyModal}
    </div>
  );
}
