'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle,
  Download,
  LayoutList,
  MapPin,
  Target,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import CompanyNameLink from '@/components/CompanyNameLink';
import EntityLogo from '@/components/EntityLogo';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import CollegeDriveStatusTabs from '@/components/college/CollegeDriveStatusTabs';
import PageLoading from '@/components/PageLoading';
import { SOCIAL_PLATFORM_ORDER } from '@/components/SocialIcons';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import { approveCollegeDriveWithClashCheck } from '@/lib/collegeDriveApprovalClient';
import { fetchCollegeDrivesList } from '@/lib/collegeDrivesApi';
import { isDriveStaffDirty, mapCollegeDriveFromApi } from '@/lib/collegeDrivesClient';
import {
  REJECT_DRIVE_CONFIRM_PHRASE,
  buildRejectDriveConfirmMessage,
} from '@/lib/collegeDriveRejectConfirm';
import {
  DEFAULT_COLLEGE_DRIVE_STATUS_TAB,
  countDrivesByStatusTab,
  filterDrivesByStatusTab,
} from '@/lib/collegeDriveStatusTabs';
import { formatDate, formatStatus } from '@/lib/utils';

const STATUS_LABEL = {
  requested: 'Awaiting approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Rejected',
};

const STATUS_TONE = {
  requested: 'amber',
  approved: 'blue',
  scheduled: 'indigo',
  in_progress: 'green',
  completed: 'gray',
  cancelled: 'red',
};

function DriveStatusBadge({ status }) {
  return (
    <StatusBadge status={status || 'requested'} tone={STATUS_TONE[status] || 'gray'} showDot className="min-w-fit">
      {STATUS_LABEL[status] || formatStatus(status) || 'Unknown'}
    </StatusBadge>
  );
}

function DriveTypeBadge({ type }) {
  const virtual = type === 'virtual';
  const Icon = virtual ? Video : Building2;
  return (
    <StatusBadge tone={virtual ? 'blue' : 'gray'} className="min-w-fit">
      <Icon data-icon="inline-start" aria-hidden />
      {virtual ? 'Virtual' : 'On-campus'}
    </StatusBadge>
  );
}

