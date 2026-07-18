'use client';
import { useEffect, useState } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import StudentSelectionOfferPanel from '@/components/student/StudentSelectionOfferPanel';
import { ClipboardList, Mail, X } from 'lucide-react';
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

  if (error) return <PageError error={error} />;

  if (isJobApplications && (status === 'loading' || !isAlumni)) {
    return <PageLoading message="Loading…" />;
  }

  const meta = TYPE_META[type] || TYPE_META.drives;
  const pageTitle = meta.title;
  const browseHref = meta.browseHref;
  const browseText = meta.browseText;
  const emptyMessage = meta.emptyMessage;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={28} /> My {type === 'hackathons' ? 'Hackathons' : `${pageTitle} Applications`}
          </h1>
          <p>Track the status of your {type === 'hackathons' ? 'hackathon' : type} applications</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <a href={browseHref} className="btn btn-secondary">
            {browseText}
          </a>
          {isJobApplications && tabTotalCount > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={emailFilteredJobs}
                title="Compose email for jobs in the current view"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Mail size={15} aria-hidden />
                Email view ({displayApplications.length})
              </button>
              {displayApplications.length !== typeApplications.length ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={emailAllJobs}
                  title="Compose email for all your job applications"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Mail size={15} aria-hidden />
                  Email all ({typeApplications.length})
                </button>
              ) : null}
            </>
          ) : null}
          <ExportCsvSplitButton
            filenameBase={`${type}_applications`}
            currentCount={displayApplications.length}
            fullCount={typeApplications.length}
            getRows={buildCsvRows}
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs">
        {[
          { key: '', label: 'All', count: statusCounts.all },
          { key: 'applied', label: 'Applied', count: statusCounts.applied },
          { key: 'shortlisted', label: 'Shortlisted', count: statusCounts.shortlisted },
          { key: 'selected', label: 'Selected', count: statusCounts.selected },
          { key: 'rejected', label: 'Rejected', count: statusCounts.rejected },
          { key: 'withdrawn', label: 'Withdrawn', count: statusCounts.withdrawn },
        ].map(({ key, label, count }) => (
          <button
            key={key || 'all'}
            className={`tab ${statusTab === key ? 'active' : ''}`}
            onClick={() => setStatusTab(key)}
          >
            {formatFilterBadgeLabelParen(label, count)}
          </button>
        ))}
      </div>

      {/* Tabular Applications */}
      <div style={{ marginTop: '1.5rem' }}>
        {isLoading && <PageLoading message="Loading applications…" inline />}

        {!isLoading && tabTotalCount > 0 && (
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
        )}

        {isJobApplications && !isLoading && tabTotalCount > 0 ? (
          <TableBulkActionBar
            count={selection.count}
            onEmail={emailSelectedJobs}
            onClear={selection.clear}
            emailLabel="Email selected jobs"
          />
        ) : null}

        {!isLoading && tabTotalCount > 0 && (
          <div className="card card-table-shell">
            <div className="table-container">
            <table className={`data-table data-table-mobile-cards${isJobApplications ? ' student-opportunities-table' : ''}`}>
              <thead>
                <tr>
                  {isJobApplications ? (
                    <th className="student-opportunities-col-select" style={{ paddingLeft: '0.75rem' }}>
                      <input
                        type="checkbox"
                        aria-label="Select all job applications on this page"
                        checked={pageAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = pageSomeSelected;
                        }}
                        onChange={() => selection.toggleAll(displayApplications)}
                      />
                    </th>
                  ) : null}
                  <th style={{ paddingLeft: isJobApplications ? '0.5rem' : '1rem' }}>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Applied On</th>
                  {type === 'jobs' && <th>Drive Date</th>}
                  <th
                    className={isJobApplications ? 'student-opportunities-col-actions' : undefined}
                    style={{ textAlign: isJobApplications ? 'right' : 'center', paddingRight: isJobApplications ? '1rem' : undefined }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayApplications.length === 0 ? (
                  <tr>
                    <td colSpan={isJobApplications ? 8 : type === 'jobs' ? 7 : 6} className="text-center text-secondary">
                      No applications match your search.
                    </td>
                  </tr>
                ) : null}
                {displayApplications.map(app => (
                  <tr
                    key={app.id}
                    className={isJobApplications && selection.isSelected(app) ? 'is-row-selected' : undefined}
                  >
                    {isJobApplications ? (
                      <td className="student-opportunities-col-select" data-label="" style={{ paddingLeft: '0.75rem' }}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${app.role || 'job application'} at ${app.company || 'company'}`}
                          checked={selection.isSelected(app)}
                          onChange={() => selection.toggle(app)}
                        />
                      </td>
                    ) : null}
                    <td data-label="Company" style={{ paddingLeft: isJobApplications ? '0.5rem' : '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <EntityLogo name={app.company} size="sm" shape="rounded" />
                        <CompanyNameLink name={app.company} website={app.website} className="font-semibold" />
                      </div>
                    </td>
                    <td className="text-sm" data-label="Role">{app.role}</td>
                    <td data-label="Status">
                      <span className={`badge badge-${getStatusColor(app.status)} badge-dot`}>{formatStatus(app.status)}</span>
                    </td>
                    <td className="text-sm" data-label="Stage">{roundLabel(app)}</td>
                    <td className="text-sm" data-label="Applied">{formatDate(app.appliedAt)}</td>
                    {type === 'jobs' && <td className="text-sm" data-label="Drive date">{formatDate(app.driveDate)}</td>}
                    <td
                      className={isJobApplications ? 'student-opportunities-col-actions' : undefined}
                      data-label="Actions"
                      style={{ textAlign: isJobApplications ? 'right' : 'center', paddingRight: isJobApplications ? '1rem' : undefined }}
                    >
                      {isJobApplications ? (
                        <div
                          className="table-actions"
                          style={{
                            display: 'inline-flex',
                            gap: '0.35rem',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flexWrap: 'nowrap',
                            whiteSpace: 'nowrap',
                          }}
                        >
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
                            <button
                              type="button"
                              className="btn btn-danger btn-sm btn-icon"
                              disabled={withdrawingId === app.id}
                              onClick={() => requestWithdraw(app.id)}
                              title="Withdraw application"
                              aria-label="Withdraw application"
                            >
                              <X size={14} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div
                          className="table-actions"
                          style={{
                            display: 'inline-flex',
                            gap: '0.35rem',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flexWrap: 'nowrap',
                            whiteSpace: 'nowrap',
                          }}
                        >
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
                            />
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {!isLoading && tabTotalCount === 0 && (
          <div className="empty-state-container" style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ background: 'var(--primary-50)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <span style={{ fontSize: '1.75rem' }}>📝</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {statusTab === '' ? `No ${type} applications yet` : `No ${statusTab} applications`}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              {statusTab === '' 
                ? emptyMessage 
                : `You don't have any applications in the '${statusTab}' stage at the moment.`}
            </p>
            {statusTab === '' && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <a href={browseHref} className="btn btn-primary">
                  {browseText}
                </a>
              </div>
            )}
            {statusTab !== '' && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setStatusTab('')}
                  >
                    View All
                  </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail drawer ── */}
      {selectedApp && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="animate-fadeIn app-detail-drawer"
            style={{
              width: '480px', maxWidth: '95vw', height: '100vh',
              background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)',
              overflow: 'auto', padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <EntityLogo name={selectedApp.company} size="lg" shape="rounded" />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    <CompanyNameLink name={selectedApp.company} website={selectedApp.website} />
                  </h2>
                  <p className="text-sm text-secondary" style={{ margin: '0.125rem 0 0 0' }}>{selectedApp.role}</p>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedApp(null)} title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span className={`badge badge-${getStatusColor(selectedApp.status)} badge-dot`} style={{ fontSize: '0.85rem', padding: '0.375rem 0.75rem' }}>
                {formatStatus(selectedApp.status)}
              </span>
              {normalizeAppStatus(selectedApp.status) === 'selected' && (
                <span className="badge badge-blue" style={{ padding: '0.375rem 1rem', marginLeft: '0.5rem' }}>
                  Selection complete
                </span>
              )}
            </div>

            {normalizeAppStatus(selectedApp.status) === 'selected' && (
              <StudentSelectionOfferPanel
                application={selectedApp}
                offers={offers}
                type={type}
                onOfferUpdated={async () => {
                  await mutateOffers();
                  await mutate();
                }}
              />
            )}

            {/* Details grid */}
            <div
              className="form-grid-2"
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '1rem', padding: '1.25rem',
                background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <div className="text-xs text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Current Stage</div>
                <div className="text-sm font-semibold">{roundLabel(selectedApp)}</div>
              </div>
              <div>
                <div className="text-xs text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Applied On</div>
                <div className="text-sm font-semibold">{formatDate(selectedApp.appliedAt)}</div>
              </div>
              {type === 'jobs' && selectedApp.driveDate && (
                <div>
                  <div className="text-xs text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Drive Date</div>
                  <div className="text-sm font-semibold">{formatDate(selectedApp.driveDate)}</div>
                </div>
              )}
              {selectedApp.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="text-xs text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Notes</div>
                  <div className="text-sm">{selectedApp.notes}</div>
                </div>
              )}
            </div>

            {/* Withdraw */}
            {normalizeAppStatus(selectedApp.status) === 'applied' && (
              <button
                className="btn btn-danger"
                style={{ width: '100%' }}
                disabled={withdrawingId === selectedApp.id}
                onClick={() => requestWithdraw(selectedApp.id)}
              >
                {withdrawingId === selectedApp.id ? 'Withdrawing...' : 'Withdraw Application'}
              </button>
            )}
          </div>
        </div>
      )}

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
