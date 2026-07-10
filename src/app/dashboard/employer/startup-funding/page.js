'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Rocket, School, Eye, X, Mail, Info } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';

function flattenPrograms(colleges) {
  const rows = [];
  for (const college of colleges) {
    for (const level of college.fundingLevels || []) {
      for (const tier of level.tiers || []) {
        rows.push({
          opportunityId: tier.id,
          collegeId: college.id,
          collegeName: college.name,
          collegeLocation: college.location,
          contactEmail: college.contactEmail,
          category: level.category,
          categoryDescription: level.description,
          tierName: tier.name,
          price: tier.price,
          benefits: tier.benefits,
          label: tier.label,
        });
      }
    }
  }
  return rows;
}

export default function EmployerStartupFundingPage() {
  const { addToast } = useToast();
  const [colleges, setColleges] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailsRow, setDetailsRow] = useState(null);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadPrograms = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/employer/startup-funding');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load startup funding programs');
      setColleges(Array.isArray(json.colleges) ? json.colleges : []);
      setDisclaimer(String(json.disclaimer || ''));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadPrograms({ showLoading: true });
      } catch {
        if (!mounted) return;
        setColleges([]);
        setLoading(false);
        addToast('Failed to load startup funding programs', 'error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadPrograms, addToast]);

  const allRows = useMemo(() => flattenPrograms(colleges), [colleges]);

  const collegeOptions = useMemo(() => {
    const m = new Map();
    for (const c of colleges) m.set(c.id, c.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [colleges]);

  const categoryOptions = useMemo(() => {
    const s = new Set();
    for (const r of allRows) s.add(r.category);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (collegeFilter && r.collegeId !== collegeFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (q) {
        const hay = `${r.collegeName} ${r.collegeLocation} ${r.category} ${r.tierName} ${r.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, search, collegeFilter, categoryFilter]);

  const discussProgram = (row) => {
    const email = String(row.contactEmail || '').trim();
    const subject = `Seed funding inquiry: ${row.tierName} — ${row.collegeName}`;
    const body = [
      'Hello,',
      '',
      `We are interested in learning more about the "${row.tierName}" program (${row.category}) listed on PlacementHub.`,
      '',
      'Please share how your innovation / incubation office handles diligence, term sheets, and allocation for campus startups.',
      '',
      'Regards,',
    ].join('\n');
    if (!email) {
      addToast('This college has not published a contact email yet. Try Campus Partnerships or their profile.', 'warning');
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const modalBackdrop = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.55)',
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Rocket size={24} className="text-primary" aria-hidden />
            Startup seed funding
          </h1>
          <p>
            Browse indicative seed funding programs at partner colleges. Amounts and benefits are for orientation only —
            actual investments are negotiated offline with the institution&apos;s innovation office.
          </p>
        </div>
        <Link href="/dashboard/employer/select-campus" className="btn btn-secondary btn-sm">
          Campus partnerships
        </Link>
      </div>

      <div
        className="card"
        style={{
          marginBottom: '1rem',
          padding: '1rem 1.25rem',
          borderLeft: '4px solid var(--primary-500, #3b82f6)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          <Info size={20} className="text-primary" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          <div>
            <p className="text-sm font-semibold" style={{ margin: '0 0 0.35rem' }}>
              Informational module — no transactions on PlacementHub
            </p>
            <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
              {disclaimer ||
                'Seed investments involve legal review, shareholder agreements, valuation, and compliance steps that are outside the scope of this platform. Use the programs below to understand what each college offers, then contact them directly to begin a formal process.'}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <School size={16} className="text-secondary" aria-hidden />
            <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
              College
            </span>
            <select
              className="form-select"
              style={{ minWidth: 200 }}
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
            >
              <option value="">All colleges</option>
              {collegeOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
              Category
            </span>
            <select
              className="form-select"
              style={{ minWidth: 180 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
            <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
              Search
            </span>
            <input
              className="form-input"
              placeholder="College, tier, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="text-xs text-secondary" style={{ marginLeft: 'auto' }}>
            {loading ? 'Loading…' : `Showing ${filteredRows.length} of ${allRows.length}`}
          </span>
        </div>
      </div>

      {loading ? (
        <PageLoading message="Loading startup funding programs…" inline />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>College</th>
                <th>Category</th>
                <th>Program tier</th>
                <th>Indicative amount</th>
                <th style={{ width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.opportunityId}>
                  <td>
                    <div className="font-semibold">{row.collegeName}</div>
                    <div className="text-xs text-secondary">{row.collegeLocation}</div>
                  </td>
                  <td className="text-sm">{row.category}</td>
                  <td>
                    <div className="font-medium">{row.tierName}</div>
                    {row.label ? (
                      <div style={{ marginTop: 4 }}>
                        <span className="badge badge-primary">{row.label}</span>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="font-semibold">{row.price}</div>
                    <div className="text-xs text-tertiary">Indicative — not a checkout price</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="View program details"
                      aria-label={`View details for ${row.tierName}`}
                      onClick={() => setDetailsRow(row)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ marginLeft: 6 }}
                      title="Email the college innovation office"
                      onClick={() => discussProgram(row)}
                    >
                      <Mail size={14} style={{ marginRight: 4 }} />
                      Inquire
                    </button>
                  </td>
                </tr>
              ))}
              {allRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-secondary">
                    No startup funding programs are published yet.
                  </td>
                </tr>
              ) : null}
              {allRows.length > 0 && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-secondary">
                    No programs match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {detailsRow ? (
        <div style={modalBackdrop} role="presentation" onClick={() => setDetailsRow(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="funding-details-title"
            className="card"
            style={{
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.25rem',
              position: 'relative',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Close"
              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
              onClick={() => setDetailsRow(null)}
            >
              <X size={18} />
            </button>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              {detailsRow.collegeName}
            </p>
            <h2 id="funding-details-title" style={{ fontSize: '1.1rem', margin: '0.35rem 0' }}>
              {detailsRow.tierName}
            </h2>
            <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
              {detailsRow.category} · {detailsRow.price}{' '}
              <span className="text-tertiary">(indicative)</span>
            </p>
            {detailsRow.categoryDescription ? (
              <p className="text-sm" style={{ marginBottom: '0.75rem' }}>
                {detailsRow.categoryDescription}
              </p>
            ) : null}
            <strong className="text-sm">Typical benefits (overview)</strong>
            <ul
              style={{
                margin: '0.5rem 0 1rem',
                paddingLeft: '1.1rem',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
              }}
            >
              {(detailsRow.benefits || []).map((b, bi) => (
                <li key={bi} style={{ marginBottom: '0.35rem' }}>
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-xs text-secondary" style={{ margin: '0 0 1rem', lineHeight: 1.5 }}>
              Final investment structure, equity or grant terms, and startup selection are agreed outside PlacementHub
              with the college innovation / incubation team and legal counsel.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailsRow(null)}>
                Close
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => discussProgram(detailsRow)}>
                <Mail size={14} style={{ marginRight: 4 }} />
                Contact college
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
