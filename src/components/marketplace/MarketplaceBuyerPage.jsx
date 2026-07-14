'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { marketplaceCategoryLabel } from '@/lib/marketplace';

/**
 * Shared browse + purchase UI for college admins and employers.
 * @param {{ audienceLabel: string }} props
 */
export default function MarketplaceBuyerPage({ audienceLabel = 'your organization' }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [requestingId, setRequestingId] = useState(null);
  const [notesByService, setNotesByService] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, oRes] = await Promise.all([
        fetch('/api/marketplace/catalog'),
        fetch('/api/marketplace/orders'),
      ]);
      const [cJson, oJson] = await Promise.all([cRes.json(), oRes.json()]);
      if (!cRes.ok) throw new Error(cJson?.error || 'Failed to load catalog');
      if (!oRes.ok) throw new Error(oJson?.error || 'Failed to load orders');
      setServices(cJson.services || []);
      setOrders(oJson.orders || []);
    } catch (e) {
      addToast(e.message || 'Failed to load marketplace', 'error');
      setServices([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayServices,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(services, {
    getSearchText: (s) =>
      [s.title, s.providerName, s.providerCategoryLabel, s.description].filter(Boolean).join(' '),
    filterFn: (row, f) => (!f ? true : row.providerCategory === f),
    sortOptions: [
      ...COMMON_SORT_OPTIONS,
      {
        value: 'price_asc',
        label: 'Price (low → high)',
        compare: (a, b) => Number(a.priceInr || 0) - Number(b.priceInr || 0),
      },
      {
        value: 'price_desc',
        label: 'Price (high → low)',
        compare: (a, b) => Number(b.priceInr || 0) - Number(a.priceInr || 0),
      },
    ],
    defaultSort: 'name_asc',
  });

  const categoryFilters = useMemo(() => {
    const vals = [...new Set(services.map((s) => s.providerCategory).filter(Boolean))];
    return [
      { value: '', label: 'All categories' },
      ...vals.map((v) => ({ value: v, label: marketplaceCategoryLabel(v) })),
    ];
  }, [services]);

  const requestPurchase = async (service) => {
    setRequestingId(service.id);
    try {
      const res = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          quantity: 1,
          buyerNotes: notesByService[service.id] || '',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Purchase request failed');
      addToast('Purchase request sent. Platform admin will confirm and share next steps.', 'success');
      setNotesByService((m) => ({ ...m, [service.id]: '' }));
      await load();
    } catch (e) {
      addToast(e.message || 'Failed to request purchase', 'error');
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Marketplace</h1>
          <p>
            Browse vetted providers — aptitude tests, assessments, and related services — and request a
            purchase for {audienceLabel}. Payment and scheduling are coordinated after confirmation.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />
      ) : null}

      {!loading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search service or provider…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={categoryFilters}
          filterLabel="Category"
          sort={sort}
          onSortChange={setSort}
          sortOptions={[
            { value: 'name_asc', label: 'Name (A → Z)' },
            { value: 'name_desc', label: 'Name (Z → A)' },
            { value: 'price_asc', label: 'Price (low → high)' },
            { value: 'price_desc', label: 'Price (high → low)' },
          ]}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <div className="card card-table-shell" style={{ marginBottom: '1.25rem' }}>
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Catalog
        </h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Provider</th>
                <th>Category</th>
                <th>Price</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!loading && displayServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-secondary">
                    {totalCount === 0
                      ? 'No published services are available yet. Ask the platform admin to add providers.'
                      : 'No services match your filters.'}
                  </td>
                </tr>
              ) : null}
              {displayServices.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-semibold">{s.title}</div>
                    {s.description ? (
                      <div className="text-sm text-secondary" style={{ maxWidth: '28rem' }}>
                        {s.description}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div>{s.providerName}</div>
                    {s.providerTagline ? (
                      <div className="text-xs text-tertiary">{s.providerTagline}</div>
                    ) : null}
                  </td>
                  <td>{s.providerCategoryLabel}</td>
                  <td>
                    <div className="font-mono">{s.priceLabel}</div>
                    <div className="text-xs text-tertiary">{s.billingLabel}</div>
                  </td>
                  <td style={{ minWidth: '12rem' }}>
                    <input
                      className="form-input"
                      placeholder="Optional note"
                      value={notesByService[s.id] || ''}
                      onChange={(e) =>
                        setNotesByService((m) => ({ ...m, [s.id]: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={requestingId === s.id}
                      onClick={() => requestPurchase(s)}
                    >
                      {requestingId === s.id ? 'Requesting…' : 'Request purchase'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-table-shell">
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Your purchase requests
        </h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Service</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="text-sm">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</td>
                  <td>{o.serviceTitle}</td>
                  <td>{o.providerName}</td>
                  <td className="font-mono">{o.priceLabel}</td>
                  <td>
                    <span className={`badge badge-${o.statusBadge}`}>{o.statusLabel}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-secondary">
                    No requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
