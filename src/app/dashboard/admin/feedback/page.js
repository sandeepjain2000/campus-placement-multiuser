'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as mutateByKey } from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FEEDBACK_STATUS_FILTER_OPTIONS, feedbackStatusFilterFn } from '@/lib/tableQueryPresets';
import { formatDate, formatFeedbackRole } from '@/lib/utils';
import PageError from '@/components/PageError';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import AdminRecordModal from '@/components/admin/AdminRecordModal';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const PAGE_SIZE = 10;
const EXPORT_PAGE_SIZE = 500;

const fetchOpts = { credentials: 'include' };

const fetcher = (url) =>
  fetch(url, fetchOpts).then((res) => {
    if (!res.ok) throw new Error('Failed to load feedback');
    return res.json();
  });

const STATUSES = ['Submitted', 'Under Review', 'Planned', 'Closed'];

export default function AdminFeedbackInboxPage() {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const listKey = `/api/feedback?page=${page}&pageSize=${PAGE_SIZE}`;
  const exportKey = `/api/feedback?page=1&pageSize=${EXPORT_PAGE_SIZE}`;

  const { data, error, isLoading, mutate } = useSWR(listKey, fetcher);
  const { data: exportData } = useSWR(exportKey, fetcher, { revalidateOnFocus: false });

  const [panelMode, setPanelMode] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [threadData, setThreadData] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayItems,
    filteredCount,
    totalCount: pageTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(items, {
    getSearchText: (row) =>
      [
        row.title,
        row.description,
        row.category,
        row.user_name,
        row.user_email,
        row.organization_name,
        row.status,
      ]
        .filter(Boolean)
        .join(' '),
    filterFn: feedbackStatusFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const statusCounts = data?.statusCounts;

  const counts = useMemo(
    () => ({
      submitted: statusCounts?.Submitted ?? 0,
      review: statusCounts?.['Under Review'] ?? 0,
      planned: statusCounts?.Planned ?? 0,
      closed: statusCounts?.Closed ?? 0,
    }),
    [statusCounts],
  );

  const refreshLists = () => {
    mutate();
    mutateByKey(exportKey);
  };

  const closePanel = () => {
    setPanelMode(null);
    setSelectedId(null);
    setPanelLoading(false);
    setPanelError('');
    setThreadData(null);
    setReplyText('');
  };

  useEffect(() => {
    closePanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset detail when list page changes
  }, [page]);

  const updateStatus = async (id, status) => {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      addToast(j.error || 'Update failed', 'warning');
      return;
    }
    refreshLists();
    if (selectedId === id && threadData?.item) {
      setThreadData((prev) =>
        prev?.item ? { ...prev, item: { ...prev.item, status } } : prev,
      );
    }
  };

  const loadThread = async (id) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, fetchOpts);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body.error || 'Could not load feedback';
        setPanelError(msg);
        addToast(msg, 'warning');
        return null;
      }
      if (body.repliesUnavailable) {
        setThreadData(body);
        addToast(
          body.error || 'Replies table is not set up on this database.',
          'warning',
        );
        return body;
      }
      setThreadData(body);
      return body;
    } catch {
      const msg = 'Network error while loading feedback';
      setPanelError(msg);
      addToast(msg, 'warning');
      return null;
    } finally {
      setPanelLoading(false);
    }
  };

  const openThread = async (id) => {
    setSelectedId(id);
    setPanelMode('view');
    setPanelError('');
    setThreadData(null);
    setReplyText('');
    setPanelLoading(true);
    await loadThread(id);
  };

  const sendReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    setReplyLoading(true);
    const message = replyText.trim();
    try {
      const res = await fetch(`/api/feedback/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(body.error || 'Reply failed', 'warning');
        return;
      }
      setReplyText('');
      addToast('Reply posted.', 'success');
      refreshLists();
      await loadThread(selectedId);
    } catch {
      addToast('Network error while posting reply', 'warning');
    } finally {
      setReplyLoading(false);
    }
  };

  const selectedTitle =
    threadData?.item?.title ||
    items.find((row) => row.id === selectedId)?.title ||
    'Feedback';

  if (error) return <PageError error={error} />;

  if (isLoading || !data) {
    return (
      <Card><CardHeader><CardTitle>Feedback inbox</CardTitle><CardDescription>Loading submissions…</CardDescription></CardHeader></Card>
    );
  }

  const buildExportRows = (rows) => {
    const headers = [
      'When',
      'Title',
      'Description',
      'Category',
      'From',
      'Organization',
      'Role',
      'Replies',
      'Latest reply',
      'Status',
    ];
    const rowsList = rows.map((row) => [
      formatDate(row.created_at),
      row.title,
      row.description || '',
      row.category,
      (row.user_name && row.user_name.trim()) || row.user_email || '—',
      row.organization_name || '—',
      formatFeedbackRole(row.user_role),
      String(row.reply_count || 0),
      row.latest_reply || '',
      row.status,
    ]);
    return { headers, rows: rowsList };
  };

  const getExportRows = (scope) => {
    if (scope === 'full') {
      const rows = exportData?.items || items;
      return buildExportRows(rows);
    }
    return buildExportRows(displayItems);
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Feedback inbox</h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">Every submission from students, employers, and college admins across the platform.</p>
        </div>
        <ExportCsvSplitButton
          filenameBase="admin_feedback"
          currentCount={displayItems.length}
          fullCount={total}
          getRows={getExportRows}
        />
      </div>

      <Card size="sm"><CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-medium">Status summary</span>
        <span className="text-sm"><strong>{counts.submitted}</strong> submitted</span>
        <span className="text-sm"><strong>{counts.review}</strong> under review</span>
        <span className="text-sm"><strong>{counts.planned}</strong> planned</span>
        <span className="text-sm"><strong>{counts.closed}</strong> closed</span>
      </CardContent></Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>All entries</CardTitle>
          <CardDescription>{total} total{total > 0 ? ` · page ${page} of ${totalPages}` : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
        {pageTotalCount > 0 ? (
          <div className="p-4"><DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, category, or submitter…"
            filter={filter}
            onFilterChange={setFilter}
            filterOptions={FEEDBACK_STATUS_FILTER_OPTIONS}
            filterLabel="Status"
            sort={sort}
            onSortChange={setSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={filteredCount}
            totalCount={pageTotalCount}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          /></div>
        ) : null}
        <Table>
          <TableHeader><TableRow>{['When','Title','Category','From','Role','Replies','Status','Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {displayItems.length === 0 && pageTotalCount > 0 ? <TableRow><TableCell colSpan={8} className="text-muted-foreground h-24 text-center">No feedback on this page matches your search or filters.</TableCell></TableRow> : null}
            {displayItems.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm">{formatDate(row.created_at)}</TableCell>
                <TableCell><div className="font-semibold">{row.title}</div><div className="text-muted-foreground mt-1 max-w-md text-sm">{row.description}</div></TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell className="text-sm"><div>{(row.user_name && row.user_name.trim()) || '—'}</div>{row.user_email ? <div className="text-muted-foreground text-xs">{row.user_email}</div> : null}<div className="text-muted-foreground mt-1 text-xs">{row.organization_name || '—'}</div></TableCell>
                <TableCell><StatusBadge tone="gray">{formatFeedbackRole(row.user_role)}</StatusBadge></TableCell>
                <TableCell>{Number(row.reply_count || 0) > 0 ? <StatusBadge tone="green">{row.reply_count} replied</StatusBadge> : <StatusBadge tone="gray">No reply</StatusBadge>}</TableCell>
                <TableCell><AdminFilterSelect className="min-w-36" value={row.status} emptyMapsToAll={false} onValueChange={(s) => updateStatus(row.id, s)} items={STATUSES.map((s) => ({ label: s, value: s }))} /></TableCell>
                <TableCell><StandardTableIconAction action="view" showLabel={false} onClick={() => openThread(row.id)} tooltip="View thread and reply" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 ? <Alert className="m-4"><AlertDescription>No feedback yet — or the platform_feedback table is not created. Run db/migrations/002_platform_feedback.sql.</AlertDescription></Alert> : null}
        </CardContent>
        {total > PAGE_SIZE ? <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><span className="text-muted-foreground text-sm">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button><span className="text-muted-foreground text-sm">Page {page} / {totalPages}</span><Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button></div></div> : null}
      </Card>

      <AdminRecordModal
        title={selectedTitle}
        mode={panelMode}
        loading={panelLoading}
        saving={replyLoading}
        error={panelError}
        onClose={closePanel}
        footer={
          threadData?.item && !threadData.repliesUnavailable ? (
            <Button
              type="button"
              onClick={sendReply}
              disabled={replyLoading || !replyText.trim()}
            >
              {replyLoading ? 'Sending…' : 'Send reply'}
            </Button>
          ) : null
        }
      >
        {threadData?.item ? (
          <>
            {threadData.repliesUnavailable ? (
              <Alert className="mb-4">
                <AlertDescription>
                  {threadData.error ||
                    'Replies are disabled until db/migrations/003_platform_feedback_replies.sql is applied.'}
                </AlertDescription>
              </Alert>
            ) : null}

            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div className="text-xs text-tertiary" style={{ marginBottom: '0.25rem' }}>
                    {formatDate(threadData.item.created_at)}
                    {threadData.item.category ? ` · ${threadData.item.category}` : ''}
                  </div>
                  <div className="text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {threadData.item.description}
                  </div>
                  {threadData.item.organization_name ? (
                    <div className="text-xs text-tertiary" style={{ marginTop: '0.5rem' }}>
                      {threadData.item.organization_name}
                      {' · '}
                      {formatFeedbackRole(threadData.item.user_role)}
                      {threadData.item.user_email ? ` · ${threadData.item.user_email}` : ''}
                    </div>
                  ) : null}
                </div>
                <AdminFilterSelect
                  className="min-w-36 shrink-0"
                  value={threadData.item.status}
                  emptyMapsToAll={false}
                  onValueChange={(s) => updateStatus(threadData.item.id, s)}
                  items={STATUSES.map((s) => ({ label: s, value: s }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <p className="text-xs font-semibold text-secondary" style={{ margin: 0, textTransform: 'uppercase' }}>
                Discussion
              </p>
              {(threadData.replies || []).map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.75rem',
                  }}
                >
                  <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {r.message}
                  </div>
                  <div className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
                    {(r.author_name && r.author_name.trim()) || r.author_email || 'Super Admin'} ·{' '}
                    {formatDate(r.created_at)}
                  </div>
                </div>
              ))}
              {(threadData.replies || []).length === 0 && !threadData.repliesUnavailable ? (
                <p className="text-sm text-secondary" style={{ margin: 0 }}>
                  No replies yet. Send the first response below.
                </p>
              ) : null}
            </div>

            {!threadData.repliesUnavailable ? (
              <Field>
                <FieldLabel htmlFor="admin-feedback-reply">
                  Reply as Super Admin
                </FieldLabel>
                <Textarea
                  id="admin-feedback-reply"
                  rows={4}
                  placeholder="Type your reply to the feedback submitter…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </Field>
            ) : null}
          </>
        ) : null}
      </AdminRecordModal>
    </div>
  );
}
