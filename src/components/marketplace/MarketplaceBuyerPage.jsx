'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import DataTableToolbar from '@/components/DataTableToolbar';
import AppPageHeader from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    <div className="animate-fadeIn flex flex-col gap-4">
      <AppPageHeader
        title="Marketplace"
        description={`Browse vetted providers and request a purchase for ${audienceLabel}. Payment and scheduling are coordinated after confirmation.`}
        actions={<Button type="button" variant="outline" size="sm" onClick={() => load()} disabled={loading}>Refresh</Button>}
      />

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
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

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-border border-b px-4 py-4">
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground h-12 pl-4">Service</TableHead>
                <TableHead className="text-muted-foreground">Provider</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Price</TableHead>
                <TableHead className="text-muted-foreground min-w-48">Notes</TableHead>
                <TableHead className="text-muted-foreground pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && displayServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    {totalCount === 0
                      ? 'No published services are available yet. Ask the platform admin to add providers.'
                      : 'No services match your filters.'}
                  </TableCell>
                </TableRow>
              ) : null}
              {displayServices.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-md whitespace-normal pl-4 align-top">
                    <div className="text-foreground font-medium">{s.title}</div>
                    {s.description ? (
                      <div className="text-muted-foreground mt-1 text-sm leading-snug">{s.description}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal align-top">
                    <div className="font-medium">{s.providerName}</div>
                    {s.providerTagline ? (
                      <div className="text-muted-foreground mt-0.5 text-xs">{s.providerTagline}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">{s.providerCategoryLabel}</TableCell>
                  <TableCell className="align-top">
                    <div className="font-mono font-medium">{s.priceLabel}</div>
                    <div className="text-muted-foreground text-xs">{s.billingLabel}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      className="min-w-[10rem]"
                      placeholder="Optional note"
                      value={notesByService[s.id] || ''}
                      onChange={(e) =>
                        setNotesByService((m) => ({ ...m, [s.id]: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell className="pr-4 align-top text-right">
                    <Button
                      type="button"
                      size="sm"
                      className="whitespace-nowrap"
                      disabled={requestingId === s.id}
                      onClick={() => requestPurchase(s)}
                    >
                      {requestingId === s.id ? 'Requesting…' : 'Request purchase'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-border border-b px-4 py-4">
          <CardTitle>Your purchase requests</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground h-12 pl-4">Requested</TableHead>
                <TableHead className="text-muted-foreground">Service</TableHead>
                <TableHead className="text-muted-foreground">Provider</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-4">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</TableCell>
                  <TableCell>{o.serviceTitle}</TableCell>
                  <TableCell>{o.providerName}</TableCell>
                  <TableCell className="font-mono">{o.priceLabel}</TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge tone={o.statusBadge}>{o.statusLabel}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    No requests yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
