'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { emptySelectedItems } from '@/lib/menuHighlightDefaults';

function entityToken(entity) {
  return `${entity.type}:${entity.id}`;
}

export default function AdminMenuHighlightPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#FF0000');
  const [selectedItems, setSelectedItems] = useState(emptySelectedItems());
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [menus, setMenus] = useState({});
  const [roles, setRoles] = useState([
    { key: 'college_admin', label: 'College' },
    { key: 'employer', label: 'Employer' },
    { key: 'student', label: 'Student' },
  ]);
  const [activeRoleTab, setActiveRoleTab] = useState('college_admin');

  const [entityRoleFilter, setEntityRoleFilter] = useState('all');
  const [entitySearch, setEntitySearch] = useState('');
  const [entitySearchApplied, setEntitySearchApplied] = useState('');
  const [entities, setEntities] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesTotal, setEntitiesTotal] = useState(0);

  const selectedSet = useMemo(
    () => new Set(selectedEntities.map(entityToken)),
    [selectedEntities],
  );

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/admin/menu-highlight');
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to load menu highlight config');
    setHighlightColor(json.highlightColor || '#FF0000');
    setSelectedItems({ ...emptySelectedItems(), ...(json.selectedItems || {}) });
    setSelectedEntities(Array.isArray(json.selectedEntities) ? json.selectedEntities : []);
    setMenus(json.menus || {});
    if (Array.isArray(json.roles) && json.roles.length) setRoles(json.roles);
  }, []);

  const loadEntities = useCallback(async () => {
    setEntitiesLoading(true);
    try {
      const params = new URLSearchParams({
        role: entityRoleFilter,
        q: entitySearchApplied,
        limit: '150',
        page: '1',
      });
      const res = await fetch(`/api/admin/menu-highlight/entities?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load entities');
      setEntities(Array.isArray(json.entities) ? json.entities : []);
      setEntitiesTotal(Number(json.total || 0));
    } catch (e) {
      addToast(e.message || 'Failed to load entities', 'error');
      setEntities([]);
      setEntitiesTotal(0);
    } finally {
      setEntitiesLoading(false);
    }
  }, [addToast, entityRoleFilter, entitySearchApplied]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadConfig();
      } catch (e) {
        if (mounted) addToast(e.message || 'Failed to load config', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [addToast, loadConfig]);

  useEffect(() => {
    if (loading) return;
    loadEntities();
  }, [loading, loadEntities]);

  const toggleItem = (roleKey, itemKey, checked) => {
    setSelectedItems((prev) => {
      const current = Array.isArray(prev[roleKey]) ? prev[roleKey] : [];
      const next = checked
        ? current.includes(itemKey)
          ? current
          : [...current, itemKey]
        : current.filter((k) => k !== itemKey);
      return { ...prev, [roleKey]: next };
    });
  };

  const toggleEntity = (entity, checked) => {
    const token = entityToken(entity);
    setSelectedEntities((prev) => {
      if (checked) {
        if (prev.some((e) => entityToken(e) === token)) return prev;
        return [
          ...prev,
          {
            type: entity.type,
            id: entity.id,
            name: entity.name || '',
          },
        ];
      }
      return prev.filter((e) => entityToken(e) !== token);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/menu-highlight', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          highlightColor,
          selectedItems,
          selectedEntities,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      setHighlightColor(json.highlightColor || highlightColor);
      setSelectedItems({ ...emptySelectedItems(), ...(json.selectedItems || {}) });
      setSelectedEntities(Array.isArray(json.selectedEntities) ? json.selectedEntities : []);
      addToast(json.message || 'Menu highlighting saved', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground m-0 p-6 text-sm">Loading menu highlighting…</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Menu item highlighting</h1>
        <p className="text-muted-foreground mt-1 mb-0 text-sm">
          Choose which landing-page menu items to highlight, the font color, and which colleges, employers, or
          students see it. Highlighting changes font color only.
        </p>
      </div>

      <Alert>
        <AlertTitle>How it applies</AlertTitle>
        <AlertDescription>
          A menu item is highlighted only when it is checked for that role <strong>and</strong> the logged-in
          entity is selected below. College selection affects college logins; employer selection affects employer
          logins; student selection affects student logins.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Highlight color</CardTitle>
          <CardDescription>One global color for all highlighted menu items. Default is red.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel htmlFor="menu-highlight-color">Color</FieldLabel>
              <div className="flex items-center gap-3">
                <Input
                  id="menu-highlight-color"
                  type="color"
                  value={highlightColor.length === 7 ? highlightColor : '#FF0000'}
                  onChange={(e) => setHighlightColor(String(e.target.value || '#FF0000').toUpperCase())}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  aria-label="Highlight color hex"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  placeholder="#FF0000"
                  className="font-mono"
                />
              </div>
              <FieldDescription>
                Preview:{' '}
                <span style={{ color: highlightColor }} className="font-medium">
                  Sample menu item
                </span>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menu items</CardTitle>
          <CardDescription>
            Same hierarchy as each role’s home landing page. Check items to highlight for that role only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeRoleTab} onValueChange={setActiveRoleTab}>
            <TabsList>
              {roles.map((role) => (
                <TabsTrigger key={role.key} value={role.key}>
                  {role.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {roles.map((role) => {
              const sections = menus?.[role.key]?.sections || [];
              const checked = new Set(selectedItems[role.key] || []);
              return (
                <TabsContent key={role.key} value={role.key} className="mt-4">
                  <div className="ph-hub-card-grid dashboard-nav-hub-grid">
                    {sections.map((section) => (
                      <Card key={section.id} size="sm" className="self-start">
                        <CardHeader className="border-b py-3">
                          <CardTitle className="text-base">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3">
                          <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            {(section.items || []).map((item) => {
                              const isChecked = checked.has(item.key);
                              return (
                                <li key={item.key} className="flex items-start gap-2">
                                  <Checkbox
                                    id={`mh-${role.key}-${item.key}`}
                                    checked={isChecked}
                                    disabled={Boolean(item.disabled)}
                                    onCheckedChange={(value) =>
                                      toggleItem(role.key, item.key, value === true)
                                    }
                                  />
                                  <label
                                    htmlFor={`mh-${role.key}-${item.key}`}
                                    className="min-w-0 flex-1 cursor-pointer text-sm leading-snug"
                                    style={isChecked ? { color: highlightColor } : undefined}
                                  >
                                    {item.label}
                                    {item.disabled ? (
                                      <span className="text-muted-foreground"> (unavailable)</span>
                                    ) : null}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entities that see highlighting</CardTitle>
          <CardDescription>
            Ordered by creation date (oldest first). Filter by role or name. Selected: {selectedEntities.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field className="sm:w-48">
              <FieldLabel>Role filter</FieldLabel>
              <AdminFilterSelect
                value={entityRoleFilter}
                emptyMapsToAll={false}
                onValueChange={setEntityRoleFilter}
                items={[
                  { value: 'all', label: 'All roles' },
                  { value: 'college', label: 'College' },
                  { value: 'employer', label: 'Employer' },
                  { value: 'student', label: 'Student' },
                ]}
              />
            </Field>
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor="mh-entity-search">Search by name</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="mh-entity-search"
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEntitySearchApplied(entitySearch.trim());
                  }}
                  placeholder="College, company, or student name"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEntitySearchApplied(entitySearch.trim())}
                >
                  Search
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEntitySearch('');
                    setEntitySearchApplied('');
                  }}
                >
                  Clear
                </Button>
              </div>
            </Field>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="w-12 px-3 py-2 font-medium"> </th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Detail</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {entitiesLoading ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-3 py-6 text-center">
                      Loading entities…
                    </td>
                  </tr>
                ) : entities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-3 py-6 text-center">
                      No entities match this filter.
                    </td>
                  </tr>
                ) : (
                  entities.map((entity) => {
                    const token = entityToken(entity);
                    const checked = selectedSet.has(token);
                    return (
                      <tr key={token} className="border-t">
                        <td className="px-3 py-2 align-middle">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleEntity(entity, value === true)}
                            aria-label={`Select ${entity.name}`}
                          />
                        </td>
                        <td className="px-3 py-2 capitalize">{entity.type}</td>
                        <td className="px-3 py-2 font-medium">{entity.name}</td>
                        <td className="text-muted-foreground px-3 py-2">{entity.detail || '—'}</td>
                        <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                          {entity.createdAt
                            ? new Date(entity.createdAt).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground m-0 text-xs">
            Showing {entities.length} of {entitiesTotal} (creation-date ascending).
          </p>

          {selectedEntities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedEntities.map((entity) => (
                <Button
                  key={entityToken(entity)}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleEntity(entity, false)}
                  title="Remove"
                >
                  {entity.type}
                  {entity.name ? `: ${entity.name}` : ` (${entity.id.slice(0, 8)}…)`} ✕
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save highlighting'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
