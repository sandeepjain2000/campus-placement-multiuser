'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { formatStatus } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { Mic, Plus } from 'lucide-react';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

const CSV_HEADERS = [
  'ID',
  'Type',
  'Title',
  'Summary',
  'Requirements',
  'Preferred timing',
  'Status',
  'Created',
  'Updated',
];

function listingToCsvRow(L) {
  return [
    L.id,
    KIND_LABEL[L.kind] || L.kind,
    L.title,
    L.summary || '',
    L.requirements || '',
    L.time_hint || '',
    L.status,
    L.created_at ? new Date(L.created_at).toISOString() : '',
    L.updated_at ? new Date(L.updated_at).toISOString() : '',
  ];
}

export default function CollegeGuestEngagementsPage() {
  const { addToast } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/college/engagement-listings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setListings(Array.isArray(json.listings) ? json.listings : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/college/engagement-listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  const filteredListings = useMemo(
    () =>
      listings.filter((L) => {
        if (kindFilter && L.kind !== kindFilter) return false;
        if (statusFilter && L.status !== statusFilter) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          String(L.title || '').toLowerCase().includes(q) ||
          String(L.summary || '').toLowerCase().includes(q) ||
          String(L.requirements || '').toLowerCase().includes(q)
        );
      }),
    [listings, kindFilter, statusFilter, search],
  );

  const getEngagementsCsv = useCallback(
    (scope) => {
      const list = scope === 'current' ? filteredListings : listings;
      return {
        headers: [...CSV_HEADERS],
        rows: list.map(listingToCsvRow),
      };
    },
    [filteredListings, listings],
  );

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span
            style={{
              display: 'flex',
              padding: '0.5rem',
              background: 'var(--primary-50)',
              borderRadius: '10px',
              color: 'var(--primary-600)',
            }}
            aria-hidden
          >
            <Mic size={24} />
          </span>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '0 0 0.35rem',
                letterSpacing: '-0.02em',
              }}
            >
              Guest faculty & lectures
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              {listings.length} listing{listings.length === 1 ? '' : 's'}
              {' · '}
              Published posts are visible to employer partners.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ExportCsvSplitButton
            filenameBase="guest_engagements"
            currentCount={filteredListings.length}
            fullCount={listings.length}
            getRows={getEngagementsCsv}
          />
          <Link
            href="/dashboard/college/guest-engagements/add"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add
          </Link>
          <Link href="/dashboard/college/overview" className="btn btn-ghost btn-sm">
            Overview
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: '1 1 220px', minWidth: 180 }}
            placeholder="Filter by title, summary, requirements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 200 }}
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="guest_lecture">{KIND_LABEL.guest_lecture}</option>
            <option value="guest_faculty">{KIND_LABEL.guest_faculty}</option>
          </select>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-secondary">
                  Loading…
                </td>
              </tr>
            ) : (
              filteredListings.map((L) => (
                <tr key={L.id}>
                  <td className="font-semibold">{L.title}</td>
                  <td>{KIND_LABEL[L.kind] || L.kind}</td>
                  <td>
                    <span
                      className={`badge badge-${L.status === 'published' ? 'green' : L.status === 'draft' ? 'amber' : 'gray'}`}
                    >
                      {formatStatus(L.status)}
                    </span>
                  </td>
                  <td className="text-sm text-secondary">
                    {L.updated_at ? new Date(L.updated_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {L.status !== 'published' ? (
                      <button type="button" className="btn btn-success btn-sm" onClick={() => setStatus(L.id, 'published')}>
                        Publish
                      </button>
                    ) : null}
                    {L.status === 'published' ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 8 }}
                        onClick={() => setStatus(L.id, 'closed')}
                      >
                        Close
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
            {!loading && filteredListings.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-secondary">
                  {listings.length === 0 ? (
                    <>
                      No listings yet.{' '}
                      <Link href="/dashboard/college/guest-engagements/add">Add your first engagement</Link>.
                    </>
                  ) : (
                    'No listings match your filters.'
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
