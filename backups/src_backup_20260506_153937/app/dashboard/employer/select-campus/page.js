'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import EntityLogo from '@/components/EntityLogo';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  if (!data.colleges || !Array.isArray(data.colleges)) {
    throw new Error(data.error || 'Invalid response');
  }
  return data;
};

const STATUS_CONFIG = {
  approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
  pending: { label: 'Pending', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⏳' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '❌' },
  blacklisted: { label: 'Blacklisted', color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca', icon: '🚫' },
  null: { label: 'Not requested', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: '➕' },
};

/** Normalize DB / API quirks so actions render correctly */
function normalizeApprovalStatus(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (['approved', 'pending', 'rejected', 'blacklisted'].includes(s)) return s;
  return null;
}

function canRequestTieUp(status) {
  const s = normalizeApprovalStatus(status);
  return s === null || s === 'rejected' || s === 'blacklisted';
}

function statusRank(s) {
  const n = normalizeApprovalStatus(s);
  if (n === 'approved') return 0;
  if (n === 'pending') return 1;
  if (n == null) return 2;
  return 3;
}

function sortColleges(list) {
  return [...list].sort((a, b) => {
    const d = statusRank(a.approval_status) - statusRank(b.approval_status);
    if (d !== 0) return d;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export default function SelectCampusPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/campuses', fetcher);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [focusCampusId, setFocusCampusId] = useState('');
  const [newRequestCollegeId, setNewRequestCollegeId] = useState('');
  const [requesting, setRequesting] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const colleges = data?.colleges ?? [];

  const handleSelectCampus = (college) => {
    if (normalizeApprovalStatus(college.approval_status) !== 'approved') return;
    sessionStorage.setItem(
      'activeCampus',
      JSON.stringify({
        id: college.id,
        name: college.name,
        slug: college.slug,
        city: college.city,
        state: college.state,
      }),
    );
    try {
      window.dispatchEvent(new Event('placementhub-active-campus'));
    } catch {
      /* ignore */
    }
    router.replace('/dashboard/employer');
  };

  const handleRequestAccess = async (college) => {
    setRequesting(college.id);
    try {
      const res = await fetch('/api/employer/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeId: college.id }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.alreadyPending) {
          showToast(json.message || 'Already pending', 'error');
        } else {
          showToast(json.message || `Tie-up requested for ${college.name}`);
        }
        mutate();
        setNewRequestCollegeId('');
      } else {
        showToast(json.error || 'Request failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setRequesting(null);
    }
  };

  const handleRevokeAccess = async (college) => {
    if (!confirm(`Cancel your partnership with ${college.name}?`)) return;
    setRevoking(college.id);
    try {
      const res = await fetch('/api/college/employers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_tenant_id: college.id }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Partnership with ${college.name} cancelled`);
        const active = JSON.parse(sessionStorage.getItem('activeCampus') || '{}');
        if (active.id === college.id) {
          sessionStorage.removeItem('activeCampus');
        }
        mutate();
      } else {
        showToast(json.error || 'Failed to cancel partnership', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const states = useMemo(
    () => [...new Set(colleges.map((c) => c.state).filter(Boolean))].sort(),
    [colleges],
  );

  const campusOptions = useMemo(
    () => [...colleges].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [colleges],
  );

  const filtered = useMemo(() => {
    return colleges.filter((c) => {
      const matchSearch =
        !search ||
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.city || '').toLowerCase().includes(search.toLowerCase());
      const matchState = filterState === 'all' || c.state === filterState;
      return matchSearch && matchState;
    });
  }, [colleges, search, filterState]);

  const selectedForNewRequest = useMemo(
    () => (newRequestCollegeId ? colleges.find((c) => c.id === newRequestCollegeId) : null),
    [colleges, newRequestCollegeId],
  );

  const { rows: displayRows, outsideFilters } = useMemo(() => {
    if (!focusCampusId) {
      return { rows: sortColleges(filtered), outsideFilters: false };
    }
    const inFilter = filtered.filter((c) => c.id === focusCampusId);
    if (inFilter.length > 0) {
      return { rows: sortColleges(inFilter), outsideFilters: false };
    }
    const fromAll = colleges.filter((c) => c.id === focusCampusId);
    return { rows: sortColleges(fromAll), outsideFilters: fromAll.length > 0 };
  }, [colleges, filtered, focusCampusId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            padding: '0.875rem 1.25rem',
            background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: toast.type === 'error' ? '#dc2626' : '#16a34a',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#fff',
              }}
            >
              🏫
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Campus Partnerships</h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Welcome, {session?.user?.tenantName || session?.user?.name}.{' '}
                <strong>Only your company starts a tie-up:</strong> request below; the college approves or declines.
                After approval, open a campus to work in. Data is from your live directory.
              </p>
            </div>
          </div>
        </div>

        {!isLoading && !error && (
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Colleges in directory', value: colleges.length, color: 'var(--primary-500)' },
              {
                label: 'Approved',
                value: colleges.filter((c) => normalizeApprovalStatus(c.approval_status) === 'approved').length,
                color: '#16a34a',
              },
              {
                label: 'Pending',
                value: colleges.filter((c) => normalizeApprovalStatus(c.approval_status) === 'pending').length,
                color: '#d97706',
              },
              {
                label: 'Not requested',
                value: colleges.filter((c) => normalizeApprovalStatus(c.approval_status) == null).length,
                color: 'var(--text-tertiary)',
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.1rem',
                }}
              >
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && colleges.length > 0 && (
          <div
            className="card"
            style={{
              marginBottom: '1.25rem',
              padding: '1rem 1.25rem',
              border: '1px solid var(--primary-200)',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Create tie-up request</div>
            <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem' }}>
              Choose a college and send a request. The college admin will approve or decline. (Starts at zero tie-ups until you
              submit.)
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
                  College
                </label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={newRequestCollegeId}
                  onChange={(e) => setNewRequestCollegeId(e.target.value)}
                >
                  <option value="">Select a college…</option>
                  {campusOptions.map((c) => (
                    <option key={c.id} value={c.id} disabled={!canRequestTieUp(c.approval_status)}>
                      {c.name}
                      {c.city ? ` — ${c.city}` : ''}
                      {!canRequestTieUp(c.approval_status)
                        ? ` (${normalizeApprovalStatus(c.approval_status) === 'approved' ? 'already approved' : 'request pending'})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  !selectedForNewRequest ||
                  !canRequestTieUp(selectedForNewRequest.approval_status) ||
                  requesting === selectedForNewRequest.id
                }
                onClick={() => selectedForNewRequest && handleRequestAccess(selectedForNewRequest)}
              >
                {requesting === selectedForNewRequest?.id ? 'Sending…' : 'Send tie-up request'}
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
              Focus table on
            </label>
            <select
              className="form-input"
              style={{ width: '100%' }}
              value={focusCampusId}
              onChange={(e) => setFocusCampusId(e.target.value)}
            >
              <option value="">All campuses</option>
              {campusOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` — ${c.city}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
              Search
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%' }}
              placeholder="Name or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ width: '180px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
              State
            </label>
            <select className="form-input" style={{ width: '100%' }} value={filterState} onChange={(e) => setFilterState(e.target.value)}>
              <option value="all">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {outsideFilters && (
          <p className="text-sm" style={{ color: 'var(--warning-600, #b45309)', marginBottom: '0.75rem' }}>
            Showing a campus that does not match your current search or state — adjust filters or choose &quot;All campuses&quot;
            in the dropdown.
          </p>
        )}

        {isLoading && (
          <div className="table-container">
            <div className="skeleton" style={{ height: 220, margin: 0 }} />
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger-600)' }}>
            {error.message || 'Failed to load colleges.'}
          </div>
        )}

        {!isLoading && !error && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>#</th>
                  <th>College</th>
                  <th>Location</th>
                  <th>Accreditation</th>
                  <th style={{ textAlign: 'right' }}>Students</th>
                  <th style={{ textAlign: 'right' }}>Placement</th>
                  <th style={{ textAlign: 'right' }}>Avg CGPA</th>
                  <th style={{ textAlign: 'right' }}>Active drives</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      No rows match your filters.
                    </td>
                  </tr>
                ) : (
                  displayRows.map((c, index) => {
                    const status = normalizeApprovalStatus(c.approval_status);
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.null;
                    const placementPct =
                      c.total_students > 0 ? Math.round((Number(c.placed_students || 0) / Number(c.total_students)) * 100) : null;
                    const isApproved = status === 'approved';
                    const isPending = status === 'pending';
                    const showRequestBtn = canRequestTieUp(c.approval_status);
                    const isRequesting = requesting === c.id;
                    const isRevoking = revoking === c.id;
                    const accParts = [c.naac_grade ? `NAAC ${c.naac_grade}` : null, c.nirf_rank ? `NIRF ${c.nirf_rank}` : null].filter(
                      Boolean,
                    );
                    return (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--text-tertiary)' }}>{index + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <EntityLogo name={c.name} website={c.website} size="sm" shape="rounded" />
                            <div>
                              <div className="font-semibold" style={{ lineHeight: 1.25 }}>
                                {c.name}
                              </div>
                              {c.website && (
                                <a
                                  href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-secondary"
                                  style={{ wordBreak: 'break-all' }}
                                >
                                  {c.website.replace(/^https?:\/\//, '')}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                        <td className="text-sm">{accParts.length ? accParts.join(' · ') : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{c.total_students ?? 0}</td>
                        <td style={{ textAlign: 'right' }}>{placementPct != null ? `${placementPct}%` : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{c.avg_cgpa != null ? Number(c.avg_cgpa).toFixed(2) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{c.active_drives ?? 0}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: cfg.bg,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {isApproved && (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSelectCampus(c)}>
                                  Open campus
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: 'var(--danger-200)', color: 'var(--danger-600)' }}
                                  onClick={() => handleRevokeAccess(c)}
                                  disabled={isRevoking}
                                >
                                  {isRevoking ? '…' : 'Cancel tie-up'}
                                </button>
                              </>
                            )}
                            {showRequestBtn && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={isRequesting}
                                onClick={() => handleRequestAccess(c)}
                              >
                                {isRequesting ? 'Requesting…' : 'Request tie-up'}
                              </button>
                            )}
                            {isPending && (
                              <span className="text-sm" style={{ color: '#92400e' }}>
                                Awaiting college
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
