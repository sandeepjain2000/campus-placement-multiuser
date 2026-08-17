'use client';
import { useEffect, useState } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatDate, formatStatus } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import StudentSelectionOfferPanel from '@/components/student/StudentSelectionOfferPanel';
import { ClipboardList, Mail } from 'lucide-react';
import { notFound } from 'next/navigation';
import { use, useMemo } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMPANY_SORT_OPTIONS, applicationSearchText } from '@/lib/tableQueryPresets';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  WITHDRAWAL_CONFIRM_BODY,
  WITHDRAWAL_CONFIRM_TITLE,
} from '@/lib/applicationWithdrawal';
import { ALUMNI_BROWSE_JOBS_PATH } from '@/lib/alumniRoutes';
import { isAlumniStudent } from '@/lib/studentAlumni';
import { useTableRowSelection, usePruneRowSelection } from '@/hooks/useTableRowSelection';
import TableBulkActionBar from '@/components/table/TableBulkActionBar';
import OpportunityEmailComposeModal from '@/components/student/OpportunityEmailComposeModal';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { downloadStudentOpportunityCsv } from '@/lib/studentOpportunityCsvExport';
import {
  applicationStatusCounts,
  filterApplicationsByStatusTab,
  normalizeAppStatus,
  studentApplicationStageLabel,
} from '@/lib/studentApplicationListTabs';
import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to load applications');
  }
  return res.json();
};

function roundLabel(item) {
  return studentApplicationStageLabel(item);
}

function DetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/** Map application row to opportunity shape for email / CSV actions. */
function appToOpportunityRow(app) {
  return {
    id: app.jobId,
    title: app.role || app.title,
    companyName: app.company || app.companyName,
    website: app.website || null,
    hasApplied: true,
    applicationStatus: app.status,
  };
}

const VALID_TYPES = ['jobs', 'internships', 'projects', 'mentorship', 'hackathons', 'drives'];

const TYPE_META = {
  drives: {
    title: 'Drive',
    browseHref: '/dashboard/student/drives',
    browseText: 'Browse Drives',
    emptyMessage:
      "You haven't applied to any placement drives yet. Start exploring active drives and apply to kickstart your career!",
  },
  jobs: {
    title: 'Alumni Job',
    browseHref: ALUMNI_BROWSE_JOBS_PATH,
    browseText: 'Browse Alumni Jobs',
    emptyMessage: "You haven't applied to any alumni jobs yet. Browse published alumni jobs for your campus network and apply.",
  },
  internships: {
    title: 'Internship',
    browseHref: '/dashboard/student/internships',
    browseText: 'Browse Internships',
    emptyMessage: "You haven't applied to any internships yet. Start exploring available internships and apply!",
  },
  projects: {
    title: 'Project',
    browseHref: '/dashboard/student/projects',
    browseText: 'Browse Projects',
    emptyMessage: "You haven't applied to any short projects yet. Browse projects for your campus and apply.",
  },
  hackathons: {
    title: 'Hackathon',
    browseHref: '/dashboard/student/hackathons',
    browseText: 'Browse Hackathons',
    emptyMessage: "You haven't applied to any hackathons yet. Browse hackathons for your campus and apply.",
  },
  mentorship: {
    title: 'Mentorship',
    browseHref: '/dashboard/student/internships',
    browseText: 'Browse Programs',
    emptyMessage: "You haven't applied to any mentorship programs yet.",
  },
};

