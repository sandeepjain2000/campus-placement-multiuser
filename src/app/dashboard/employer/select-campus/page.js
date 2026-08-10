'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import EntityLogo from '@/components/EntityLogo';
import { Plus, Eye, Trash2, Building2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  TIE_UP_REVOKE_DISABLED_TITLE,
  TIE_UP_REVOKE_ENABLED,
  TIE_UP_REVOKE_MESSAGES,
  canRequestEmployerTieUp,
} from '@/lib/employerTieUpShared';
import { EMPLOYER_USE_CAMPUS_DISABLED_TITLE } from '@/lib/employerActiveCampus';
import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ToastProvider';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed to load (${res.status})`);
  if (!data.colleges || !Array.isArray(data.colleges)) {
    throw new Error(data.error || 'Invalid response from server');
  }
  return data;
};

const STATUS_CONFIG = {
  approved:      { label: 'Approved',      color: 'var(--success-700)', bg: 'var(--success-50)', border: 'var(--success-200)', dot: 'var(--success-500)' },
  pending:       { label: 'Pending',       color: 'var(--warning-700)', bg: 'var(--warning-50)', border: 'var(--warning-200)', dot: 'var(--warning-500)' },
  rejected:      { label: 'Rejected',      color: 'var(--danger-700)', bg: 'var(--danger-50)', border: 'var(--danger-200)', dot: 'var(--danger-500)' },
  blacklisted:   { label: 'Revoked',       color: 'var(--danger-900)', bg: 'var(--danger-100)', border: 'var(--danger-300)', dot: 'var(--danger-700)' },
  revoked:       { label: 'Revoked',       color: 'var(--danger-900)', bg: 'var(--danger-100)', border: 'var(--danger-300)', dot: 'var(--danger-700)' },
  null:          { label: 'Available',     color: 'var(--primary-700)', bg: 'var(--primary-50)', border: 'var(--primary-200)', dot: 'var(--primary-500)' },
};

function normalizeApprovalStatus(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'blacklisted') return 'revoked';
  return ['approved','pending','rejected','revoked'].includes(s) ? s : null;
}
function canRequestTieUp(status) {
  return canRequestEmployerTieUp(status);
}
function statusRank(s) {
  const n = normalizeApprovalStatus(s);
  if (n === 'approved') return 0;
  if (n === 'pending') return 1;
  if (n == null) return 2;
  return 3;
}

