'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Mail, Copy, Eye, Search } from 'lucide-react';

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
  if (!res.ok) throw new Error(json?.error || 'Failed to load email logs');
  return json;
};

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

function EmailLogDetailPanel({ row }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem', fontSize: '0.9rem' }}>
      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Overview
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Log ID" mono>{row.id}</DetailField>
          <DetailField label="Sent At">{formatDateTime(row.created_at)}</DetailField>
          <DetailField label="Context">{row.context || '—'}</DetailField>
          <DetailField label="Subject">{row.subject_truncated || '—'}</DetailField>
          <DetailField label="Message ID" mono>{row.message_id || '—'}</DetailField>
          <DetailField label="ZeptoMail Request ID" mono>
            {row.zeptomail_request_id || '—'}
          </DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Recipients
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Original Recipient" mono>{row.original_to || '—'}</DetailField>
          <DetailField label="After Communication Routing" mono>{row.after_communication_to || '—'}</DetailField>
          <DetailField label="Final SMTP Recipient" mono>{row.resolved_to || '—'}</DetailField>
          <DetailField label="Recipient Login Email (audit)" mono>{row.recipient_login_email || '—'}</DetailField>
          <DetailField label="Recipient Name">{row.recipient_name || '—'}</DetailField>
          <DetailField label="Recipient Role">{row.recipient_role || '—'}</DetailField>
          <DetailField label="Recipient User ID" mono>{row.recipient_user_id || '—'}</DetailField>
          <DetailField label="Recipient Tenant ID" mono>{row.recipient_tenant_id || '—'}</DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Triggered By
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Acting User ID" mono>{row.user_id || '—'}</DetailField>
          <DetailField label="Acting User">{row.acting_user_name?.trim() || '—'}</DetailField>
          <DetailField label="Acting User Email" mono>{row.acting_user_email || '—'}</DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Delivery Status
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Status">
            <StatusBadge tone={row.status === 'sent' ? 'green' : row.status === 'failed' ? 'red' : 'gray'} showDot>
              {(row.status || 'unknown').toUpperCase()}
            </StatusBadge>
          </DetailField>
          {row.skip_reason && <DetailField label="Skip Reason">{row.skip_reason}</DetailField>}
          {row.smtp_response && <DetailField label="SMTP Response" mono>{row.smtp_response}</DetailField>}
          {row.error_message && <DetailField label="Error Message">{row.error_message}</DetailField>}
          {row.error_code && <DetailField label="Error Code" mono>{row.error_code}</DetailField>}
        </div>
      </section>
    </div>
  );
}

export default function AdminEmailLogsPage() {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    if (searchQ) p.set('search', searchQ);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [statusFilter, searchQ]);

  const { data, error, isLoading } = useSWR(`/api/admin/email-logs${queryString}`, fetcher, {
    revalidateOnFocus: false,
  });

  const logs = data?.logs || [];
  const [selected, setSelected] = useState(null);

  const runSearch = () => setSearchQ(searchInput.trim());

  const copyLogDetails = async () => {
    if (!selected) return;
    const text = JSON.stringify(selected, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      addToast('Email log details copied to clipboard', 'success');
    } catch {
      addToast('Could not copy to clipboard', 'error');
    }
  };

  if (error) {
    return <PageError message={error.message} />;
  }

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Mail aria-hidden="true" />
          Platform email delivery logs
        </h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
          Outbound email history with a three-step recipient trail: original address, after communication-email
          routing, and final SMTP destination. Recipient login email is stored even if the account is later deleted.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filter delivery logs</CardTitle><CardDescription>Search recipient, subject, context, or delivery identifier.</CardDescription></CardHeader>
        <CardContent><FieldGroup>
        <Field>
          <FieldLabel htmlFor="email-log-search">Search</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="email-log-search"
              placeholder="Login email, recipient, subject, context, Zepto ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
            />
            <Button type="button" variant="outline" size="icon" aria-label="Search email logs" onClick={runSearch}><Search /></Button>
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="email-log-status">Delivery status</FieldLabel>
          <AdminFilterSelect
            id="email-log-status"
            className="w-full"
            value={statusFilter}
            onValueChange={setStatusFilter}
            items={[
              { label: 'All statuses', value: 'all' },
              { label: 'Sent', value: 'sent' },
              { label: 'Failed', value: 'failed' },
              { label: 'Skipped', value: 'skipped' },
            ]}
          />
        </Field>
        </FieldGroup></CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4"><CardTitle>Delivery history</CardTitle><CardDescription>{logs.length} matching logs</CardDescription></CardHeader>
        <CardContent className="p-0">
        {isLoading ? (
          <p className="text-muted-foreground p-6">Loading email logs…</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground p-6">
            No email logs match your filters.
          </p>
        ) : (
            <Table>
              <TableHeader><TableRow>{['When','Context','Recipient (login)','Original → Final','Subject','Status','Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="text-sm font-semibold">{row.context || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.recipient_login_email || row.original_to || '—'}
                      {row.recipient_name ? (
                        <div className="text-muted-foreground font-sans text-xs">
                          {row.recipient_name}
                          {row.recipient_role ? ` · ${row.recipient_role}` : ''}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-56 font-mono text-sm">
                      <span title={row.original_to || ''}>{row.original_to || '—'}</span>
                      <div className="text-muted-foreground text-xs">→ {row.resolved_to || '—'}</div>
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-sm">
                      {row.subject_truncated || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={row.status === 'sent' ? 'green' : row.status === 'failed' ? 'red' : 'gray'} showDot>
                        {(row.status || 'unknown').toUpperCase()}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost" size="icon"
                        aria-label="View log details"
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
        title="Email Delivery Log Details"
        mode={selected ? 'view' : null}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <Button type="button" variant="outline" onClick={() => void copyLogDetails()}>
              <Copy data-icon="inline-start" aria-hidden="true" />
              Copy raw log
            </Button>
          ) : null
        }
      >
        {selected ? <EmailLogDetailPanel row={selected} /> : null}
      </AdminRecordModal>
    </div>
  );
}
