'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Copy, Eye, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
}
import PageError from '@/components/PageError';
import AdminRecordModal from '@/components/admin/AdminRecordModal';
import { useToast } from '@/components/ToastProvider';
import {
  contextLabel,
  formatFullErrorLog,
  formatLogReference,
  parseLogDetails,
  postgresHintFromLog,
} from '@/lib/platformErrorLogDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load error logs');
  return json;
};

function summaryLine(row) {
  return row.user_message || row.error_message || '—';
}

function severityTone(severity) {
  return severity === 'warning' ? 'amber' : severity === 'info' || severity === 'debug' ? 'blue' : 'red';
}

function DetailField({ label, children, mono = false }) {
  return (
    <div>
      <div className="text-xs text-tertiary" style={{ textTransform: 'uppercase', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div
        className={mono ? 'font-mono text-xs' : undefined}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {children ?? '—'}
      </div>
    </div>
  );
}

function ErrorLogDetailPanel({ row }) {
  const details = parseLogDetails(row);
  const pgHint = postgresHintFromLog(row);
  const ref = formatLogReference(row.id);

  return (
    <div style={{ display: 'grid', gap: '1.25rem', fontSize: '0.9rem' }}>
      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Overview
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="System Defined Unique Code">
            <strong>{ref || '—'}</strong>
            {row.error_code ? (
              <span className="text-xs text-tertiary" style={{ display: 'block', marginTop: '0.15rem' }}>
                Catalog code: {row.error_code}
              </span>
            ) : null}
            <span className="text-xs text-tertiary" style={{ display: 'block', marginTop: '0.15rem' }}>
              Full ID: {row.id}
            </span>
          </DetailField>
          <DetailField label="When">{formatDateTime(row.created_at)}</DetailField>
          <DetailField label="Severity">
            <StatusBadge tone={severityTone(row.severity)} showDot>{row.severity || 'error'}</StatusBadge>
          </DetailField>
          <DetailField label="Functionality">
            {contextLabel(row.context)}
            <span className="text-xs text-tertiary" style={{ display: 'block' }}>{row.context}</span>
          </DetailField>
          <DetailField label="HTTP status">
            {row.status_code ?? '—'}
            {row.error_code && !String(row.error_code).startsWith('PH-') ? (
              <span className="text-xs text-tertiary" style={{ display: 'block' }}>
                Postgres / driver code: {row.error_code}
              </span>
            ) : null}
          </DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          User &amp; tenant
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="User">{row.user_name || '—'}</DetailField>
          <DetailField label="Email">{details.actorEmail || row.user_email || '—'}</DetailField>
          <DetailField label="Company">{row.company_name || '—'}</DetailField>
          <DetailField label="Campus">{row.tenant_name || '—'}</DetailField>
          <DetailField label="IP address">{row.ip_address || '—'}</DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Request
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Route" mono>
            {[details.requestMethod, details.route, details.requestQuery].filter(Boolean).join(' ') || '—'}
          </DetailField>
          <DetailField label="Source">{details.source || 'server'}</DetailField>
          {details.userAgent ? (
            <DetailField label="User agent">
              <span className="text-xs">{details.userAgent}</span>
            </DetailField>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Error
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="User-facing message">{row.user_message || '—'}</DetailField>
          <DetailField label="Technical message">{row.error_message || '—'}</DetailField>
          {details.technicalMessage && details.technicalMessage !== row.error_message ? (
            <DetailField label="Caught exception" mono>
              {details.technicalMessage}
            </DetailField>
          ) : null}
          {details.systemErrorCode ? (
            <DetailField label="Catalog code" mono>
              {details.systemErrorCode}
            </DetailField>
          ) : null}
          {pgHint ? <Alert><AlertDescription><strong>Likely cause:</strong> {pgHint}</AlertDescription></Alert> : null}
          {details.pgDetail ? (
            <DetailField label="Postgres detail" mono>
              {details.pgDetail}
            </DetailField>
          ) : null}
        </div>
      </section>

      {details.stack ? (
        <section>
          <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
            Stack trace
          </h3>
          <pre
            style={{
              margin: 0,
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              overflow: 'auto',
              maxHeight: '28vh',
              fontSize: '0.72rem',
              lineHeight: 1.45,
            }}
          >
            {details.stack}
          </pre>
        </section>
      ) : null}

      {(details.requestBody || details.clientDetails) ? (
        <section>
          <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
            Request / client payload
          </h3>
          <pre
            style={{
              margin: 0,
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              overflow: 'auto',
              maxHeight: '28vh',
              fontSize: '0.72rem',
              lineHeight: 1.45,
            }}
          >
            {JSON.stringify(
              {
                requestBody: details.requestBody ?? undefined,
                clientDetails: details.clientDetails ?? undefined,
              },
              null,
              2,
            )}
          </pre>
        </section>
      ) : null}

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Raw details (JSON)
        </h3>
        <pre
          style={{
            margin: 0,
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            overflow: 'auto',
            maxHeight: '24vh',
            fontSize: '0.72rem',
            lineHeight: 1.45,
          }}
        >
          {JSON.stringify(details, null, 2)}
        </pre>
      </section>
    </div>
  );
}

export default function AdminErrorLogsPage() {
  const { addToast } = useToast();
  const [contextFilter, setContextFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (contextFilter) p.set('context', contextFilter);
    if (severityFilter) p.set('severity', severityFilter);
    if (searchQ) p.set('q', searchQ);
    if (fromDate) p.set('from', fromDate);
    if (toDate) p.set('to', toDate);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [contextFilter, severityFilter, searchQ, fromDate, toDate]);

  const { data, error, isLoading } = useSWR(`/api/admin/error-logs${queryString}`, fetcher, {
    revalidateOnFocus: false,
  });

  const logs = data?.logs || [];
  const [selected, setSelected] = useState(null);

  const contextOptions = useMemo(() => {
    const fromApi = data?.contexts || [];
    const fromRows = [...new Set(logs.map((l) => l.context).filter(Boolean))];
    return [...new Set([...fromApi, ...fromRows])].sort();
  }, [data?.contexts, logs]);

  const runSearch = () => setSearchQ(searchInput.trim());

  const copyFullLog = async () => {
    if (!selected) return;
    const text = formatFullErrorLog(selected);
    try {
      await navigator.clipboard.writeText(text);
      addToast('Full log copied to clipboard', 'success');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        addToast('Full log copied to clipboard', 'success');
      } catch {
        addToast('Could not copy to clipboard', 'error');
      }
    }
  };

  if (error) {
    return <PageError message={error.message} />;
  }

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <AlertTriangle aria-hidden="true" />
          Platform error logs
        </h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
          Full diagnostics for failed API operations. Employers see a short message and reference code — search by reference,
          email, route, or error text. Open a row for stack traces, request payloads, and Postgres hints.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filter diagnostics</CardTitle><CardDescription>Search references and narrow results by date, severity, or functionality.</CardDescription></CardHeader>
        <CardContent><FieldGroup>
        <Field>
          <FieldLabel htmlFor="error-log-search">Search</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="error-log-search"
              placeholder="Reference, email, route, error message…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
            />
            <Button type="button" variant="outline" size="icon" aria-label="Search error logs" onClick={runSearch}><Search /></Button>
          </div>
        </Field>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field><FieldLabel htmlFor="error-from">From</FieldLabel><Input id="error-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
        <Field><FieldLabel htmlFor="error-to">To</FieldLabel><Input id="error-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
        <Field>
          <FieldLabel htmlFor="error-severity">Severity</FieldLabel>
          <AdminFilterSelect
            id="error-severity"
            className="h-9 w-full"
            value={severityFilter}
            onValueChange={setSeverityFilter}
            items={[
              { label: 'All severities', value: 'all' },
              { label: 'Error', value: 'error' },
              { label: 'Warning', value: 'warning' },
              { label: 'Info / Debug', value: 'info' },
            ]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="error-context">Functionality</FieldLabel>
          <AdminFilterSelect
            id="error-context"
            className="h-9 w-full"
            value={contextFilter}
            onValueChange={setContextFilter}
            items={[
              { label: 'All functionalities', value: 'all' },
              ...contextOptions.map((c) => ({ label: contextLabel(c), value: c })),
            ]}
          />
        </Field></div>
        </FieldGroup></CardContent>
      </Card>

      {data?.migrationRequired ? (
        <Alert>
          <AlertDescription>
            {data.error || 'Run migration 083_platform_error_logs.sql to enable error logging.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4"><CardTitle>Diagnostics</CardTitle><CardDescription>{logs.length} matching error logs</CardDescription></CardHeader>
        <CardContent className="p-0">
        {isLoading ? (
          <p className="text-muted-foreground p-6">Loading error logs…</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground p-6">
            No error logs match your filters.
          </p>
        ) : (
            <Table>
              <TableHeader><TableRow>{['When','Unique Code','Severity','Functionality','Route','User','Status','Summary','Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div>{row.reference || formatLogReference(row.id)}</div>
                      {row.error_code ? <div className="text-muted-foreground text-xs">{row.error_code}</div> : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      <StatusBadge tone={severityTone(row.severity)} showDot>
                        {(row.severity || 'error').toUpperCase()}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="min-w-36 text-sm">
                      {contextLabel(row.context)}
                    </TableCell>
                    <TableCell className="max-w-40 font-mono text-xs">
                      {row.route || parseLogDetails(row).route || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{row.user_name || '—'}</div>
                      <div className="text-muted-foreground text-xs">{row.user_email || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={severityTone(row.severity)}>
                        {row.status_code ?? '—'}
                      </StatusBadge>
                      {row.error_code && !String(row.error_code).startsWith('PH-') ? (
                        <div className="text-muted-foreground mt-1 font-mono text-xs">{row.error_code}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-64 text-sm">
                      <div className="truncate">{summaryLine(row)}</div>
                      {postgresHintFromLog(row) ? (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {postgresHintFromLog(row)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost" size="icon"
                        aria-label="View full log"
                        onClick={() => setSelected(row)}
                      >
                        <Eye />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
        </CardContent>
      </Card>

      <AdminRecordModal
        title={selected ? `Error log — ${formatLogReference(selected.id) || 'details'}` : 'Error log details'}
        mode={selected ? 'view' : null}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <Button type="button" variant="outline" onClick={() => void copyFullLog()}>
              <Copy data-icon="inline-start" aria-hidden="true" />
              Copy full log
            </Button>
          ) : null
        }
      >
        {selected ? <ErrorLogDetailPanel row={selected} /> : null}
      </AdminRecordModal>
    </div>
  );
}
