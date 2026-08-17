'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { Calendar, Info, LayoutGrid, List, Presentation, Send, X } from 'lucide-react';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

const SUMMARY_PREVIEW_CHARS = 48;

function truncate(s, n) {
  if (s == null || s === '') return '—';
  const t = String(s);
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

/** @param {{ summary?: string | null; requirements?: string | null; timeHint?: string | null }} item */
function hasExtraDetails(item) {
  const summary = item.summary ? String(item.summary).trim() : '';
  if (summary.length > SUMMARY_PREVIEW_CHARS) return true;
  if (item.requirements && String(item.requirements).trim()) return true;
  if (item.timeHint && String(item.timeHint).trim()) return true;
  return false;
}

/** @param {{ confirmationSentAt?: string | null; canConfirm?: boolean }} item */
function ConfirmationBadge({ item }) {
  const sent = Boolean(item.confirmationSentAt);
  if (sent) {
    return (
      <StatusBadge tone="green" showDot>
        Sent {new Date(item.confirmationSentAt).toLocaleDateString()}
      </StatusBadge>
    );
  }
  if (!item.canConfirm) {
    return (
      <StatusBadge tone="gray" showDot title="College has no contact email on file">
        Unavailable
      </StatusBadge>
    );
  }
  return <span className="text-secondary text-sm">Ready to confirm</span>;
}

export default function EmployerCampusGuestNeedsPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  /** @type {'' | 'pending' | 'sent' | 'unavailable'} */
  const [confirmationFilter, setConfirmationFilter] = useState('');
  /** @type {'' | 'guest_faculty' | 'guest_lecture'} */
  const [typeFilter, setTypeFilter] = useState('');
  /** @type {'card' | 'list'} */
  const [viewMode, setViewMode] = useState('card');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/employer/engagement-listings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setRows(Array.isArray(json.listings) ? json.listings : []);
    } catch (e) {
      setError(e.message || 'Failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** @param {typeof rows[0]} item */
  const confirmationStatus = (item) => {
    if (item.confirmationSentAt) return 'sent';
    if (!item.canConfirm) return 'unavailable';
    return 'pending';
  };

  const tabFilteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (typeFilter && item.kind !== typeFilter) return false;
      if (!confirmationFilter) return true;
      return confirmationStatus(item) === confirmationFilter;
    });
  }, [rows, confirmationFilter, typeFilter]);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: filteredRows,
    filteredCount,
    totalCount: tabTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(tabFilteredRows, {
    getSearchText: (item) =>
      [item.college?.name, item.title, item.summary, item.requirements, item.timeHint, KIND_LABEL[item.kind]]
        .filter(Boolean)
        .join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const openConfirm = async (item) => {
    setConfirmItem(item);
    setMailTo('');
    setMailSubject('');
    setMailBody('');
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/employer/engagement-listings/${item.id}/confirmation-draft`);
      const json = await res.json();
      if (res.status === 409) {
        addToast(json.error || 'Already sent', 'info');
        setConfirmItem(null);
        await load();
        return;
      }
      if (!res.ok) throw new Error(json?.error || 'Could not load draft');
      setMailTo(json.toEmail || '');
      setMailSubject(json.subject || '');
      setMailBody(json.body || '');
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
      setConfirmItem(null);
    } finally {
      setDraftLoading(false);
    }
  };

  const sendConfirmation = async () => {
    if (!confirmItem) return;
    setSending(true);
    try {
      const res = await fetch(`/api/employer/engagement-listings/${confirmItem.id}/send-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: mailSubject, body: mailBody }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Send failed');
      addToast(`Email sent to ${json.toEmail || mailTo}.`, 'success');
      setConfirmItem(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Campus guest needs</h1>
          <p>Browse guest faculty and lecture requests published by colleges. Confirm interest to email the placement office directly.</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/dashboard/employer/overview" />}>
          Overview
        </Button>
      </div>

      <Alert className="mb-4">
        <AlertTitle>Employers cannot create guest needs here.</AlertTitle>
        <AlertDescription>
        Listings are initiated and published by the college placement office under{' '}
        <strong>Guest Faculty &amp; Lectures</strong>. When a campus posts a need, it appears below — use{' '}
        <strong>Confirm</strong> to express interest by email.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive"><AlertTitle>Could not load guest needs</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      ) : loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <>
        <Card className="mb-4">
          <CardContent className="py-4">
          <FieldGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto] lg:items-end">
            <Field>
              <FieldLabel htmlFor="guest-needs-confirmation-filter">Confirmation</FieldLabel>
              <AdminFilterSelect
                id="guest-needs-confirmation-filter"
                className="h-9 w-full"
                value={confirmationFilter}
                onValueChange={setConfirmationFilter}
                items={[
                  { label: 'All', value: 'all' },
                  { label: 'Ready to confirm', value: 'pending' },
                  { label: 'Sent', value: 'sent' },
                  { label: 'Unavailable', value: 'unavailable' },
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="guest-needs-type-filter">Type</FieldLabel>
              <AdminFilterSelect
                id="guest-needs-type-filter"
                className="h-9 w-full"
                value={typeFilter}
                onValueChange={setTypeFilter}
                items={[
                  { label: 'All types', value: 'all' },
                  { label: KIND_LABEL.guest_lecture, value: 'guest_lecture' },
                  { label: KIND_LABEL.guest_faculty, value: 'guest_faculty' },
                ]}
              />
            </Field>
            <span className="text-muted-foreground pb-2 text-xs lg:text-right">
              Showing {filteredCount} of {rows.length}
            </span>
          </FieldGroup>
        </CardContent></Card>
        {rows.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-start',
              marginBottom: '1rem',
            }}
          >
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search college, title, or summary…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={tabTotalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            </div>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                padding: '3px',
                gap: '2px',
                border: '1px solid var(--border-default)',
                flexShrink: 0,
              }}
            >
              {[
                { mode: 'card', icon: LayoutGrid, label: 'Card view' },
                { mode: 'list', icon: List, label: 'List view' },
              ].map(({ mode, icon: Icon, label }) => (
                <Button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  variant={viewMode === mode ? 'secondary' : 'ghost'}
                  size="sm"
                >
                  <Icon size={15} aria-hidden />
                  {mode === 'card' ? 'Cards' : 'List'}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {viewMode === 'card' ? (
          <>
            {rows.length === 0 ? (
              <Card><CardContent className="py-10 text-center">
                <Presentation size={40} className="text-tertiary" style={{ margin: '0 auto 1rem', opacity: 0.45 }} />
                <p className="text-secondary" style={{ margin: 0 }}>
                  No published campus needs right now. Guest needs are created by the college — not by employers.
                </p>
              </CardContent></Card>
            ) : (
              <div
                className="responsive-card-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                  gap: '1.25rem',
                }}
              >
                {filteredRows.map((item) => {
                  const sent = Boolean(item.confirmationSentAt);
                  const canSend = item.canConfirm && !sent;
                  return (
                    <Card
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid var(--border-default)',
                        height: '100%',
                      }}
                    >
                      <CardContent className="flex h-full flex-col">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div className="font-semibold">{item.college?.name || '—'}</div>
                          <div className="text-xs text-secondary">
                            {[item.college?.city, item.college?.state].filter(Boolean).join(', ') || '—'}
                          </div>
                        </div>
                        <div
                          className="bg-primary/10 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-md"
                          aria-hidden
                        >
                          <Presentation size={18} />
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          alignItems: 'center',
                          marginBottom: '0.65rem',
                        }}
                      >
                      <StatusBadge tone="indigo" showDot>{KIND_LABEL[item.kind] || item.kind}</StatusBadge>
                        <span
                          className="text-xs text-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Calendar size={12} aria-hidden />
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          margin: '0 0 0.5rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {item.title}
                      </h3>
                      <div
                        className="text-sm text-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 4,
                          marginBottom: '0.75rem',
                          flex: 1,
                        }}
                      >
                        <span style={{ flex: 1, lineHeight: 1.45 }}>
                          {item.summary ? truncate(item.summary, SUMMARY_PREVIEW_CHARS) : '—'}
                        </span>
                        {hasExtraDetails(item) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="View summary, requirements, and timing"
                            title="View details"
                            onClick={() => setViewItem(item)}
                          >
                            <Info size={14} />
                          </Button>
                        ) : null}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          paddingTop: '0.85rem',
                          borderTop: '1px solid var(--border-default)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <ConfirmationBadge item={item} />
                        <StandardTableIconAction
                          action="confirm"
                          variant="primary"
                          disabled={!canSend}
                          onClick={() => void openConfirm(item)}
                          tooltip={
                            sent
                              ? 'Already confirmed'
                              : !item.canConfirm
                                ? 'College contact email missing'
                                : 'Send confirmation email'
                          }
                        />
                      </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredRows.length === 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '3rem 1.5rem',
                      textAlign: 'center',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px dashed var(--border-default)',
                    }}
                  >
                    <p className="text-secondary" style={{ margin: 0 }}>
                      No listings match your search or filters.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}

        {viewMode === 'list' ? (
          <Card className="gap-0 overflow-hidden py-0">
            <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>College</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-40">Summary</TableHead>
                  <TableHead>Confirmation</TableHead>
                  <TableHead className="w-px">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 && tabTotalCount > 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                      No listings match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filteredRows.map((item) => {
                  const sent = Boolean(item.confirmationSentAt);
                  const canSend = item.canConfirm && !sent;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-semibold">{item.college?.name || '—'}</div>
                        <div className="text-muted-foreground text-xs">
                          {[item.college?.city, item.college?.state].filter(Boolean).join(', ') || ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="indigo" showDot>{KIND_LABEL[item.kind] || item.kind}</StatusBadge>
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="text-muted-foreground w-40 max-w-40">
                        <div className="flex min-w-0 items-center gap-1">
                          <span
                            title={item.summary || undefined}
                            className="min-w-0 flex-1 truncate"
                          >
                            {item.summary ? truncate(item.summary, SUMMARY_PREVIEW_CHARS) : '—'}
                          </span>
                          {hasExtraDetails(item) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="View summary, requirements, and timing"
                              title="View details"
                              onClick={() => setViewItem(item)}
                            >
                              <Info size={14} />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ConfirmationBadge item={item} />
                      </TableCell>
                      <TableCell>
                        <StandardTableIconAction
                          action="confirm"
                          variant="primary"
                          disabled={!canSend}
                          onClick={() => void openConfirm(item)}
                          tooltip={
                            sent
                              ? 'Already confirmed'
                              : !item.canConfirm
                                ? 'College contact email missing'
                                : 'Send confirmation email'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                      No published campus needs right now.
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.length > 0 && filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                      No listings match your filters. Try &quot;All&quot; or a different status.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        ) : null}
        </>
      )}

      <Dialog open={Boolean(viewItem)} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="sm:max-w-xl">
          {viewItem ? <>
            <DialogHeader>
                <DialogDescription>
                  {viewItem.college?.name}
                  {viewItem.college?.city ? ` · ${viewItem.college.city}` : ''}
                </DialogDescription>
                <DialogTitle>
                  {viewItem.title}
                </DialogTitle>
                <StatusBadge tone="indigo" showDot>{KIND_LABEL[viewItem.kind] || viewItem.kind}</StatusBadge>
            </DialogHeader>
            {viewItem.summary ? (
              <p style={{ marginTop: '1rem' }}>{viewItem.summary}</p>
            ) : null}
            {viewItem.requirements ? (
              <div style={{ marginTop: '0.75rem' }}>
                <strong className="text-sm">Requirements</strong>
                <p className="text-sm" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                  {viewItem.requirements}
                </p>
              </div>
            ) : null}
            {viewItem.timeHint ? (
              <p className="text-sm text-secondary" style={{ marginTop: '0.75rem' }}>
                <strong>Timing:</strong> {viewItem.timeHint}
              </p>
            ) : null}
            <p className="text-xs text-secondary" style={{ marginTop: '1rem' }}>
              Posted {viewItem.createdAt ? new Date(viewItem.createdAt).toLocaleString() : '—'}
            </p>
          </> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmItem)} onOpenChange={(open) => !open && !sending && setConfirmItem(null)}>
        <DialogContent className="sm:max-w-2xl">
          {confirmItem ? <>
            <DialogHeader>
                <DialogTitle>
                  Send confirmation email
                </DialogTitle>
                <DialogDescription>
                  {confirmItem.college?.name} — {confirmItem.title}
                </DialogDescription>
            </DialogHeader>

            {draftLoading ? (
              <p className="text-secondary" style={{ marginTop: '1rem' }}>
                Loading template…
              </p>
            ) : (
              <>
                <p className="text-sm" style={{ marginTop: '1rem' }}>
                  <strong>To:</strong>{' '}
                  <code style={{ fontSize: '0.85rem' }}>{mailTo}</code>
                </p>
                <Field>
                  <FieldLabel>Subject</FieldLabel>
                  <Input
                    value={mailSubject}
                    onChange={(e) => setMailSubject(e.target.value)}
                    disabled={sending}
                  />
                </Field>
                <Field>
                  <FieldLabel>Message</FieldLabel>
                  <Textarea
                    rows={14}
                    value={mailBody}
                    onChange={(e) => setMailBody(e.target.value)}
                    disabled={sending}
                    style={{ fontSize: '0.9rem' }}
                  />
                </Field>
                <p className="text-xs text-secondary" style={{ marginBottom: '0.75rem' }}>
                  Subject and body use your employer template (Communication templates) or the platform default. Edit
                  before sending.
                </p>
                <DialogFooter>
                  <Button type="button" disabled={sending} onClick={() => void sendConfirmation()}>
                    {sending ? 'Sending…' : 'Send email'}
                  </Button>
                  <Button type="button" variant="outline" disabled={sending} onClick={() => setConfirmItem(null)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </>
            )}
          </> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
