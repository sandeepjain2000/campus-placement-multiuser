'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import { formatDate, formatStatus } from '@/lib/utils';
import PageLoading from '@/components/PageLoading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const historyFetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data;
};

const registryFetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load screens');
  return data;
};

export default function MyExportsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { data: hist, mutate, error, isLoading } = useSWR('/api/user/data-export', historyFetcher);
  const { data: reg } = useSWR('/api/screens/registry', registryFetcher);
  const [busy, setBusy] = useState(false);
  const [showAllScreens, setShowAllScreens] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const exports = useMemo(() => hist?.exports || [], [hist?.exports]);
  const screens = reg?.screens || [];
  const defaultExportExt = 'csv';
  const preFilteredExports = useMemo(() => {
    const q = sectionFilter.trim().toLowerCase();
    return exports.filter((row) => {
      if (statusFilter && String(row.status || '') !== statusFilter) return false;
      if (!q) return true;
      let s = row.section_summary;
      if (typeof s === 'string') {
        try {
          s = JSON.parse(s);
        } catch {
          return false;
        }
      }
      const text = Array.isArray(s) ? s.map((x) => x.key).filter(Boolean).join(', ').toLowerCase() : '';
      return text.includes(q);
    });
  }, [exports, statusFilter, sectionFilter]);
  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: filteredExports,
    filteredCount,
    totalCount: exportsTableTotal,
    hasActiveFilters: exportsHasActiveFilters,
    clearFilters: clearExportsFilters,
  } = useDataTableQuery(preFilteredExports, {
    getSearchText: (row) => {
      let s = row.section_summary;
      if (typeof s === 'string') {
        try {
          s = JSON.parse(s);
        } catch {
          s = null;
        }
      }
      const sections = Array.isArray(s) ? s.map((x) => x.key).filter(Boolean).join(' ') : '';
      return [row.status, row.format, sections].filter(Boolean).join(' ');
    },
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const runExport = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/user/data-export', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Export failed');
      }
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      const name = m?.[1] || `placementhub-export-${new Date().toISOString().slice(0, 10)}.${defaultExportExt}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Download started. A confirmation email was sent if SMTP is configured.', 'success');
      await mutate();
    } catch (e) {
      addToast(e.message || 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [addToast, mutate, defaultExportExt]);

  return (
    <div className="animate-fadeIn mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-muted-foreground">Privacy and portability</p><h1 className="text-3xl font-bold tracking-tight">My data export</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Download a CSV snapshot of the data this platform associates with your login ({session?.user?.role?.replace(/_/g, ' ') || '…'}).
            Each request is recorded for audit. Use the <strong>Screens</strong> button in the top bar to jump to any page.
          </p></div>
          <Button type="button" disabled={busy} onClick={runExport}>
            {busy ? 'Preparing…' : 'Download full export'}
          </Button>
      </header>

      <Card><CardHeader><CardTitle>Export history</CardTitle><CardDescription>Every request is recorded for audit.</CardDescription></CardHeader><CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <AdminFilterSelect
            className="w-44"
            value={statusFilter}
            onValueChange={setStatusFilter}
            items={[
              { label: 'All statuses', value: 'all' },
              { label: 'Completed', value: 'completed' },
              { label: 'Pending', value: 'pending' },
              { label: 'Failed', value: 'failed' },
            ]}
          />
          <Input
            className="w-60"
            placeholder="Filter by section..."
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          />
        </div>
        {isLoading && <PageLoading message="Loading export history…" inline />}
        {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
        {!isLoading && !error && exports.length === 0 && (
          <p className="text-sm text-secondary">No exports yet. Run a download to create the first entry.</p>
        )}
        {!isLoading && !error && exports.length > 0 && filteredExports.length === 0 && (
          <p className="text-sm text-secondary">No exports match your filters or search.</p>
        )}
        {exportsTableTotal > 0 && (
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search status or sections…"
            sort={sort}
            onSortChange={setSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={filteredCount}
            totalCount={exportsTableTotal}
            hasActiveFilters={exportsHasActiveFilters}
            onClear={clearExportsFilters}
            style={{ marginBottom: '1rem' }}
          />
        )}
        {filteredExports.length > 0 && (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Status</TableHead><TableHead>Format</TableHead><TableHead>Size</TableHead><TableHead>Sections</TableHead></TableRow></TableHeader><TableBody>
                {filteredExports.length === 0 && exportsTableTotal > 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No exports match your search.</TableCell></TableRow>
                ) : null}
                {filteredExports.map((row) => (
                  <TableRow key={row.id}><TableCell>{row.created_at ? formatDate(row.created_at) : '—'}</TableCell><TableCell><StatusBadge status={row.status} showDot>{formatStatus(row.status) || '—'}</StatusBadge></TableCell><TableCell>{(row.format || 'csv').toUpperCase()}</TableCell><TableCell>{row.byte_size != null ? `${row.byte_size} B` : '—'}</TableCell><TableCell className="text-sm text-muted-foreground">
                      {(() => {
                        let s = row.section_summary;
                        if (typeof s === 'string') {
                          try {
                            s = JSON.parse(s);
                          } catch {
                            return '—';
                          }
                        }
                        return Array.isArray(s) ? s.map((x) => x.key).filter(Boolean).join(', ') : '—';
                      })()}
                    </TableCell></TableRow>
                ))}
              </TableBody></Table>
          </div>
        )}
      </CardContent></Card>

      <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Screens available to you</CardTitle><CardDescription>Same directory as the Screens search in the header.</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={() => setShowAllScreens((v) => !v)}>
            {showAllScreens ? 'Hide list' : `Show all (${screens.length})`}
          </Button></CardHeader><CardContent>
        {showAllScreens && (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Section</TableHead><TableHead>Screen tag</TableHead><TableHead>Path</TableHead></TableRow></TableHeader><TableBody>
                {screens.map((s) => (
                  <TableRow key={s.href}><TableCell>
                      <a href={s.href}>{s.label}</a>
                    </TableCell><TableCell>{s.section}</TableCell><TableCell>
                      <code>{s.screenId}</code>
                    </TableCell><TableCell className="text-xs text-muted-foreground">{s.href}</TableCell></TableRow>
                ))}
              </TableBody></Table>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
