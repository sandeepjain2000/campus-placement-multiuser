'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import {
  COMMON_SORT_OPTIONS,
  FILTER_ALL,
  ROLE_FILTER_OPTIONS,
  roleFilterFn,
  STATUS_FILTER_OPTIONS,
  statusActiveFilterFn,
} from '@/lib/tableQueryPresets';
import { getRoleDisplayName } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import AdminRecordModal from '@/components/admin/AdminRecordModal';
import { useToast } from '@/components/ToastProvider';
import {
  ADMIN_USER_ERRORS,
  ADMIN_USER_ROLES,
  validateAdminUserForm,
} from '@/lib/adminUserForm';
import { sanitizePhoneInput } from '@/lib/validators';
import { isUuid } from '@/lib/tenantContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const KNOWN_ADMIN_USER_ERRORS = new Set(Object.values(ADMIN_USER_ERRORS));

function friendlyAdminUserError(raw, fallback = ADMIN_USER_ERRORS.LOAD_FAILED) {
  const msg = String(raw || '').trim();
  if (msg && KNOWN_ADMIN_USER_ERRORS.has(msg)) return msg;
  return fallback;
}

function userToForm(u) {
  return {
    firstName: u?.firstName || '',
    lastName: u?.lastName || '',
    phone: u?.phone || '',
    role: u?.role || 'student',
    active: u?.active !== false,
  };
}

