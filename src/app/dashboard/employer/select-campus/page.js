'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import EntityLogo from '@/components/EntityLogo';
import { Search, Plus, ChevronDown, X, Eye, Trash2, Building2 } from 'lucide-react';
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

function CollegeCombobox({ options, selectedId, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const selected = options.find(o => o.id === selectedId);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtered = useMemo(() => {
    if (!q) return options.slice(0, 60);
    const lq = q.toLowerCase();
    return options.filter(o => (o.name||'').toLowerCase().includes(lq) || (o.city||'').toLowerCase().includes(lq)).slice(0, 60);
  }, [options, q]);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 240, flex: 1 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.65rem 1rem', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)',
          cursor: 'pointer', fontSize: '0.95rem', color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <Search size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selected ? 500 : 400 }}>
          {selected ? selected.name : placeholder}
        </span>
        {selectedId ? (
          <div 
            onClick={e => { e.stopPropagation(); onChange(''); }}
            style={{ padding: '0.25rem', background: 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            <X size={14} style={{ flexShrink: 0 }} />
          </div>
        ) : (
          <ChevronDown size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
        )}
      </div>
      {open && (
        <div className="animate-fadeIn" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)',
          maxHeight: 300, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Type to search colleges..."
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.95rem', background: 'transparent', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div
              onClick={() => { onChange(''); setOpen(false); setQ(''); }}
              style={{ padding: '0.75rem 1rem', fontSize: '0.95rem', color: 'var(--text-tertiary)', cursor: 'pointer', fontWeight: 500 }}
            >All campuses</div>
            {filtered.map(o => (
              <div key={o.id}
                onClick={() => { onChange(o.id); setOpen(false); setQ(''); }}
                style={{
                  padding: '0.75rem 1rem', fontSize: '0.95rem', cursor: 'pointer',
                  background: o.id === selectedId ? 'var(--primary-50)' : 'transparent',
                  color: 'var(--text-primary)',
                  display: 'flex', flexDirection: 'column', gap: '0.1rem'
                }}
                onMouseEnter={e => { if (o.id !== selectedId) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={e => { if (o.id !== selectedId) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontWeight: o.id === selectedId ? 600 : 500, color: o.id === selectedId ? 'var(--primary-700)' : 'var(--text-primary)' }}>{o.name}</div>
                {o.city && <div style={{ fontSize: '0.8rem', color: o.id === selectedId ? 'var(--primary-600)' : 'var(--text-tertiary)' }}>{o.city}</div>}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.95rem' }}>No results found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SelectCampusPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/campuses', fetcher);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('approved');
  const [sortOption, setSortOption] = useState('status');
  const [focusCampusId, setFocusCampusId] = useState('');
  const [requesting, setRequesting] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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
    <div className="animate-fadeIn select-campus-page" style={{ paddingBottom: '2rem', width: '100%' }}>
      {/* Toast */}
      {toast && (
        <div className="animate-slideUp" style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.95rem',
          background: toast.type === 'error' ? 'var(--danger-50)' : 'var(--success-50)',
          border: `1px solid ${toast.type === 'error' ? 'var(--danger-200)' : 'var(--success-200)'}`,
          color: toast.type === 'error' ? 'var(--danger-700)' : 'var(--success-700)',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {toast.type === 'error' ? <X size={18} /> : <Eye size={18} />} {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div
        className="page-header"
        style={{
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={22} aria-hidden /> Campus Partnerships
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isLoading ? 'Loading campus directory…' : `${counts.total} colleges · ${counts.approved} approved · ${counts.pending} pending`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => router.push('/dashboard/employer/select-campus/create')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
        >
          <Plus size={16} aria-hidden /> Request Tie-up
        </button>
      </div>

      {/* Switch campus help */}
      {!isLoading && !error && (
        <div
          className="card"
          style={{
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            border: '1px solid var(--primary-200)',
            background: 'var(--primary-50)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: 'var(--primary-900)', lineHeight: 1.5 }}>
            <strong>All campuses:</strong> employer login includes every approved partnership — no campus switch needed.
            The <strong>Use campus</strong> action is kept for reference but is disabled.
          </div>
          {counts.approved > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {colleges
                .filter((c) => normalizeApprovalStatus(c.approval_status) === 'approved')
                .slice(0, 5)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled
                    title={EMPLOYER_USE_CAMPUS_DISABLED_TITLE}
                  >
                    Use {c.name?.split('(')[0]?.trim().slice(0, 28) || 'campus'}
                  </button>
                ))}
            </div>
          )}
          {counts.approved === 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => router.push('/data-entry')}>
              Demo data → Ensure IIT Madras tie-up
            </button>
          )}
        </div>
      )}

      {/* Pill-based Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {statusPills.map((t) => {
          const isActive = filterStatus === t.key;
          let count = '';
          if (!isLoading) {
            if (t.key === 'approved') count = counts.approved;
            if (t.key === 'pending') count = counts.pending;
            if (t.key === 'not_requested') count = counts.available;
            if (t.key === 'all') count = counts.total;
          }
          return (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'var(--primary-600)' : 'var(--bg-secondary)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 10px rgba(79, 70, 229, 0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {formatFilterBadgeLabelParen(t.label, count !== '' ? count : 0)}
            </button>
          )
        })}
      </div>

      {/* Search and Sort Toolbar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border-default)' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text" className="form-input" placeholder="Search by name or city…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.75rem', paddingRight: '1rem', paddingTop: '0.65rem', paddingBottom: '0.65rem', fontSize: '0.95rem' }}
          />
        </div>

        <CollegeCombobox options={campusOptions} selectedId={focusCampusId} onChange={setFocusCampusId} placeholder="Focus on specific campus…" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sort By:</span>
          <select className="form-select" style={{ width: 'auto', padding: '0.65rem 2rem 0.65rem 1rem', fontSize: '0.95rem', fontWeight: 500 }} value={sortOption} onChange={e => setSortOption(e.target.value)}>
            <option value="status">Approval Status</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="students_desc">Student Count (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading && <div className="skeleton skeleton-card" style={{ height: 400 }} />}
      {error && <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger-600)', fontWeight: 600 }}>{error.message || 'Failed to load colleges.'}</div>}

      {!isLoading && !error && (
        <div className="card card-table-shell select-campus-table-shell" style={{ border: '1px solid var(--border-default)' }}>
          <div
            style={{
              margin: 0,
              padding: '0.65rem 1rem',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span className="text-sm text-secondary">
              Showing <strong>{displayRows.length}</strong> campus{displayRows.length === 1 ? '' : 'es'} · scroll horizontally for all columns (Actions on the right)
            </span>
          </div>
          <div className="table-container select-campus-table-scroll" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table select-campus-table">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ width: 40, paddingLeft: '1.5rem' }}>#</th>
                  <th>College Name</th>
                  <th className="select-campus-table__optional">Location</th>
                  <th className="select-campus-table__optional">Contact Details</th>
                  <th style={{ textAlign: 'right' }}>Students</th>
                  <th className="select-campus-table__optional" style={{ textAlign: 'right' }}>Placement</th>
                  <th>Status</th>
                  <th className="select-campus-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-tertiary)' }}>
                      <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No colleges found</div>
                      <div>Try adjusting your filters or search query.</div>
                      <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => { setSearch(''); setFilterStatus('all'); setFocusCampusId(''); }}>
                        Clear Filters
                      </button>
                    </td>
                  </tr>
                ) : displayRows.map((c, i) => {
                  const status = normalizeApprovalStatus(c.approval_status);
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.null;
                  const placementPct = c.total_students > 0 ? Math.round((Number(c.placed_students||0) / Number(c.total_students)) * 100) : null;
                  const isApproved = status === 'approved';
                  const isPending = status === 'pending';
                  const showRequest = canRequestTieUp(c.approval_status);

                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', paddingLeft: '1.5rem' }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <EntityLogo name={c.name} website={c.website} size="md" shape="rounded" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.name}</div>
                            {c.website && (
                              <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer"
                                style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}
                                className="hover:text-primary-600"
                              >
                                {c.website.replace(/^https?:\/\//, '')}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }} className="select-campus-table__optional">
                        {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }} className="select-campus-table__optional">
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
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{c.total_students ?? 0}</td>
                      <td style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 500, color: placementPct != null && placementPct >= 70 ? 'var(--success-600)' : 'var(--text-primary)' }} className="select-campus-table__optional">
                        {placementPct != null ? `${placementPct}%` : '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.35rem 0.75rem', borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }}></div>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="select-campus-table__actions">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'nowrap' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.4rem', border: '1px solid var(--border-default)', color: 'var(--primary-600)' }}
                            onClick={() => router.push(`/dashboard/employer/select-campus/${c.id}`)}
                            title={`View details for ${c.name}`}
                          >
                            <Eye size={16} />
                          </button>
                          {isApproved && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled
                                title={EMPLOYER_USE_CAMPUS_DISABLED_TITLE}
                              >
                                Use campus
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '0.4rem', border: '1px solid var(--border-default)', color: 'var(--danger-600)', opacity: TIE_UP_REVOKE_ENABLED ? 1 : 0.45 }}
                                onClick={() => TIE_UP_REVOKE_ENABLED && setRevokeTarget(c)}
                                disabled={!TIE_UP_REVOKE_ENABLED || revoking === c.id}
                                title={TIE_UP_REVOKE_ENABLED ? `Revoke tie-up with ${c.name}` : TIE_UP_REVOKE_DISABLED_TITLE}
                              >
                                {revoking === c.id ? '…' : <Trash2 size={16} />}
                              </button>
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
                          {isPending && <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 600, padding: '0.4rem 0.5rem' }}>Awaiting Approval</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
