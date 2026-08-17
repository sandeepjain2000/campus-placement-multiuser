'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { auditReportsFetcher, AUDIT_CLIENT_ERRORS } from '@/lib/auditReportsFetcher';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const swrQuiet = { shouldRetryOnError: false, revalidateOnFocus: false };

function toYmd(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AuditReportsPage({ scopeLabel = 'Audit Reports' }) {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const isCollegeScope = session?.user?.role === 'college_admin';
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), []);
  const [from, setFrom] = useState(toYmd(thirtyDaysAgo));
  const [to, setTo] = useState(toYmd(today));
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [exporting, setExporting] = useState(false);
  const demoPurgeFilterActive = action.trim().toUpperCase() === 'DEMO_PURGE';

  const { data: collegesData } = useSWR(
    isSuperAdmin ? '/api/admin/colleges?limit=100' : null,
    auditReportsFetcher,
    swrQuiet,
  );
  const colleges = collegesData?.colleges || [];

  const setPresetDays = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    setFrom(toYmd(start));
    setTo(toYmd(end));
  };

  const tenantQuery = tenantFilter.trim() ? `&tenantId=${encodeURIComponent(tenantFilter.trim())}` : '';

  const logsUrl = useMemo(() => {
    const p = new URLSearchParams({
      from,
      to,
      limit: '300',
    });
    if (action.trim()) p.set('action', action.trim());
    if (entityType.trim()) p.set('entityType', entityType.trim());
    if (tenantFilter.trim()) p.set('tenantId', tenantFilter.trim());
    return `/api/audit/log-entries?${p.toString()}`;
  }, [from, to, action, entityType, tenantFilter]);

  const exportsUrl = useMemo(
    () => `/api/audit/reports?limit=20${tenantQuery}`,
    [tenantQuery],
  );

  const { data: logsData, isLoading: logsLoading, mutate: mutateLogs } = useSWR(logsUrl, auditReportsFetcher, swrQuiet);
  const { data: exportsData, mutate: mutateExports } = useSWR(exportsUrl, auditReportsFetcher, swrQuiet);
  const logs = logsData?.logs || [];
  const exportsList = exportsData?.exports || [];
  const {
    search: logSearch,
    setSearch: setLogSearch,
    sort: logSort,
    setSort: setLogSort,
    filtered: displayLogs,
    filteredCount: logsFilteredCount,
    totalCount: logsTotalCount,
    hasActiveFilters: logsHasActiveFilters,
    clearFilters: clearLogFilters,
  } = useDataTableQuery(logs, {
    getSearchText: (l) =>
      [l.action, l.entity_type, l.entity_id, l.actor_email, l.actor_name, l.details].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const runExport = async () => {
    if (!from || !to) {
      addToast('Select from/to dates first.', 'warning');
      return;
    }
    if (!email.trim()) {
      addToast('Email is required to send export link.', 'warning');
      return;
    }
    setExporting(true);
    try {
      const payload = { from, to, email: email.trim() };
      if (tenantFilter.trim()) payload.tenantId = tenantFilter.trim();
      const res = await fetch('/api/audit/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast('Could not start export. Please try again.', 'error');
        return;
      }
      addToast('Audit export started. Download link will be sent by email.', 'success');
      await Promise.all([mutateExports(), mutateLogs()]);
    } catch {
      addToast('Could not start export. Please try again.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex max-w-4xl flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">🧾 {scopeLabel}</h1>
          <p className="text-muted-foreground m-0 text-sm">
            Platform and college screen actions written to the audit trail — college/employer updates,
            onboarding decisions, settings, demos, and assessment changes. Filter by date and export CSV
            via secure email link.
          </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Report filters</CardTitle><CardDescription>Choose the audit range and optional event filters.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-5">
        {isSuperAdmin && (
          <Field>
            <FieldLabel htmlFor="audit-college-scope">College scope</FieldLabel>
            <AdminFilterSelect
              id="audit-college-scope"
              className="h-9 w-full"
              value={tenantFilter}
              onValueChange={setTenantFilter}
              items={[
                { label: 'All colleges (platform-wide)', value: 'all' },
                ...colleges.map((c) => ({ label: c.name, value: String(c.id) })),
              ]}
            />
          </Field>
        )}
        <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field>
            <FieldLabel>From date</FieldLabel>
            <ValidatedDateInput
              fieldId={FIELD_IDS.DATE_RANGE_FROM}
              context={{ dateTo: to, maxSpanYears: 10 }}
              value={from}
              onChange={setFrom}
              aria-label="From date"
            />
          </Field>
          <Field>
            <FieldLabel>To date</FieldLabel>
            <ValidatedDateInput
              fieldId={FIELD_IDS.DATE_RANGE_TO}
              context={{ dateFrom: from, maxSpanYears: 10 }}
              value={to}
              onChange={setTo}
              aria-label="To date"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="audit-action">Action (optional)</FieldLabel>
            <Input id="audit-action" placeholder="e.g. UPDATE_COLLEGE" value={action} onChange={(e) => setAction(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="audit-entity-type">Entity type (optional)</FieldLabel>
            <Input id="audit-entity-type" placeholder="e.g. tenants" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPresetDays(7)}>Last 7 days</Button>
          <Button variant="ghost" size="sm" onClick={() => setPresetDays(30)}>Last 30 days</Button>
          <Button variant="ghost" size="sm" onClick={() => setPresetDays(90)}>Last 90 days</Button>
          <Button variant="ghost" size="sm" onClick={() => setAction('DEMO_PURGE')}>Demo purges</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="audit-export-email">Email for export link</FieldLabel>
            <Input id="audit-export-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex items-end justify-end gap-2">
            <Button variant="outline" onClick={() => mutateLogs()}>
              Refresh logs
            </Button>
            <Button onClick={runExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export CSV & email link'}
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Recent export jobs</CardTitle>
          <Button variant="outline" size="sm" onClick={() => mutateExports()}>
            Refresh exports
          </Button>
        </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                {isSuperAdmin && !tenantFilter ? <TableHead>College</TableHead> : null}
                <TableHead>Date range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>S3 key</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportsList.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.created_at ? formatDate(r.created_at) : '—'}</TableCell>
                  {isSuperAdmin && !tenantFilter ? (
                    <TableCell>{r.tenant_name || (r.tenant_id ? 'College' : 'Platform')}</TableCell>
                  ) : null}
                  <TableCell>{r.from_date} → {r.to_date}</TableCell>
                  <TableCell><StatusBadge tone={r.status === 'completed' ? 'green' : r.status === 'failed' ? 'red' : 'amber'}>{r.status || '—'}</StatusBadge></TableCell>
                  <TableCell>{r.emailed_to || '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-96 break-words text-sm">
                    {r.status === 'failed' ? 'Export failed' : r.s3_key ? 'Stored' : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {exportsList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin && !tenantFilter ? 6 : 5} className="text-muted-foreground py-8 text-center">
                    No export jobs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(logsData?.unavailable ||
        exportsData?.unavailable ||
        logsData?.error ||
        exportsData?.error) && (
        <Alert>
          <AlertDescription>
            {(() => {
              const raw = logsData?.error || exportsData?.error || '';
              const code = logsData?.errorCode || exportsData?.errorCode;
              // Never surface raw HTTP status codes from older clients/bundles.
              let message = raw;
              if (!raw || /\(\d{3}\)/.test(raw) || /Could not load audit data/i.test(raw)) {
                message = AUDIT_CLIENT_ERRORS.LOAD_FAILED;
                const refMatch = String(raw).match(/\[Ref:\s*[A-Z0-9]+\]/i);
                if (refMatch) message = `${message} ${refMatch[0]}`;
              }
              return (
                <>
                  {message}
                  {code ? (
                    <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.8rem', opacity: 0.9 }}>
                      Code: {code}
                    </span>
                  ) : null}
                </>
              );
            })()}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Audit log entries</CardTitle></CardHeader>
        <CardContent>
        {logsLoading ? (
          <div className="skeleton skeleton-card" style={{ height: 180 }} />
        ) : (
          <>
            {logsTotalCount > 0 ? (
              <DataTableToolbar
                search={logSearch}
                onSearchChange={setLogSearch}
                searchPlaceholder="Search action, entity, or user…"
                sort={logSort}
                onSortChange={setLogSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={logsFilteredCount}
                totalCount={logsTotalCount}
                hasActiveFilters={logsHasActiveFilters}
                onClear={clearLogFilters}
                style={{ marginBottom: '1rem' }}
              />
            ) : null}
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  {isSuperAdmin && !tenantFilter ? <TableHead>College</TableHead> : null}
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLogs.length === 0 && logsTotalCount > 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin && !tenantFilter ? 6 : 5} className="text-muted-foreground text-center">
                      No log entries match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
                {displayLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</TableCell>
                    {isSuperAdmin && !tenantFilter ? (
                      <TableCell className="text-sm">{l.tenant_name || '—'}</TableCell>
                    ) : null}
                    <TableCell><StatusBadge>{l.action || '—'}</StatusBadge></TableCell>
                    <TableCell>
                      <div>{l.entity_type || '—'}{l.new_values?.label ? ` — ${l.new_values.label}` : ''}</div>
                      {l.details ? <div className="text-muted-foreground text-xs">{l.details}</div> : null}
                      {l.entity_id ? <div className="text-muted-foreground text-xs">{String(l.entity_id).slice(0, 8)}…</div> : null}
                    </TableCell>
                    <TableCell>{l.actor_email || l.actor_name || (l.user_id ? `${String(l.user_id).slice(0, 8)}…` : '—')}</TableCell>
                    <TableCell>{l.ip_address || '—'}</TableCell>
                  </TableRow>
                ))}
                {logsTotalCount === 0 && (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin && !tenantFilter ? 6 : 5} className="text-muted-foreground py-8 text-center">
                      {demoPurgeFilterActive
                        ? 'No demo purges logged for this college yet. Run a purge from Data Entry while logged in, then refresh.'
                        : isCollegeScope
                          ? 'No audit entries for your college in this date range. Try Last 90 days or clear filters.'
                          : 'No logs found for selected filters.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