/** Seed edit form from list row (name may be combined). */
function listRowToForm(u) {
  const name = String(u?.name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    firstName: u?.firstName || parts[0] || '',
    lastName: u?.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : ''),
    phone: u?.phone || '',
    role: u?.role || 'student',
    active: u?.active !== false,
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

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [panelMode, setPanelMode] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(userToForm(null));
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const sessionUserId = String(session?.user?.id || session?.user?.sub || '').trim();

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(friendlyAdminUserError(json?.error, ADMIN_USER_ERRORS.LOAD_FAILED));
      setUsers(Array.isArray(json.users) ? json.users : []);
      setError('');
    } catch (e) {
      setError(friendlyAdminUserError(e.message, ADMIN_USER_ERRORS.LOAD_FAILED));
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayUsers,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(users, {
    getSearchText: (u) => [u.name, u.email, getRoleDisplayName(u.role)].filter(Boolean).join(' '),
    filterFn: (row, f) => {
      if (f === 'active' || f === 'inactive') return statusActiveFilterFn(row, f);
      return roleFilterFn(row, f);
    },
    sortOptions: COMMON_SORT_OPTIONS,
  });

  const getExportRows = (scope = 'current') => {
    const headers = ['User', 'Email', 'Role', 'Status'];
    const source = scope === 'full' ? users : displayUsers;
    const rowsList = source.map((u) => [
      u.name,
      u.email,
      getRoleDisplayName(u.role),
      u.active ? 'Active' : 'Inactive',
    ]);
    return { headers, rows: rowsList };
  };

  const closePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedId(null);
    setDetail(null);
    setForm(userToForm(null));
    setPanelError('');
    setSaveError('');
    setSaving(false);
    setPanelLoading(false);
  }, []);

  const openUser = useCallback(async (userId, mode = 'edit', listRow = null) => {
    const id = String(userId || '').trim();
    if (!isUuid(id)) {
      setSelectedId(null);
      setPanelMode('edit');
      setPanelLoading(false);
      setDetail(null);
      setPanelError(ADMIN_USER_ERRORS.INVALID_ID);
      return;
    }

    // Open dialog immediately; seed from list row so fields show while detail loads.
    setSelectedId(id);
    setPanelMode(mode);
    setPanelLoading(true);
    setPanelError('');
    setSaveError('');
    if (listRow) {
      const seeded = {
        id,
        name: listRow.name || listRow.email || 'User',
        email: listRow.email || '',
        firstName: listRow.firstName,
        lastName: listRow.lastName,
        phone: listRow.phone || '',
        role: listRow.role,
        active: listRow.active !== false,
        verified: Boolean(listRow.verified),
      };
      setDetail(seeded);
      setForm(listRowToForm(listRow));
    } else {
      setDetail(null);
    }

    try {
      let res;
      try {
        res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`);
      } catch {
        setPanelError(ADMIN_USER_ERRORS.NETWORK);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPanelError(friendlyAdminUserError(json?.error, ADMIN_USER_ERRORS.LOAD_FAILED));
        return;
      }
      if (!json?.user) {
        setPanelError(ADMIN_USER_ERRORS.NOT_FOUND);
        return;
      }
      setDetail(json.user);
      setForm(userToForm(json.user));
      setPanelError('');
    } catch {
      setPanelError(ADMIN_USER_ERRORS.LOAD_FAILED);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const updateForm = useCallback((patch) => {
    setSaveError('');
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveUser = useCallback(async () => {
    if (!selectedId) return;
    const check = validateAdminUserForm(form);
    if (!check.ok) {
      setSaveError(check.error);
      return;
    }
    if (sessionUserId && sessionUserId === selectedId && !form.active) {
      setSaveError(ADMIN_USER_ERRORS.CANNOT_DEACTIVATE_SELF);
      return;
    }
    if (sessionUserId && sessionUserId === selectedId && detail && form.role !== detail.role) {
      setSaveError(ADMIN_USER_ERRORS.CANNOT_CHANGE_OWN_ROLE);
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      let res;
      try {
        res = await fetch(`/api/admin/users/${encodeURIComponent(selectedId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } catch {
        setSaveError(ADMIN_USER_ERRORS.NETWORK);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(friendlyAdminUserError(json?.error, ADMIN_USER_ERRORS.SAVE_FAILED));
        return;
      }
      const saved = json.user;
      setDetail(saved);
      setForm(userToForm(saved));
      setUsers((prev) =>
        prev.map((u) =>
          u.id === saved.id
            ? { id: saved.id, name: saved.name, email: saved.email, role: saved.role, active: saved.active }
            : u,
        ),
      );
      setPanelMode('view');
      addToast('User updated.', 'success');
    } catch {
      setSaveError(ADMIN_USER_ERRORS.SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  }, [selectedId, form, sessionUserId, detail, addToast]);

  const isSelf = Boolean(sessionUserId && selectedId && sessionUserId === selectedId);

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">All users across the platform</p>
        </div>
        <ExportCsvSplitButton
          filenameBase="admin_users"
          currentCount={displayUsers.length}
          fullCount={users.length}
          getRows={getExportRows}
        />
      </div>

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, email, or role…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={[
            FILTER_ALL,
            ...ROLE_FILTER_OPTIONS.slice(1),
            { value: 'placement_committee', label: 'Placement Committee' },
            ...STATUS_FILTER_OPTIONS.slice(1),
          ]}
          filterLabel="Filter"
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
        <CardHeader className="border-b py-4"><CardTitle>User directory</CardTitle><CardDescription>{displayUsers.length} of {users.length} users</CardDescription></CardHeader>
        <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>{['User','Email','Role','Status','Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {displayUsers.length === 0 && totalCount > 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  No users match your search or filters.
                </TableCell>
              </TableRow>
            ) : null}
            {displayUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-xs font-bold">
                      {(u.name || '?')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span className="font-semibold">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <StatusBadge tone={u.role === 'super_admin' ? 'red' : u.role === 'college_admin' ? 'indigo' : u.role === 'employer' ? 'green' : 'blue'}>
                    {getRoleDisplayName(u.role)}
                  </StatusBadge>
                </TableCell>
                <TableCell><StatusBadge tone={u.active ? 'green' : 'gray'} showDot>{u.active ? 'Active' : 'Inactive'}</StatusBadge></TableCell>
                <TableCell>
                  <StandardTableIconAction
                    action="edit"
                    variant="ghost"
                    tooltip="Edit user"
                    onClick={(e) => {
                      e?.stopPropagation?.();
                      void openUser(u.id, 'edit', u);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && totalCount === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  {error || 'No users found.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <AdminRecordModal
        title={detail?.name || 'User'}
        mode={panelMode}
        loading={panelLoading}
        saving={saving}
        error={panelError}
        onClose={closePanel}
        onSave={saveUser}
        footer={
          panelMode === 'view' && detail && !panelLoading && !panelError ? (
            <Button
              type="button"
              onClick={() => {
                setForm(userToForm(detail));
                setSaveError('');
                setPanelMode('edit');
              }}
            >
              Edit user
            </Button>
          ) : null
        }
      >
        {panelMode === 'view' && detail ? (
          <div className="text-sm" style={{ lineHeight: 1.6 }}>
            <DetailRow label="Name">{detail.name || '—'}</DetailRow>
            <DetailRow label="Email">{detail.email || '—'}</DetailRow>
            <DetailRow label="Phone">{detail.phone || '—'}</DetailRow>
            <DetailRow label="Role">{getRoleDisplayName(detail.role)}</DetailRow>
            <DetailRow label="Status">{detail.active ? 'Active' : 'Inactive'}</DetailRow>
            <DetailRow label="Verified">{detail.verified ? 'Yes' : 'No'}</DetailRow>
          </div>
        ) : null}

        {panelMode === 'edit' && detail ? (
          <FieldGroup>
            {saveError ? (
              <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="admin-user-first-name">First name</FieldLabel>
              <Input
                id="admin-user-first-name"
                value={form.firstName}
                onChange={(e) => updateForm({ firstName: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-last-name">Last name</FieldLabel>
              <Input
                id="admin-user-last-name"
                value={form.lastName}
                onChange={(e) => updateForm({ lastName: e.target.value })}
              />
            </Field>
            <Field data-disabled>
              <FieldLabel htmlFor="admin-user-email">Email</FieldLabel>
              <Input id="admin-user-email" value={detail.email} disabled readOnly />
              <FieldDescription>Email cannot be changed here.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-phone">Phone</FieldLabel>
              <Input
                id="admin-user-phone"
                value={form.phone}
                onChange={(e) => updateForm({ phone: sanitizePhoneInput(e.target.value) })}
                placeholder="+91 9876543210"
              />
            </Field>
            <Field data-disabled={isSelf || undefined}>
              <FieldLabel htmlFor="admin-user-role">Role</FieldLabel>
              <AdminFilterSelect
                id="admin-user-role"
                className="w-full"
                value={form.role}
                disabled={isSelf}
                emptyMapsToAll={false}
                onValueChange={(role) => updateForm({ role })}
                items={ADMIN_USER_ROLES.map((role) => ({ label: getRoleDisplayName(role), value: role }))}
              />
              {isSelf ? (
                <FieldDescription>You cannot change your own role.</FieldDescription>
              ) : null}
            </Field>
            <Field orientation="horizontal" data-disabled={isSelf || undefined}>
              <FieldLabel htmlFor="admin-user-active">Account active</FieldLabel>
              <Checkbox
                id="admin-user-active"
                checked={Boolean(form.active)}
                disabled={isSelf}
                onCheckedChange={(v) => updateForm({ active: !!v })}
              />
            </Field>
            {isSelf ? (
              <FieldDescription>You cannot deactivate your own account.</FieldDescription>
            ) : null}
          </FieldGroup>
        ) : null}
      </AdminRecordModal>
    </div>
  );
}
