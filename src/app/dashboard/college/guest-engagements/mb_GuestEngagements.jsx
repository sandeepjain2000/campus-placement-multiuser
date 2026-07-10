'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { formatStatus } from '@/lib/utils';
import { Mic, Plus, Search, Filter } from 'lucide-react';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture',
};

export default function mb_GuestEngagements() {
  const { addToast } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
      if (!res.ok) throw new Error('Failed to update status');
      addToast(`Status updated to ${status}`, 'success');
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

  return (
    <>
      <MobileHeader 
        title="Guest Engagements" 
        action={
          <Link href="/dashboard/college/guest-engagements/add" className="btn btn-primary btn-sm">
            <Plus size={16} /> Add
          </Link>
        }
      />
      
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              className="form-input" 
              placeholder="Search engagements..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ paddingLeft: '2.5rem', borderRadius: '999px', background: 'var(--surface)' }} 
            />
          </div>
          <button 
            type="button" 
            className={`btn btn-outline ${showFilters ? 'btn-active' : ''}`} 
            onClick={() => setShowFilters(!showFilters)}
            style={{ padding: '0 0.75rem', borderRadius: '999px', background: showFilters ? 'var(--primary-50)' : 'var(--surface)' }}
          >
            <Filter size={16} style={{ color: showFilters ? 'var(--primary-600)' : 'inherit' }} />
          </button>
        </div>

        {showFilters && (
          <div className="card animate-fadeIn" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label className="text-xs text-secondary mb-1 block">Type</label>
              <select className="form-select form-select-sm" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                <option value="">All types</option>
                <option value="guest_lecture">{KIND_LABEL.guest_lecture}</option>
                <option value="guest_faculty">{KIND_LABEL.guest_faculty}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Status</label>
              <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: '12px' }} />)
          ) : filteredListings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Mic size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <div style={{ fontWeight: 600 }}>No engagements found</div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {listings.length === 0 ? 'Create your first guest engagement listing.' : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            filteredListings.map((L) => (
              <div key={L.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', paddingRight: '1rem' }}>{L.title}</div>
                  <span className={`badge badge-${L.status === 'published' ? 'green' : L.status === 'draft' ? 'amber' : 'gray'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                    {formatStatus(L.status)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Mic size={14} style={{ opacity: 0.7 }} />
                  <span style={{ fontWeight: 500 }}>{KIND_LABEL[L.kind] || L.kind}</span>
                </div>

                {L.summary && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {L.summary}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    Updated: {L.updated_at ? new Date(L.updated_at).toLocaleDateString() : '—'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {L.status !== 'published' && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(L.id, 'published')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                        Publish
                      </button>
                    )}
                    {L.status === 'published' && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus(L.id, 'closed')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--danger-600)' }}>
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </>
  );
}
