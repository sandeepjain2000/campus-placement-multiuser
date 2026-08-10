'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import AppPageHeader from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  MARKETPLACE_BILLING_UNITS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_ORDER_STATUSES,
  formatMarketplacePriceInr,
} from '@/lib/marketplace';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const EMPTY_PROVIDER = {
  name: '',
  category: 'aptitude_tests',
  tagline: '',
  description: '',
  website: '',
  contactEmail: '',
  contactPhone: '',
  active: true,
};

const EMPTY_SERVICE = {
  providerId: '',
  title: '',
  description: '',
  priceInr: '',
  billingUnit: 'one_time',
  availableToCollege: true,
  availableToEmployer: true,
  published: true,
  sortOrder: 0,
};

export default function AdminMarketplacePage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('providers');
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [providerForm, setProviderForm] = useState(EMPTY_PROVIDER);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, oRes] = await Promise.all([
        fetch('/api/admin/marketplace/providers'),
        fetch('/api/admin/marketplace/services'),
        fetch(
          orderStatusFilter
            ? `/api/admin/marketplace/orders?status=${encodeURIComponent(orderStatusFilter)}`
            : '/api/admin/marketplace/orders',
        ),
      ]);
      const [pJson, sJson, oJson] = await Promise.all([pRes.json(), sRes.json(), oRes.json()]);
      if (!pRes.ok) throw new Error(pJson?.error || 'Failed to load providers');
      if (!sRes.ok) throw new Error(sJson?.error || 'Failed to load services');
      if (!oRes.ok) throw new Error(oJson?.error || 'Failed to load orders');
      setProviders(pJson.providers || []);
      setServices(sJson.services || []);
      setOrders(oJson.orders || []);
    } catch (e) {
      addToast(e.message || 'Failed to load marketplace', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, orderStatusFilter]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const providerOptions = useMemo(
    () => providers.map((p) => ({ value: p.id, label: p.name })),
    [providers],
  );

  const resetProviderForm = () => {
    setProviderForm(EMPTY_PROVIDER);
    setEditingProviderId(null);
  };

  const resetServiceForm = () => {
    setServiceForm({
      ...EMPTY_SERVICE,
      providerId: providers[0]?.id || '',
    });
    setEditingServiceId(null);
  };

  const saveProvider = async () => {
    setSaving(true);
    try {
      const url = editingProviderId
        ? `/api/admin/marketplace/providers/${editingProviderId}`
        : '/api/admin/marketplace/providers';
      const res = await fetch(url, {
        method: editingProviderId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast(editingProviderId ? 'Provider updated' : 'Provider added', 'success');
      resetProviderForm();
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Failed to save provider', 'error');
    } finally {
      setSaving(false);
    }
  };

  const editProvider = (p) => {
    setEditingProviderId(p.id);
    setProviderForm({
      name: p.name,
      category: p.category,
      tagline: p.tagline,
      description: p.description,
      website: p.website,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone,
      active: p.active,
    });
    setTab('providers');
  };

  const deleteProvider = async (id) => {
    if (!window.confirm('Delete this provider and its unpublished catalog cleanup?')) return;
    try {
      const res = await fetch(`/api/admin/marketplace/providers/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      addToast('Provider deleted', 'success');
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Failed to delete provider', 'error');
    }
  };

  const saveService = async () => {
    setSaving(true);
    try {
      const payload = {
        ...serviceForm,
        priceInr: Number(serviceForm.priceInr || 0),
      };
      const url = editingServiceId
        ? `/api/admin/marketplace/services/${editingServiceId}`
        : '/api/admin/marketplace/services';
      const res = await fetch(url, {
        method: editingServiceId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast(editingServiceId ? 'Service updated' : 'Service added', 'success');
      resetServiceForm();
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Failed to save service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const editService = (s) => {
    setEditingServiceId(s.id);
    setServiceForm({
      providerId: s.providerId,
      title: s.title,
      description: s.description,
      priceInr: String(s.priceInr ?? ''),
      billingUnit: s.billingUnit,
      availableToCollege: s.availableToCollege,
      availableToEmployer: s.availableToEmployer,
      published: s.published,
      sortOrder: s.sortOrder,
    });
    setTab('services');
  };

  const deleteService = async (id) => {
    if (!window.confirm('Delete this service from the catalog?')) return;
    try {
      const res = await fetch(`/api/admin/marketplace/services/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      addToast('Service deleted', 'success');
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Failed to delete service', 'error');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(`/api/admin/marketplace/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      addToast(`Order marked ${status}`, 'success');
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Failed to update order', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      <AppPageHeader
        title="Marketplace"
        description="Catalog service providers, manage priced services, and confirm purchase fulfillment."
        actions={<Button type="button" variant="outline" size="sm" onClick={() => loadAll()} disabled={loading}>Refresh</Button>}
      />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { id: 'providers', label: 'Providers' },
          { id: 'services', label: 'Services' },
          { id: 'orders', label: 'Purchase requests' },
        ].map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
      ) : null}

      {!loading && tab === 'providers' ? (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{editingProviderId ? 'Edit provider' : 'Add provider'}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="marketplace-provider-name">Name</FieldLabel>
              <Input
                id="marketplace-provider-name"
                value={providerForm.name}
                onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. CampusApt Prep"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="marketplace-provider-category">Category</FieldLabel>
              <AdminFilterSelect
                id="marketplace-provider-category"
                className="w-full"
                value={providerForm.category}
                emptyMapsToAll={false}
                onValueChange={(category) => setProviderForm((f) => ({ ...f, category }))}
                items={MARKETPLACE_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="marketplace-provider-tagline">Tagline</FieldLabel>
              <Input
                id="marketplace-provider-tagline"
                value={providerForm.tagline}
                onChange={(e) => setProviderForm((f) => ({ ...f, tagline: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="marketplace-provider-description">Description</FieldLabel>
              <Textarea
                id="marketplace-provider-description"
                rows={3}
                value={providerForm.description}
                onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="marketplace-provider-website">Website</FieldLabel>
                <Input
                  id="marketplace-provider-website"
                  value={providerForm.website}
                  onChange={(e) => setProviderForm((f) => ({ ...f, website: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="marketplace-provider-email">Contact email</FieldLabel>
                <Input
                  id="marketplace-provider-email"
                  type="email"
                  value={providerForm.contactEmail}
                  onChange={(e) => setProviderForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </Field>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Checkbox
                checked={providerForm.active}
                onCheckedChange={(v) => setProviderForm((f) => ({ ...f, active: !!v }))}
              />
              Active in catalog
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" disabled={saving} onClick={saveProvider}>
                {saving ? 'Saving…' : editingProviderId ? 'Save provider' : 'Add provider'}
              </Button>
              {editingProviderId ? (
                <Button type="button" variant="outline" onClick={resetProviderForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Providers ({providers.length})</CardTitle></CardHeader>
            <CardContent className="px-0">
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-semibold">{p.name}</div>
                        {p.tagline ? <div className="text-xs text-tertiary">{p.tagline}</div> : null}
                      </TableCell>
                      <TableCell>{p.categoryLabel}</TableCell>
                      <TableCell className="font-mono">{p.serviceCount ?? 0}</TableCell>
                      <TableCell>
                        <StatusBadge tone={p.active ? 'green' : 'gray'}>{p.active ? 'Active' : 'Inactive'}</StatusBadge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button type="button" variant="ghost" size="sm" onClick={() => editProvider(p)}>
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => deleteProvider(p.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {providers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-center">
                        No providers yet. Add an aptitude or assessment vendor to start the catalog.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && tab === 'services' ? (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{editingServiceId ? 'Edit service' : 'Add service'}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="marketplace-service-provider">Provider</FieldLabel>
              <AdminFilterSelect
                id="marketplace-service-provider"
                className="w-full"
                value={serviceForm.providerId}
                emptyMapsToAll={false}
                onValueChange={(providerId) => setServiceForm((f) => ({ ...f, providerId }))}
                items={[
                  { label: 'Select provider…', value: '' },
                  ...providerOptions.map((p) => ({ label: p.label, value: p.value })),
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="marketplace-service-title">Title</FieldLabel>
              <Input
                id="marketplace-service-title"
                value={serviceForm.title}
                onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Batch Aptitude Assessment (300 seats)"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="marketplace-service-description">Description</FieldLabel>
              <Textarea
                id="marketplace-service-description"
                rows={3}
                value={serviceForm.description}
                onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="marketplace-service-price">Price (INR)</FieldLabel>
                <Input
                  id="marketplace-service-price"
                  type="number"
                  min="0"
                  step="1"
                  value={serviceForm.priceInr}
                  onChange={(e) => setServiceForm((f) => ({ ...f, priceInr: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="marketplace-service-billing">Billing</FieldLabel>
                <AdminFilterSelect
                  id="marketplace-service-billing"
                  className="w-full"
                  value={serviceForm.billingUnit}
                  emptyMapsToAll={false}
                  onValueChange={(billingUnit) => setServiceForm((f) => ({ ...f, billingUnit }))}
                  items={MARKETPLACE_BILLING_UNITS.map((b) => ({ label: b.label, value: b.value }))}
                />
              </Field>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Checkbox
                  checked={serviceForm.availableToCollege}
                  onCheckedChange={(v) => setServiceForm((f) => ({ ...f, availableToCollege: !!v }))}
                />
                Colleges
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Checkbox
                  checked={serviceForm.availableToEmployer}
                  onCheckedChange={(v) => setServiceForm((f) => ({ ...f, availableToEmployer: !!v }))}
                />
                Employers
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Checkbox
                  checked={serviceForm.published}
                  onCheckedChange={(v) => setServiceForm((f) => ({ ...f, published: !!v }))}
                />
                Published
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" disabled={saving} onClick={saveService}>
                {saving ? 'Saving…' : editingServiceId ? 'Save service' : 'Add service'}
              </Button>
              {editingServiceId ? (
                <Button type="button" variant="outline" onClick={resetServiceForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Services ({services.length})</CardTitle></CardHeader>
            <CardContent className="px-0">
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-semibold">{s.title}</div>
                        <div className="text-xs text-tertiary">{s.billingLabel}</div>
                      </TableCell>
                      <TableCell>{s.providerName}</TableCell>
                      <TableCell className="font-mono">{formatMarketplacePriceInr(s.priceInr)}</TableCell>
                      <TableCell>
                        {[s.availableToCollege ? 'College' : null, s.availableToEmployer ? 'Employer' : null]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={s.published ? 'green' : 'gray'}>{s.published ? 'Published' : 'Draft'}</StatusBadge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button type="button" variant="ghost" size="sm" onClick={() => editService(s)}>
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => deleteService(s.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-center">
                        No services yet. Add priced offerings under a provider.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && tab === 'orders' ? (
        <Card>
          <CardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <h3 className="text-base font-medium">
              Purchase requests ({orders.length})
            </h3>
            <AdminFilterSelect
              className="h-9 max-w-[14rem]"
              value={orderStatusFilter}
              onValueChange={setOrderStatusFilter}
              items={[
                { label: 'All statuses', value: 'all' },
                ...MARKETPLACE_ORDER_STATUSES.map((s) => ({ label: s.label, value: s.value })),
              ]}
            />
          </div>
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      <div className="font-semibold">{o.buyerOrgName || '—'}</div>
                      <div className="text-xs text-tertiary">
                        {o.buyerRole === 'college_admin' ? 'College' : 'Employer'} · {o.buyerEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{o.serviceTitle}</div>
                      <div className="text-xs text-tertiary">{o.providerName}</div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {o.priceLabel}
                      {o.quantity > 1 ? ` ×${o.quantity}` : ''}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={o.statusBadge}>{o.statusLabel}</StatusBadge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {o.status === 'requested' ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => updateOrderStatus(o.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => updateOrderStatus(o.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}
                      {o.status === 'confirmed' ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => updateOrderStatus(o.id, 'fulfilled')}
                        >
                          Mark fulfilled
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground text-center">
                      No purchase requests in this filter.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