export default function CollegeDrivesContent() {
  const { addToast } = useToast();
  const [drives, setDrives] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [view, setView] = useState('list');
  const [statusTab, setStatusTab] = useState(DEFAULT_COLLEGE_DRIVE_STATUS_TAB);
  const [detailTarget, setDetailTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectPhrase, setRejectPhrase] = useState('');
  const [facebookPageShare, setFacebookPageShare] = useState(false);
  const [postingFacebookId, setPostingFacebookId] = useState(null);
  const [staffSavingId, setStaffSavingId] = useState(null);

  const loadDrives = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = academicYearQueryString(readActiveAcademicYearContext());
      const json = await fetchCollegeDrivesList(qs);
      setStaffDirectory(Array.isArray(json.staffDirectory) ? json.staffDirectory : []);
      setFacebookPageShare(Boolean(json.integrations?.facebookPageShare));
      setDrives((json.drives || []).map(mapCollegeDriveFromApi));
    } catch (error) {
      addToast(error.message || 'Failed to load drives', 'error');
      setDrives([]);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  useEffect(() => {
    const onYear = () => loadDrives();
    window.addEventListener('placementhub-academic-year', onYear);
    return () => window.removeEventListener('placementhub-academic-year', onYear);
  }, [loadDrives]);

  useEffect(() => {
    if (!detailTarget) return;
    const current = drives.find((drive) => drive.id === detailTarget.id);
    if (current && current !== detailTarget) setDetailTarget(current);
  }, [drives, detailTarget]);

  const statusCounts = useMemo(() => countDrivesByStatusTab(drives), [drives]);
  const visibleDrives = useMemo(() => filterDrivesByStatusTab(drives, statusTab), [drives, statusTab]);
  const pendingCount = drives.filter((drive) => drive.status === 'requested').length;
  const activeCount = drives.filter((drive) => ['approved', 'scheduled', 'in_progress'].includes(drive.status)).length;
  const completedCount = drives.filter((drive) => drive.status === 'completed').length;
  const calendarItems = useMemo(
    () =>
      visibleDrives.map((drive) => ({
        id: drive.id,
        date: drive.date,
        title: drive.company,
        time: '',
        meta: `${formatStatus(drive.status) || STATUS_LABEL[drive.status] || 'Unknown'} · ${drive.role}`,
      })),
    [visibleDrives]
  );
  const addOptions = useMemo(() => {
    const options = {};
    for (const drive of drives) {
      options[drive.id] = staffDirectory.filter((staff) => !drive.staffIds.includes(staff.id));
    }
    return options;
  }, [drives, staffDirectory]);
  const getDrivesCsv = useCallback(
    () => ({
      headers: ['Company', 'Role', 'Date', 'Type', 'Status', 'Venue', 'Registered', 'Selected'],
      rows: drives.map((drive) => [
        drive.company,
        drive.role,
        drive.date,
        drive.type,
        drive.status,
        drive.venue,
        String(drive.registered),
        String(drive.selected),
      ]),
    }),
    [drives]
  );

  const updateDrive = (id, update) => {
    setDrives((current) => current.map((drive) => (drive.id === id ? { ...drive, ...update } : drive)));
  };

  const approveDrive = async (id) => {
    setActionBusyId(id);
    try {
      const result = await approveCollegeDriveWithClashCheck(id);
      if (!result.ok) {
        if (result.error && result.error !== 'Approval cancelled due to calendar clash.') addToast(result.error, 'error');
        return;
      }
      updateDrive(id, { status: result.status || 'approved' });
      addToast('Drive approved.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const rejectDrive = async (id) => {
    setActionBusyId(id);
    try {
      const res = await fetch('/api/college/drives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: id, action: 'reject' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to reject drive');
      updateDrive(id, { status: json?.drive?.status || json?.status || 'cancelled' });
      setRejectTarget(null);
      setRejectPhrase('');
      addToast('Drive rejected.', 'info');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const downloadReport = async (drive) => {
    setDownloading(drive.id);
    try {
      const res = await fetch(`/api/college/drives/${drive.id}/report`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();
      const anchor = document.createElement('a');
      anchor.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      anchor.download = `Post_Drive_Report_${drive.company.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      addToast(`Report generated for ${drive.company}.`, 'info');
    } catch (error) {
      addToast(`Error: ${error.message}`, 'warning');
    } finally {
      setDownloading(null);
    }
  };

  const attachStaff = (driveId, staffId) => {
    const drive = drives.find((item) => item.id === driveId);
    if (staffId && drive && !drive.staffIds.includes(staffId)) {
      updateDrive(driveId, { staffIds: [...drive.staffIds, staffId] });
    }
  };

  const removeStaff = (driveId, staffId) => {
    const drive = drives.find((item) => item.id === driveId);
    if (drive) updateDrive(driveId, { staffIds: drive.staffIds.filter((id) => id !== staffId) });
  };

  const saveDriveStaff = async (drive) => {
    setStaffSavingId(drive.id);
    try {
      const res = await fetch(`/api/college/drives/${drive.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffIds: drive.staffIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save staff assignment.');
      const saved = (json.drive?.staffIds || drive.staffIds).map(String);
      updateDrive(drive.id, { staffIds: saved, staffIdsBaseline: [...saved] });
      addToast('Staff assignment saved.', 'success');
    } catch (error) {
      addToast(error.message || 'Network error while saving.', 'error');
    } finally {
      setStaffSavingId(null);
    }
  };

  const toggleSocialShare = async (drive, platformId) => {
    const previous = drive.socialShared || [];
    const socialShared = previous.includes(platformId)
      ? previous.filter((platform) => platform !== platformId)
      : [...previous, platformId];
    updateDrive(drive.id, { socialShared });
    try {
      const res = await fetch(`/api/college/drives/${drive.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialShared }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save.');
      addToast('Share flags saved.', 'success');
    } catch (error) {
      updateDrive(drive.id, { socialShared: previous });
      addToast(error.message, 'error');
    }
  };

  const postToFacebook = async (drive) => {
    setPostingFacebookId(drive.id);
    try {
      const res = await fetch(`/api/college/drives/${drive.id}/facebook-post`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Facebook post failed.');
      addToast(`Posted to Facebook Page (id: ${json.postId}).`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setPostingFacebookId(null);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <Target className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
          Placement Drives
        </h1>
        <p className="text-muted-foreground m-0 text-sm">
          Review employer drive requests, coordinate staff, and track campus hiring outcomes.
        </p>
      </div>

      {!isLoading ? (
        <Alert>
          <AlertTitle>{drives.length} placement drive{drives.length === 1 ? '' : 's'}</AlertTitle>
          <AlertDescription>
            {pendingCount ? <><strong className="text-amber-600">{pendingCount}</strong> awaiting approval</> : 'None awaiting approval'}
            {' '}· <strong>{activeCount}</strong> active · <strong>{completedCount}</strong> completed
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <PageLoading message="Loading placement drives…" inline /> : null}

      {!isLoading ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Campus drive pipeline</CardTitle>
                <CardDescription>Showing {visibleDrives.length} of {drives.length}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-muted flex items-center gap-0.5 rounded-lg p-[3px]" role="group" aria-label="View mode">
                  <Button type="button" size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} aria-pressed={view === 'list'} onClick={() => setView('list')}>
                    <LayoutList data-icon="inline-start" /> List
                  </Button>
                  <Button type="button" size="sm" variant={view === 'calendar' ? 'secondary' : 'ghost'} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>
                    <CalendarDays data-icon="inline-start" /> Calendar
                  </Button>
                </div>
                <ExportCsvSplitButton filenameBase="college_placement_drives" currentCount={drives.length} fullCount={drives.length} getRows={getDrivesCsv} />
              </div>
            </div>
            <CollegeDriveStatusTabs activeTab={statusTab} onTabChange={setStatusTab} counts={statusCounts} />
          </CardHeader>
          <CardContent className="p-0">
            {view === 'calendar' ? (
              <div className="p-4">
                <EmployerCalendarGrid items={calendarItems} initialYear={2026} initialMonth={7} />
              </div>
            ) : drives.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <Target className="text-muted-foreground size-8" />
                <CardTitle className="text-base">No placement drives yet</CardTitle>
                <CardDescription>Employer drive requests will appear here for campus review.</CardDescription>
              </div>
            ) : (
              <Table className="college-drives-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employer &amp; role</TableHead>
                    <TableHead className="min-w-[8.5rem]">Status</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Selected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDrives.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                        {statusTab === 'unapproved' ? 'No unapproved drives. New requests will appear here.' : 'No drives in this tab.'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {visibleDrives.map((drive) => {
                    const busy = actionBusyId === drive.id;
                    return (
                      <TableRow key={drive.id} id={`drive-${drive.id}`}>
                        <TableCell data-label="Employer & role" className="min-w-[13rem]">
                          <div className="flex items-center gap-3">
                            <EntityLogo name={drive.company} size="sm" shape="rounded" />
                            <div className="min-w-0">
                              <div className="truncate font-medium"><CompanyNameLink name={drive.company} website={drive.website} /></div>
                              <div className="text-muted-foreground truncate text-xs">{drive.role || 'Role not specified'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-label="Status" className="min-w-[8.5rem]"><DriveStatusBadge status={drive.status} /></TableCell>
                        <TableCell data-label="Format"><DriveTypeBadge type={drive.type} /></TableCell>
                        <TableCell data-label="Schedule" className="min-w-[10rem]">
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="inline-flex items-center gap-1"><CalendarDays className="text-muted-foreground size-3.5" /> {drive.date ? formatDate(drive.date) : 'Date pending'}</span>
                            {drive.venue ? <span className="text-muted-foreground inline-flex items-center gap-1 text-xs"><MapPin className="size-3.5" /> {drive.venue}</span> : null}
                          </div>
                        </TableCell>
                        <TableCell data-label="Registered">{drive.registered ?? 0}</TableCell>
                        <TableCell data-label="Selected">{drive.selected ?? 0}</TableCell>
                        <TableCell data-label="Actions" className="min-w-[13rem] text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {drive.status === 'requested' ? (
                              <>
                                <Button type="button" size="sm" disabled={busy} onClick={() => approveDrive(drive.id)}>
                                  <CheckCircle data-icon="inline-start" /> {busy ? 'Approving…' : 'Approve'}
                                </Button>
                                <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => { setRejectPhrase(''); setRejectTarget(drive); }}>
                                  <XCircle data-icon="inline-start" /> Reject
                                </Button>
                              </>
                            ) : null}
                            {drive.status === 'completed' ? (
                              <Button type="button" size="sm" variant="outline" disabled={downloading === drive.id} onClick={() => downloadReport(drive)}>
                                <Download data-icon="inline-start" /> {downloading === drive.id ? 'Generating…' : 'Report'}
                              </Button>
                            ) : null}
                            <Button type="button" size="sm" variant="outline" onClick={() => setDetailTarget(drive)}>Manage</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(detailTarget)} onOpenChange={(open) => { if (!open) setDetailTarget(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage {detailTarget?.company || 'placement drive'}</DialogTitle>
            <DialogDescription>Assign coordinators and record planned social channels.</DialogDescription>
          </DialogHeader>
          {detailTarget ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="m-0 text-sm font-semibold">Staff attached</h3>
                  <p className="text-muted-foreground m-0 text-xs">Coordinators responsible for this drive.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {detailTarget.staffIds.length === 0 ? <span className="text-muted-foreground text-sm">None linked yet.</span> : null}
                  {detailTarget.staffIds.map((staffId) => {
                    const staff = staffDirectory.find((item) => item.id === staffId);
                    return staff ? (
                      <StatusBadge key={staffId} tone="indigo">
                        {staff.name}
                        <button type="button" aria-label={`Remove ${staff.name}`} className="ml-1 inline-flex rounded-sm outline-none focus-visible:ring-2" onClick={() => removeStaff(detailTarget.id, staffId)}>
                          <X className="size-3" />
                        </button>
                      </StatusBadge>
                    ) : null;
                  })}
                  {staffDirectory.length ? (
                    <AdminFilterSelect
                      aria-label="Add staff coordinator"
                      className="min-w-44"
                      value=""
                      emptyMapsToAll={false}
                      onValueChange={(staffId) => {
                        if (staffId) attachStaff(detailTarget.id, staffId);
                      }}
                      items={[
                        { label: 'Add staff…', value: '' },
                        ...(addOptions[detailTarget.id]?.map((staff) => ({
                          label: `${staff.name} — ${staff.role}`,
                          value: String(staff.id),
                        })) ?? []),
                      ]}
                    />
                  ) : <Alert><AlertDescription>Add college admin accounts under Settings to list coordinators here.</AlertDescription></Alert>}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" disabled={!isDriveStaffDirty(detailTarget) || staffSavingId === detailTarget.id || !staffDirectory.length} onClick={() => saveDriveStaff(detailTarget)}>
                    {staffSavingId === detailTarget.id ? 'Saving…' : 'Save staff'}
                  </Button>
                  <span className="text-muted-foreground text-xs">{isDriveStaffDirty(detailTarget) ? 'Unsaved changes' : detailTarget.staffIds.length ? 'Saved' : ''}</span>
                </div>
              </div>
              <div className="border-border flex flex-col gap-3 border-t pt-5">
                <div>
                  <h3 className="m-0 text-sm font-semibold">Social channels</h3>
                  <p className="text-muted-foreground m-0 text-xs">Mark where this drive is planned or shared.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_PLATFORM_ORDER.map(({ id, label, Icon }) => {
                    const shared = (detailTarget.socialShared || []).includes(id);
                    return (
                      <Button key={id} type="button" size="sm" variant={shared ? 'secondary' : 'outline'} aria-pressed={shared} onClick={() => toggleSocialShare(detailTarget, id)}>
                        <Icon data-icon="inline-start" /> {label}
                      </Button>
                    );
                  })}
                  {facebookPageShare ? (
                    <Button type="button" size="sm" variant="outline" disabled={postingFacebookId === detailTarget.id} onClick={() => postToFacebook(detailTarget)}>
                      {postingFacebookId === detailTarget.id ? 'Posting…' : 'Post to Facebook Page'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => { if (!open && actionBusyId !== rejectTarget?.id) { setRejectTarget(null); setRejectPhrase(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this placement drive?</DialogTitle>
            <DialogDescription className="whitespace-pre-line">{buildRejectDriveConfirmMessage(rejectTarget)}</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Confirmation required</AlertTitle>
            <AlertDescription>Type {REJECT_DRIVE_CONFIRM_PHRASE} exactly to reject this request.</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm-dialog-phrase" className="text-sm font-medium">Confirmation phrase</label>
            <input
              id="confirm-dialog-phrase"
              autoComplete="off"
              spellCheck={false}
              value={rejectPhrase}
              disabled={actionBusyId === rejectTarget?.id}
              placeholder={REJECT_DRIVE_CONFIRM_PHRASE}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
              onChange={(event) => setRejectPhrase(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={actionBusyId === rejectTarget?.id} onClick={() => { setRejectTarget(null); setRejectPhrase(''); }}>Keep drive</Button>
            <Button type="button" variant="destructive" disabled={rejectPhrase !== REJECT_DRIVE_CONFIRM_PHRASE || actionBusyId === rejectTarget?.id} onClick={() => rejectTarget && rejectDrive(rejectTarget.id)}>
              {actionBusyId === rejectTarget?.id ? 'Rejecting…' : 'Reject drive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
