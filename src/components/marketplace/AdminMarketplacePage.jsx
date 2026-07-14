'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import {
  MARKETPLACE_BILLING_UNITS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_ORDER_STATUSES,
  formatMarketplacePriceInr,
} from '@/lib/marketplace';

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
      <div className="page-header">
        <div className="page-header-left">
          <h1>Marketplace</h1>
          <p>
            Catalog service providers (aptitude tests, assessments, training). Colleges and employers
            request purchases; you confirm fulfillment offline or by invoice.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadAll()} disabled={loading}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { id: 'providers', label: 'Providers' },
          { id: 'services', label: 'Services' },
          { id: 'orders', label: 'Purchase requests' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
      ) : null}

      {!loading && tab === 'providers' ? (
        <div className="grid grid-2" style={{ gap: '1.25rem', alignItems: 'start' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              {editingProviderId ? 'Edit provider' : 'Add provider'}
            </h3>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={providerForm.name}
                onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. CampusApt Prep"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={providerForm.category}
                onChange={(e) => setProviderForm((f) => ({ ...f, category: e.target.value }))}
              >
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tagline</label>
              <input
                className="form-input"
                value={providerForm.tagline}
                onChange={(e) => setProviderForm((f) => ({ ...f, tagline: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={providerForm.description}
                onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Website</label>
                <input
                  className="form-input"
                  value={providerForm.website}
                  onChange={(e) => setProviderForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact email</label>
                <input
                  className="form-input"
                  type="email"
                  value={providerForm.contactEmail}
                  onChange={(e) => setProviderForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={providerForm.active}
                onChange={(e) => setProviderForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active in catalog
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={saveProvider}>
                {saving ? 'Saving…' : editingProviderId ? 'Save provider' : 'Add provider'}
              </button>
              {editingProviderId ? (
                <button type="button" className="btn btn-secondary" onClick={resetProviderForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="card card-table-shell">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              Providers ({providers.length})
            </h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Category</th>
                    <th>Services</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-semibold">{p.name}</div>
                        {p.tagline ? <div className="text-xs text-tertiary">{p.tagline}</div> : null}
                      </td>
                      <td>{p.categoryLabel}</td>
                      <td className="font-mono">{p.serviceCount ?? 0}</td>
                      <td>
                        <span className={`badge badge-${p.active ? 'green' : 'gray'}`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => editProvider(p)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteProvider(p.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {providers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary">
                        No providers yet. Add an aptitude or assessment vendor to start the catalog.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'services' ? (
        <div className="grid grid-2" style={{ gap: '1.25rem', alignItems: 'start' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              {editingServiceId ? 'Edit service' : 'Add service'}
            </h3>
            <div className="form-group">
              <label className="form-label">Provider</label>
              <select
                className="form-input"
                value={serviceForm.providerId}
                onChange={(e) => setServiceForm((f) => ({ ...f, providerId: e.target.value }))}
              >
                <option value="">Select provider…</option>
                {providerOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={serviceForm.title}
                onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Batch Aptitude Assessment (300 seats)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={serviceForm.description}
                onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Price (INR)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1"
                  value={serviceForm.priceInr}
                  onChange={(e) => setServiceForm((f) => ({ ...f, priceInr: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Billing</label>
                <select
                  className="form-input"
                  value={serviceForm.billingUnit}
                  onChange={(e) => setServiceForm((f) => ({ ...f, billingUnit: e.target.value }))}
                >
                  {MARKETPLACE_BILLING_UNITS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={serviceForm.availableToCollege}
                  onChange={(e) => setServiceForm((f) => ({ ...f, availableToCollege: e.target.checked }))}
                />
                Colleges
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={serviceForm.availableToEmployer}
                  onChange={(e) => setServiceForm((f) => ({ ...f, availableToEmployer: e.target.checked }))}
                />
                Employers
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={serviceForm.published}
                  onChange={(e) => setServiceForm((f) => ({ ...f, published: e.target.checked }))}
                />
                Published
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={saveService}>
                {saving ? 'Saving…' : editingServiceId ? 'Save service' : 'Add service'}
              </button>
              {editingServiceId ? (
                <button type="button" className="btn btn-secondary" onClick={resetServiceForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="card card-table-shell">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              Services ({services.length})
            </h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Provider</th>
                    <th>Price</th>
                    <th>Audience</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="font-semibold">{s.title}</div>
                        <div className="text-xs text-tertiary">{s.billingLabel}</div>
                      </td>
                      <td>{s.providerName}</td>
                      <td className="font-mono">{formatMarketplacePriceInr(s.priceInr)}</td>
                      <td className="text-sm">
                        {[s.availableToCollege ? 'College' : null, s.availableToEmployer ? 'Employer' : null]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${s.published ? 'green' : 'gray'}`}>
                          {s.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => editService(s)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteService(s.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-secondary">
                        No services yet. Add priced offerings under a provider.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'orders' ? (
        <div className="card card-table-shell">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              Purchase requests ({orders.length})
            </h3>
            <select
              className="form-input"
              style={{ maxWidth: '14rem' }}
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {MARKETPLACE_ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Buyer</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="text-sm">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</td>
                    <td>
                      <div className="font-semibold">{o.buyerOrgName || '—'}</div>
                      <div className="text-xs text-tertiary">
                        {o.buyerRole === 'college_admin' ? 'College' : 'Employer'} · {o.buyerEmail}
                      </div>
                    </td>
                    <td>
                      <div>{o.serviceTitle}</div>
                      <div className="text-xs text-tertiary">{o.providerName}</div>
                    </td>
                    <td className="font-mono">
                      {o.priceLabel}
                      {o.quantity > 1 ? ` ×${o.quantity}` : ''}
                    </td>
                    <td>
                      <span className={`badge badge-${o.statusBadge}`}>{o.statusLabel}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {o.status === 'requested' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => updateOrderStatus(o.id, 'confirmed')}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => updateOrderStatus(o.id, 'cancelled')}
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}
                      {o.status === 'confirmed' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => updateOrderStatus(o.id, 'fulfilled')}
                        >
                          Mark fulfilled
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary">
                      No purchase requests in this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