const STATUS_TABS = [
  { key: '', tabValue: 'all', label: 'All' },
  { key: 'applied', tabValue: 'applied', label: 'Applied' },
  { key: 'shortlisted', tabValue: 'shortlisted', label: 'Shortlisted' },
  { key: 'selected', tabValue: 'selected', label: 'Selected' },
  { key: 'rejected', tabValue: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', tabValue: 'withdrawn', label: 'Withdrawn' },
];

export default function StudentApplicationsPage({ params }) {
  const unwrappedParams = use(params);
  const type = unwrappedParams.type;

  if (!VALID_TYPES.includes(type)) {
    notFound();
  }

  const { addToast } = useToast();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAlumni = isAlumniStudent(session?.user);
  const [statusTab, setStatusTab] = useState('');
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [withdrawConfirmId, setWithdrawConfirmId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [emailComposeRows, setEmailComposeRows] = useState(null);
  const isJobApplications = type === 'jobs';

  useEffect(() => {
    if (status === 'loading' || !isJobApplications) return;
    if (!isAlumni) {
      router.replace('/dashboard/student/applications/drives');
    }
  }, [isAlumni, isJobApplications, router, status]);

  const apiEndpoint = type === 'drives' ? '/api/student/applications' : '/api/student/program-applications';
  const blockJobFetch = isJobApplications && !isAlumni;
  const { data, error, isLoading, mutate } = useSWR(blockJobFetch ? null : apiEndpoint, fetcher);
  const {
    data: offers,
    mutate: mutateOffers,
  } = useSWR('/api/student/offers', async (url) => {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to load offers');
    return json;
  });
  const allApplications = (data?.items || []).map(item => ({
    ...item,
    company: item.company || item.companyName,
    role: item.role || item.title,
    driveDate: item.driveDate || null,
  }));

  const appTypeOf = (app) => {
    if (type === 'drives' && app.drive_id) return 'drive';

    const kind = String(app?.jobType || '').toLowerCase();
    if (kind === 'internship') return 'internship';
    if (kind === 'short_project') return 'project';
    if (kind === 'mentorship') return 'mentorship';
    if (kind === 'hackathon') return 'hackathon';
    if (kind === 'guest_faculty') return 'guest';
    return 'job';
  };

  const typeMatcher = {
    jobs: 'job',
    internships: 'internship',
    projects: 'project',
    mentorship: 'mentorship',
    hackathons: 'hackathon',
    drives: 'drive'
  }[type];

  const typeApplications = useMemo(() => {
    return allApplications.filter(a => appTypeOf(a) === typeMatcher);
  }, [allApplications, typeMatcher]);

  const tabFiltered = useMemo(
    () => filterApplicationsByStatusTab(typeApplications, statusTab),
    [typeApplications, statusTab],
  );

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayApplications,
    filteredCount,
    totalCount: tabTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(tabFiltered, {
    getSearchText: applicationSearchText,
    sortOptions: COMPANY_SORT_OPTIONS,
    defaultSort: 'company_asc',
  });

  const statusCounts = useMemo(
    () => applicationStatusCounts(typeApplications),
    [typeApplications],
  );

  const selection = useTableRowSelection({ getRowId: (app) => String(app.id) });
  usePruneRowSelection(selection, isJobApplications ? displayApplications : []);

  const userEmail = String(session?.user?.email || session?.user?.communicationEmail || '').trim();

  const emailJobs = (apps) => {
    const rows = (apps || [])
      .map(appToOpportunityRow)
      .filter((row) => row.id);
    if (!rows.length) {
      addToast('Select at least one job application to email.', 'warning');
      return;
    }
    setEmailComposeRows(rows);
  };

  const emailFilteredJobs = () => emailJobs(displayApplications);
  const emailAllJobs = () => emailJobs(typeApplications);
  const emailSelectedJobs = () => emailJobs(selection.selectedRows(displayApplications));

  const downloadJobApplication = (app) => {
    const row = appToOpportunityRow(app);
    if (!row.id) {
      addToast('Job details are unavailable for this application.', 'warning');
      return;
    }
    downloadStudentOpportunityCsv(row, { kind: 'job' });
  };

  const pageAllSelected = selection.allSelected(displayApplications);
  const pageSomeSelected = selection.someSelected(displayApplications);

  const requestWithdraw = (applicationId) => {
    setWithdrawConfirmId(applicationId);
  };

  const handleWithdraw = async (applicationId) => {
    setWithdrawingId(applicationId);
    try {
      const cancelEndpoint = type === 'drives' ? '/api/student/applications/cancel' : '/api/student/program-applications/cancel';
      const res = await fetch(cancelEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to withdraw application');
      addToast(
        'Application withdrawn permanently. You cannot apply again, and the employer will no longer see you as an applicant.',
        'success',
      );
      setSelectedApp(null);
      await mutate();
      if (type === 'drives') {
        await swrMutate('/api/student/drives');
      }
    } catch (e) {
      addToast(e.message || 'Failed to withdraw application', 'error');
    } finally {
      setWithdrawingId(null);
      setWithdrawConfirmId(null);
    }
  };

  const buildCsvRows = (scope) => {
    const dataset = scope === 'full' ? typeApplications : displayApplications;
    const headers = ['Company', 'Role', 'Status', 'Current Stage', 'Applied Date'];
    if (type === 'jobs') headers.push('Drive Date');
    const rows = dataset.map((app) => {
      const row = [
        app.company,
        app.role,
        app.status,
        roundLabel(app),
        formatDate(app.appliedAt),
      ];
      if (type === 'jobs') row.push(formatDate(app.driveDate));
      return row;
    });
    return { headers, rows };
  };

  if (isJobApplications && (status === 'loading' || !isAlumni)) {
    return <PageLoading message="Loading…" />;
  }

  const meta = TYPE_META[type] || TYPE_META.drives;
  const pageTitle = meta.title;
  const browseHref = meta.browseHref;
  const browseText = meta.browseText;
  const emptyMessage = meta.emptyMessage;
  const listTitle =
    type === 'hackathons' ? 'Hackathons' : `${pageTitle} Applications`;
  const trackLabel = type === 'hackathons' ? 'hackathon' : type;
  const tableColSpan = isJobApplications ? 8 : 6;

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <ClipboardList className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            My {listTitle}
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Track the status of your {trackLabel} applications
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-fit shrink-0"
            render={<Link href={browseHref} />}
            nativeButton={false}
          >
            {browseText}
          </Button>
          {isJobApplications && tabTotalCount > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit shrink-0"
                onClick={emailFilteredJobs}
                title="Compose email for jobs in the current view"
              >
                <Mail data-icon="inline-start" aria-hidden />
                Email view ({displayApplications.length})
              </Button>
              {displayApplications.length !== typeApplications.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit shrink-0"
                  onClick={emailAllJobs}
                  title="Compose email for all your job applications"
                >
                  <Mail data-icon="inline-start" aria-hidden />
                  Email all ({typeApplications.length})
                </Button>
              ) : null}
            </>
          ) : null}
          {tabTotalCount > 0 ? (
            <ExportCsvSplitButton
              filenameBase={`${type}_applications`}
              currentCount={displayApplications.length}
              fullCount={typeApplications.length}
              getRows={buildCsvRows}
              size="sm"
            />
          ) : null}
        </div>
      </div>

      <Tabs
        value={statusTab || 'all'}
        onValueChange={(value) => setStatusTab(value === 'all' ? '' : value)}
      >
        <TabsList className="h-auto w-fit max-w-full flex-wrap">
          {STATUS_TABS.map(({ key, tabValue, label }) => {
            const countKey = key || 'all';
            const count = statusCounts[countKey] ?? statusCounts.all ?? 0;
            return (
              <TabsTrigger key={tabValue} value={tabValue} className="text-xs sm:text-sm">
                {formatFilterBadgeLabelParen(label, count)}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {isLoading && <PageLoading message="Loading applications…" inline />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load applications</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && tabTotalCount > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">Your applications</CardTitle>
              <CardDescription>
                Showing {filteredCount} of {tabTotalCount}
              </CardDescription>
            </div>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search company, role, or status…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMPANY_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={tabTotalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
            {isJobApplications ? (
              <TableBulkActionBar
                count={selection.count}
                onEmail={emailSelectedJobs}
                onClear={selection.clear}
                emailLabel="Email selected jobs"
              />
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            <Table className="student-opportunities-table">
              <TableHeader>
                <TableRow>
                  {isJobApplications ? (
                    <TableHead className="w-10 pl-3">
                      <Checkbox
                        aria-label="Select all job applications on this page"
                        checked={pageAllSelected}
                        indeterminate={pageSomeSelected}
                        onCheckedChange={() => selection.toggleAll(displayApplications)}
                      />
                    </TableHead>
                  ) : null}
                  <TableHead className={isJobApplications ? 'pl-4' : undefined}>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="min-w-[6.5rem]">Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Applied On</TableHead>
                  {type === 'jobs' ? <TableHead>Drive Date</TableHead> : null}
                  <TableHead className={isJobApplications ? 'pr-4 text-right' : 'text-center'}>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColSpan} className="text-muted-foreground h-24 text-center">
                      No applications match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
                {displayApplications.map((app) => (
                  <TableRow
                    key={app.id}
                    data-state={isJobApplications && selection.isSelected(app) ? 'selected' : undefined}
                  >
                    {isJobApplications ? (
                      <TableCell data-label="" className="pl-3">
                        <Checkbox
                          aria-label={`Select ${app.role || 'job application'} at ${app.company || 'company'}`}
                          checked={selection.isSelected(app)}
                          onCheckedChange={() => selection.toggle(app)}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell data-label="Company" className={isJobApplications ? 'pl-4' : undefined}>
                      <div className="flex min-w-0 items-center gap-2">
                        <EntityLogo name={app.company} size="sm" shape="rounded" />
                        <span className="truncate font-medium" title={app.company || undefined}>
                          <CompanyNameLink name={app.company} website={app.website} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell data-label="Role" className="max-w-[12rem] text-sm">
                      <span className="block truncate" title={app.role || undefined}>
                        {app.role}
                      </span>
                    </TableCell>
                    <TableCell data-label="Status" className="min-w-[6.5rem]">
                      <StatusBadge status={app.status || 'applied'} showDot>
                        {formatStatus(app.status) || 'Applied'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell data-label="Stage" className="text-sm">
                      {roundLabel(app)}
                    </TableCell>
                    <TableCell data-label="Applied On" className="text-sm">
                      {formatDate(app.appliedAt)}
                    </TableCell>
                    {type === 'jobs' ? (
                      <TableCell data-label="Drive Date" className="text-sm">
                        {formatDate(app.driveDate)}
                      </TableCell>
                    ) : null}
                    <TableCell
                      data-label="Actions"
                      className={`whitespace-nowrap ${isJobApplications ? 'pr-4 text-right' : 'text-center'}`}
                    >
                      {isJobApplications ? (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <StandardTableIconAction
                            action="view"
                            showLabel={false}
                            onClick={() => setSelectedApp(app)}
                            tooltip="View application details"
                          />
                          <StandardTableIconAction
                            action="email"
                            showLabel={false}
                            onClick={() => emailJobs([app])}
                            tooltip="Email this job"
                            disabled={!app.jobId}
                          />
                          <StandardTableIconAction
                            action="download"
                            showLabel={false}
                            onClick={() => downloadJobApplication(app)}
                            tooltip="Download job details as CSV"
                            disabled={!app.jobId}
                          />
                          {normalizeAppStatus(app.status) === 'applied' ? (
                            <StandardTableIconAction
                              action="withdraw"
                              variant="danger"
                              loading={withdrawingId === app.id}
                              disabled={withdrawingId === app.id}
                              onClick={() => requestWithdraw(app.id)}
                              tooltip="Withdraw application"
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <StandardTableIconAction
                            action="view"
                            showLabel={false}
                            onClick={() => setSelectedApp(app)}
                            tooltip="View application details"
                          />
                          {normalizeAppStatus(app.status) === 'applied' ? (
                            <StandardTableIconAction
                              action="withdraw"
                              variant="danger"
                              loading={withdrawingId === app.id}
                              disabled={withdrawingId === app.id}
                              onClick={() => requestWithdraw(app.id)}
                              tooltip="Withdraw application"
                            />
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && tabTotalCount === 0 && (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full text-2xl">
              📝
            </div>
            <CardTitle className="mb-1 text-lg">
              {statusTab === '' ? `No ${type} applications yet` : `No ${statusTab} applications`}
            </CardTitle>
            <CardDescription className="max-w-md text-sm">
              {statusTab === ''
                ? emptyMessage
                : `You don't have any applications in the '${statusTab}' stage at the moment.`}
            </CardDescription>
            <div className="mt-6 flex justify-center">
              {statusTab === '' ? (
                <Button
                  size="sm"
                  render={<Link href={browseHref} />}
                  nativeButton={false}
                >
                  {browseText}
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setStatusTab('')}>
                  View All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedApp ? (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next) setSelectedApp(null);
          }}
        >
          <DialogContent className="gap-4 sm:max-w-xl" showCloseButton>
            <DialogHeader className="gap-3 pr-8">
              <div className="flex min-w-0 items-start gap-3">
                <EntityLogo name={selectedApp.company} size="lg" shape="rounded" />
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold">
                    <CompanyNameLink name={selectedApp.company} website={selectedApp.website} />
                  </DialogTitle>
                  <DialogDescription className="mt-1.5">{selectedApp.role}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedApp.status || 'applied'} showDot className="px-3 py-1.5 text-[0.85rem]">
                  {formatStatus(selectedApp.status) || 'Applied'}
                </StatusBadge>
                {normalizeAppStatus(selectedApp.status) === 'selected' ? (
                  <StatusBadge tone="blue" className="px-3 py-1.5 text-[0.85rem]">
                    Selection complete
                  </StatusBadge>
                ) : null}
              </div>

              {normalizeAppStatus(selectedApp.status) === 'selected' ? (
                <StudentSelectionOfferPanel
                  application={selectedApp}
                  offers={offers}
                  type={type}
                  onOfferUpdated={async () => {
                    await mutateOffers();
                    await mutate();
                  }}
                />
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Current Stage">{roundLabel(selectedApp)}</DetailField>
                <DetailField label="Applied On">{formatDate(selectedApp.appliedAt)}</DetailField>
                {type === 'jobs' && selectedApp.driveDate ? (
                  <DetailField label="Drive Date">{formatDate(selectedApp.driveDate)}</DetailField>
                ) : null}
                {selectedApp.notes ? (
                  <div className="col-span-2">
                    <DetailField label="Notes">{selectedApp.notes}</DetailField>
                  </div>
                ) : null}
              </div>
            </div>

            {normalizeAppStatus(selectedApp.status) === 'applied' ? (
              <DialogFooter className="sm:justify-stretch">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={withdrawingId === selectedApp.id}
                  onClick={() => requestWithdraw(selectedApp.id)}
                >
                  {withdrawingId === selectedApp.id ? 'Withdrawing…' : 'Withdraw Application'}
                </Button>
              </DialogFooter>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={Boolean(withdrawConfirmId)}
        title={WITHDRAWAL_CONFIRM_TITLE}
        message={WITHDRAWAL_CONFIRM_BODY}
        confirmLabel="Yes, withdraw permanently"
        cancelLabel="Keep my application"
        confirmTone="danger"
        loading={Boolean(withdrawingId)}
        onCancel={() => {
          if (!withdrawingId) setWithdrawConfirmId(null);
        }}
        onConfirm={() => {
          if (withdrawConfirmId) void handleWithdraw(withdrawConfirmId);
        }}
      />

      {emailComposeRows ? (
        <OpportunityEmailComposeModal
          rows={emailComposeRows}
          kind="job"
          defaultTo={userEmail}
          onClose={() => setEmailComposeRows(null)}
        />
      ) : null}
    </div>
  );
}