export default function SelectCampusPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/campuses', fetcher);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('approved');
  const [sortOption, setSortOption] = useState('status');
  const [focusCampusId, setFocusCampusId] = useState('');
  const [requesting, setRequesting] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const showToast = (msg, type = 'success') => {
    addToast(msg, type === 'error' ? 'error' : 'success');
  };

  const rawColleges = data?.colleges;
  const colleges = useMemo(() => rawColleges ?? [], [rawColleges]);
  const counts = useMemo(() => ({
    total: colleges.length,
    approved: colleges.filter(c => normalizeApprovalStatus(c.approval_status) === 'approved').length,
    pending: colleges.filter(c => normalizeApprovalStatus(c.approval_status) === 'pending').length,
    available: colleges.filter(c => canRequestTieUp(c.approval_status)).length,
  }), [colleges]);

  const campusOptions = useMemo(() => [...colleges].sort((a,b) => (a.name||'').localeCompare(b.name||'')), [colleges]);

  const handleRequestAccess = async (college) => {
    setRequesting(college.id);
    try {
      const res = await fetch('/api/employer/campuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collegeId: college.id }) });
      const json = await res.json();
      if (res.ok) { showToast(json.alreadyPending ? json.message || 'Already pending' : json.message || `Requested for ${college.name}`, json.alreadyPending ? 'error' : 'success'); mutate(); }
      else showToast(json.error || 'Request failed', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setRequesting(null); }
  };

  const handleRevokeAccess = async (college) => {
    setRevoking(college.id);
    try {
      const res = await fetch('/api/college/employers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_tenant_id: college.id, confirmed: true }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(json.message || `Tie-up with ${college.name} revoked. The college has been notified.`);
        try {
          const active = JSON.parse(sessionStorage.getItem('activeCampus') || '{}');
          if (active?.id === college.id) {
            sessionStorage.removeItem('activeCampus');
            localStorage.removeItem('activeCampus');
          }
        } catch {
          sessionStorage.removeItem('activeCampus');
          try { localStorage.removeItem('activeCampus'); } catch { /**/ }
        }
        mutate();
      } else showToast(json.error || 'Failed', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setRevoking(null); }
  };

  const displayRows = useMemo(() => {
    let list = colleges.filter(c => {
      if (focusCampusId) return c.id === focusCampusId;
      const matchSearch = !search || (c.name||'').toLowerCase().includes(search.toLowerCase()) || (c.city||'').toLowerCase().includes(search.toLowerCase());
      const status = normalizeApprovalStatus(c.approval_status);
      const matchStatus = filterStatus === 'all' || status === filterStatus || (filterStatus === 'not_requested' && status === null);
      return matchSearch && matchStatus;
    });
    return [...list].sort((a, b) => {
      if (sortOption === 'status') { const d = statusRank(a.approval_status) - statusRank(b.approval_status); return d !== 0 ? d : (a.name||'').localeCompare(b.name||''); }
      if (sortOption === 'name_asc') return (a.name||'').localeCompare(b.name||'');
      if (sortOption === 'name_desc') return (b.name||'').localeCompare(a.name||'');
      if (sortOption === 'students_desc') return (b.total_students||0) - (a.total_students||0);
      return 0;
    });
  }, [colleges, search, filterStatus, sortOption, focusCampusId]);

  const statusPills = [
    { key: 'all', label: 'All Campuses' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending', label: 'Pending' },
    { key: 'not_requested', label: 'Available' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="animate-fadeIn flex w-full flex-col gap-5 pb-8">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 aria-hidden /> Campus Partnerships
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isLoading ? 'Loading campus directory…' : `${counts.total} colleges · ${counts.approved} approved · ${counts.pending} pending`}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/employer/select-campus/create')}>
          <Plus data-icon="inline-start" aria-hidden /> Request Tie-up
        </Button>
      </div>

      {/* Switch campus help */}
      {!isLoading && !error && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong>All campuses:</strong> employer login includes every approved partnership — no campus switch needed.
            The <strong>Use campus</strong> action is kept for reference but is disabled.
          </span>
          {counts.approved > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {colleges
                .filter((c) => normalizeApprovalStatus(c.approval_status) === 'approved')
                .slice(0, 5)
                .map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    disabled
                    title={EMPLOYER_USE_CAMPUS_DISABLED_TITLE}
                  >
                    Use {c.name?.split('(')[0]?.trim().slice(0, 28) || 'campus'}
                  </Button>
                ))}
            </div>
          )}
          {counts.approved === 0 && (
            <Button size="sm" onClick={() => router.push('/data-entry')}>
              Demo data → Ensure IIT Madras tie-up
            </Button>
          )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList className="h-auto flex-wrap">
        {statusPills.map((t) => {
          let count = '';
          if (!isLoading) {
            if (t.key === 'approved') count = counts.approved;
            if (t.key === 'pending') count = counts.pending;
            if (t.key === 'not_requested') count = counts.available;
            if (t.key === 'all') count = counts.total;
          }
          return (
            <TabsTrigger
              key={t.key}
              value={t.key}
            >
              {formatFilterBadgeLabelParen(t.label, count !== '' ? count : 0)}
            </TabsTrigger>
          )
        })}
        </TabsList>
      </Tabs>

      {/* Search and Sort Toolbar */}
      <Card>
        <CardContent className="grid gap-4 py-4 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="campus-search">Search campuses</FieldLabel>
          <Input
            id="campus-search" name="campus-search" type="search" placeholder="Search by name or city…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="campus-focus">Focus campus</FieldLabel>
          <AdminFilterSelect
            id="campus-focus"
            className="w-full"
            value={focusCampusId}
            onValueChange={setFocusCampusId}
            items={[
              { label: 'All campuses', value: 'all' },
              ...campusOptions.map((campus) => ({ label: campus.name, value: String(campus.id) })),
            ]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="campus-sort">Sort by</FieldLabel>
          <AdminFilterSelect
            id="campus-sort"
            className="w-full"
            value={sortOption}
            onValueChange={setSortOption}
            emptyMapsToAll={false}
            items={[
              { label: 'Approval Status', value: 'status' },
              { label: 'Name (A–Z)', value: 'name_asc' },
              { label: 'Name (Z–A)', value: 'name_desc' },
              { label: 'Student Count (High to Low)', value: 'students_desc' },
            ]}
          />
        </Field>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading && <div className="skeleton skeleton-card" style={{ height: 400 }} />}
      {error && <Alert variant="destructive"><AlertDescription>{error.message || 'Failed to load colleges.'}</AlertDescription></Alert>}

      {!isLoading && !error && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="bg-muted/30 border-b py-4">
            <CardTitle>Campus Directory</CardTitle>
            <CardDescription>
              Showing <strong>{displayRows.length}</strong> campus{displayRows.length === 1 ? '' : 'es'} · scroll horizontally for all columns (Actions on the right)
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-6">#</TableHead>
                  <TableHead>College Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-40 text-center">
                      <Building2 className="mx-auto mb-3 opacity-40" aria-hidden />
                      <p className="text-foreground font-semibold">No colleges found</p>
                      <p className="mt-1">Try adjusting your filters or search query.</p>
                      <Button variant="ghost" className="mt-3" onClick={() => { setSearch(''); setFilterStatus('all'); setFocusCampusId(''); }}>
                        Clear Filters
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : displayRows.map((c, i) => {
                  const status = normalizeApprovalStatus(c.approval_status);
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.null;
                  const placementPct = c.total_students > 0 ? Math.round((Number(c.placed_students||0) / Number(c.total_students)) * 100) : null;
                  const isApproved = status === 'approved';
                  const isPending = status === 'pending';
                  const showRequest = canRequestTieUp(c.approval_status);

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground pl-6 text-xs tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <EntityLogo name={c.name} website={c.website} size="md" shape="rounded" />
                          <div>
                            <div className="font-semibold">{c.name}</div>
                            {c.website && (
                              <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer"
                                className="text-muted-foreground text-xs hover:underline"
                              >
                                {c.website.replace(/^https?:\/\//, '')}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>
                          {c.email ? (
                            <a href={`mailto:${c.email}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }} title={`Email ${c.name}`}>
                              {c.email}
                            </a>
                          ) : '—'}
                        </div>
                        <div>
                          {c.phone ? (
                            <a href={`tel:${String(c.phone).replace(/\s+/g, '')}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }} title={`Call ${c.name}`}>
                              {c.phone}
                            </a>
                          ) : '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{c.total_students ?? 0}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {placementPct != null ? `${placementPct}%` : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status || 'not_requested'} showDot>{cfg.label}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/dashboard/employer/select-campus/${c.id}`)}
                            title={`View details for ${c.name}`}
                            aria-label={`View details for ${c.name}`}
                          >
                            <Eye aria-hidden />
                          </Button>
                          {isApproved && (
                            <>
                              <Button
                                size="sm"
                                disabled
                                title={EMPLOYER_USE_CAMPUS_DISABLED_TITLE}
                              >
                                Use campus
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => TIE_UP_REVOKE_ENABLED && setRevokeTarget(c)}
                                disabled={!TIE_UP_REVOKE_ENABLED || revoking === c.id}
                                title={TIE_UP_REVOKE_ENABLED ? `Revoke tie-up with ${c.name}` : TIE_UP_REVOKE_DISABLED_TITLE}
                                aria-label={`Revoke tie-up with ${c.name}`}
                              >
                                {revoking === c.id ? '…' : <Trash2 aria-hidden />}
                              </Button>
                            </>
                          )}
                          {showRequest && (
                            <StandardTableIconAction
                              action="request"
                              variant="primary"
                              loading={requesting === c.id}
                              disabled={requesting === c.id}
                              onClick={() => handleRequestAccess(c)}
                              tooltip={`Request tie-up with ${c.name}`}
                            />
                          )}
                          {isPending && <span className="text-muted-foreground text-xs font-medium">Awaiting Approval</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title={TIE_UP_REVOKE_MESSAGES.employerConfirmTitle}
        message={revokeTarget ? TIE_UP_REVOKE_MESSAGES.employerConfirmBody(revokeTarget.name) : ''}
        confirmLabel="Revoke tie-up & notify"
        confirmTone="danger"
        onCancel={() => setRevokeTarget(null)}
        onConfirm={async () => {
          if (!revokeTarget) return;
          const college = revokeTarget;
          setRevokeTarget(null);
          await handleRevokeAccess(college);
        }}
        loading={Boolean(revokeTarget && revoking === revokeTarget.id)}
      />
    </div>
  );
}
