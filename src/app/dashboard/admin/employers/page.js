'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import {
  COMMON_SORT_OPTIONS,
  EMPLOYER_VERIFIED_FILTER_OPTIONS,
  employerVerifiedFilterFn,
} from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import AdminRecordModal from '@/components/admin/AdminRecordModal';
import CompanyNameLink from '@/components/CompanyNameLink';
import { useToast } from '@/components/ToastProvider';
import { validateAdminEmployerForm } from '@/lib/adminEmployerForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

function employerToForm(e) {
  return {
    name: e?.name || '',
    industry: e?.industry || '',
    website: e?.website || '',
    headquarters: e?.headquarters || '',
    contactPerson: e?.contactPerson || '',
    contactEmail: e?.contactEmail || '',
    contactPhone: e?.contactPhone || '',
    verified: Boolean(e?.verified),
    blacklisted: Boolean(e?.blacklisted),
    blacklistReason: e?.blacklistReason || '',
    accountActive: e?.accountActive !== false,
  };
}

function DetailRow({ label, children }) {
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div className="text-sm" style={{ marginTop: '0.15rem' }}>
        {children}
      </div>
    </div>
  );
}

export default function AdminEmployersPage() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);
  const [employers, setEmployers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [panelMode, setPanelMode] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(employerToForm(null));
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const updateForm = useCallback((patch) => {
    setSaveError('');
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadEmployers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/employers');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load employers');
      setEmployers(Array.isArray(json.employers) ? json.employers : []);
      setListError('');
    } catch (e) {
      setListError(e.message || 'Failed to load employers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployers();
  }, [loadEmployers]);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayEmployers,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(employers, {
    getSearchText: (e) => [e.name, e.industry].filter(Boolean).join(' '),
    filterFn: employerVerifiedFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
  });

  const closePanel = () => {
    setPanelMode(null);
    setSelectedId(null);
    setDetail(null);
    setPanelError('');
    setSaveError('');
  };

  const openPanel = async (id, mode) => {
    setSelectedId(id);
    setPanelMode(mode);
    setPanelLoading(true);
    setPanelError('');
    setSaveError('');
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/employers/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load employer');
      setDetail(json.employer);
      if (mode === 'edit') setForm(employerToForm(json.employer));
    } catch (e) {
      setPanelError(e.message || 'Failed to load employer');
    } finally {
      setPanelLoading(false);
    }
  };

  useEffect(() => {
    if (openedFromQuery.current || isLoading) return;
    const viewId = String(searchParams.get('view') || '').trim();
    if (!viewId) return;
    openedFromQuery.current = true;
    void openPanel(viewId, 'view');
  }, [isLoading, searchParams]);

  const saveEmployer = async () => {
    if (!selectedId) return;

    const validationErr = validateAdminEmployerForm(form);
    if (validationErr) {
      setSaveError(validationErr);
      addToast(validationErr, 'warning');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/admin/employers/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || 'Failed to save employer';
        setSaveError(msg);
        addToast(msg, 'warning');
        return;
      }
      addToast('Employer updated', 'success');
      setDetail(json.employer);
      setEmployers((prev) =>
        prev.map((e) =>
          e.id === json.employer.id
            ? {
                ...e,
                name: json.employer.name,
                website: json.employer.website,
                industry: json.employer.industry || '—',
                verified: json.employer.verified,
                blacklisted: json.employer.blacklisted,
                active: json.employer.accountActive,
              }
            : e,
        ),
      );
      setPanelMode('view');
      setSaveError('');
    } catch (e) {
      const msg = e.message || 'Failed to save employer';
      setSaveError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmployerActive = async (nextActive) => {
    if (!selectedId || !detail) return;
    const action = nextActive ? 'Reactivate' : 'Deactivate';
    const prompt = nextActive
      ? `Reactivate the employer login for ${detail.name}? They will be able to sign in again.`
      : `Deactivate the employer account for ${detail.name}? They will not be able to sign in until reactivated.`;
    if (!window.confirm(prompt)) return;

    setTogglingActive(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/admin/employers/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...employerToForm(detail), accountActive: nextActive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || `Failed to ${action.toLowerCase()} employer`;
        setSaveError(msg);
        addToast(msg, 'warning');
        return;
      }
      setDetail(json.employer);
      setForm(employerToForm(json.employer));
      setEmployers((prev) =>
        prev.map((e) =>
          e.id === json.employer.id ? { ...e, active: json.employer.accountActive } : e,
        ),
      );
      addToast(
        nextActive ? 'Employer account reactivated.' : 'Employer account deactivated.',
        'success',
      );
    } catch (e) {
      const msg = e.message || `Failed to ${action.toLowerCase()} employer`;
      setSaveError(msg);
      addToast(msg, 'error');
    } finally {
      setTogglingActive(false);
    }
  };

  const getExportRows = (scope = 'current') => {
    const headers = ['Company', 'Industry', 'Total Hires', 'Verified', 'Account'];
    const source = scope === 'full' ? employers : displayEmployers;
    const rowsList = source.map((e) => [
      e.name,
      e.industry,
      String(e.hires),
      e.verified ? 'Yes' : 'No',
      e.active !== false ? 'Active' : 'Inactive',
    ]);
    return { headers, rows: rowsList };
  };

  const selectedName = detail?.name || employers.find((e) => e.id === selectedId)?.name || 'Employer';

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Manage Employers</h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">All registered employers on the platform</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="outline" render={<Link href="/dashboard/admin/pending-registrations" />}>Onboard colleges & employers</Button>
          <ExportCsvSplitButton
            filenameBase="admin_employers"
            currentCount={displayEmployers.length}
            fullCount={employers.length}
            getRows={getExportRows}
          />
        </div>
      </div>

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search company or industry…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={EMPLOYER_VERIFIED_FILTER_OPTIONS}
          filterLabel="Verification"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4"><CardTitle>Employer directory</CardTitle><CardDescription>{displayEmployers.length} of {employers.length} employers</CardDescription></CardHeader>
        <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>{['Company','Industry','Total Hires','Verified','Account','Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {displayEmployers.length === 0 && totalCount > 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No employers match your search or filters.
              </TableCell></TableRow>
            ) : null}
            {displayEmployers.map((e) => (
              <TableRow
                key={e.id}
                className="admin-row-clickable"
                tabIndex={0}
                role="button"
                aria-label={`View ${e.name} profile`}
                onClick={() => openPanel(e.id, 'view')}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    openPanel(e.id, 'view');
                  }
                }}
              >
                <TableCell className="font-semibold" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className="text-primary font-semibold hover:underline"
                      onClick={() => openPanel(e.id, 'view')}
                    >
                      {e.name}
                    </button>
                    {e.website ? (
                      <CompanyNameLink
                        name="Website"
                        website={e.website}
                        className="text-xs"
                        style={{ fontWeight: 500 }}
                      />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{e.industry}</TableCell>
                <TableCell>{e.hires}</TableCell>
                <TableCell>
                  {e.blacklisted ? (
                    <StatusBadge tone="red" showDot>Blocked</StatusBadge>
                  ) : e.verified ? (
                    <StatusBadge tone="green" showDot>Verified</StatusBadge>
                  ) : (
                    <StatusBadge tone="amber" showDot>Pending</StatusBadge>
                  )}
                </TableCell>
                <TableCell><StatusBadge tone={e.active === false ? 'gray' : 'green'} showDot>{e.active === false ? 'Inactive' : 'Active'}</StatusBadge></TableCell>
                <TableCell onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex flex-wrap gap-1">
                    <StandardTableIconAction action="view" onClick={() => openPanel(e.id, 'view')} />
                    <StandardTableIconAction action="edit" onClick={() => openPanel(e.id, 'edit')} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && totalCount === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {listError || 'No employers found.'}
              </TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <AdminRecordModal
        title={selectedName}
        mode={panelMode}
        loading={panelLoading}
        saving={saving}
        error={panelError}
        onClose={closePanel}
        onSave={saveEmployer}
        footer={
          panelMode === 'view' && detail && !panelLoading && !panelError ? (
            <>
              {detail.accountActive ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={togglingActive || saving}
                  onClick={() => toggleEmployerActive(false)}
                >
                  {togglingActive ? 'Updating…' : 'Deactivate account'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={togglingActive || saving}
                  onClick={() => toggleEmployerActive(true)}
                >
                  {togglingActive ? 'Updating…' : 'Reactivate account'}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  setForm(employerToForm(detail));
                  setSaveError('');
                  setPanelMode('edit');
                }}
              >
                Edit employer
              </Button>
            </>
          ) : null
        }
      >
        {panelMode === 'view' && detail ? (
          <div className="text-sm" style={{ lineHeight: 1.6 }}>
            <DetailRow label="Company">
              <CompanyNameLink name={detail.name} website={detail.website} />
            </DetailRow>
            <DetailRow label="Industry">{detail.industry || '—'}</DetailRow>
            <DetailRow label="Headquarters">{detail.headquarters || '—'}</DetailRow>
            <DetailRow label="Contact">{detail.contactPerson || '—'}</DetailRow>
            <DetailRow label="Contact email">{detail.contactEmail || '—'}</DetailRow>
            <DetailRow label="Contact phone">{detail.contactPhone || '—'}</DetailRow>
            <DetailRow label="Account login">{detail.accountEmail || '—'}</DetailRow>
            <DetailRow label="Account holder">{detail.accountName || '—'}</DetailRow>
            <DetailRow label="Total hires">{detail.hires}</DetailRow>
            <DetailRow label="Verified">{detail.verified ? 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Blocked">{detail.blacklisted ? detail.blacklistReason || 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Account status">{detail.accountActive ? 'Active' : 'Inactive'}</DetailRow>
          </div>
        ) : null}

        {panelMode === 'edit' && detail ? (
          <FieldGroup>
            {saveError ? (
              <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="admin-employer-name">Company name</FieldLabel>
              <Input id="admin-employer-name" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-employer-industry">Industry</FieldLabel>
              <Input id="admin-employer-industry" value={form.industry} onChange={(e) => updateForm({ industry: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-employer-website">Website</FieldLabel>
              <Input id="admin-employer-website" value={form.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="https://…" />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-employer-headquarters">Headquarters</FieldLabel>
              <Input id="admin-employer-headquarters" value={form.headquarters} onChange={(e) => updateForm({ headquarters: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-employer-contact">Contact person</FieldLabel>
              <Input id="admin-employer-contact" value={form.contactPerson} onChange={(e) => updateForm({ contactPerson: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-employer-email">Contact email</FieldLabel>
              <Input id="admin-employer-email" type="email" value={form.contactEmail} onChange={(e) => updateForm({ contactEmail: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-employer-phone">Contact phone</FieldLabel>
              <Input
                id="admin-employer-phone"
                value={form.contactPhone}
                onChange={(e) => updateForm({ contactPhone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="admin-employer-active">Employer account is active (can sign in)</FieldLabel>
              <Checkbox
                id="admin-employer-active"
                checked={form.accountActive}
                onCheckedChange={(v) => updateForm({ accountActive: !!v })}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="admin-employer-verified">Mark as verified employer</FieldLabel>
              <Checkbox id="admin-employer-verified" checked={form.verified} onCheckedChange={(v) => updateForm({ verified: !!v })} />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="admin-employer-blocked">Block employer from campus access</FieldLabel>
              <Checkbox id="admin-employer-blocked" checked={form.blacklisted} onCheckedChange={(v) => updateForm({ blacklisted: !!v })} />
            </Field>
            {form.blacklisted ? (
              <Field>
                <FieldLabel htmlFor="admin-employer-block-reason">Block reason</FieldLabel>
                <Textarea
                  id="admin-employer-block-reason"
                  rows={3}
                  value={form.blacklistReason}
                  onChange={(e) => updateForm({ blacklistReason: e.target.value })}
                />
              </Field>
            ) : null}
          </FieldGroup>
        ) : null}
      </AdminRecordModal>
    </div>
  );
}
