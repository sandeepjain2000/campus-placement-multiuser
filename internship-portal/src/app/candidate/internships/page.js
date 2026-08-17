'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  Eye,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Shield,
} from 'lucide-react';
import ValidationScoreButton from '@/components/ip/ValidationScoreButton';
import { useClientPagination } from '@/hooks/useClientPagination';
import '@/components/ip/ip-browse-internships-gemini.css';

const PAGE_SIZE = 10;

const WORK_MODES = [
  { value: 'all', label: 'All modes' },
  { value: 'Remote', label: 'Remote' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Onsite', label: 'Onsite' },
  { value: 'On-site', label: 'On-site' },
];

function stipendLabel(i) {
  if (i.stipend_inr) return `₹${i.stipend_inr}/mo`;
  if (i.stipend_type === 'incentive') return 'Incentive';
  return 'Unpaid';
}

function MatchCell({ score }) {
  if (score == null) {
    return (
      <div className="ip-br-match">
        <span className="ip-br-match__pct is-na">—</span>
        <div className="ip-br-match__bar" aria-hidden>
          <div className="ip-br-match__fill is-mid" style={{ width: '0%' }} />
        </div>
      </div>
    );
  }
  const high = score >= 90;
  return (
    <div className="ip-br-match">
      <span className={`ip-br-match__pct ${high ? 'is-high' : 'is-mid'}`}>{score}%</span>
      <div className="ip-br-match__bar" aria-hidden>
        <div
          className={`ip-br-match__fill ${high ? 'is-high' : 'is-mid'}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

export default function BrowseInternshipsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [minStipend, setMinStipend] = useState('');
  const [workMode, setWorkMode] = useState('all');
  const [minMatch, setMinMatch] = useState('');
  const [minValidation, setMinValidation] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const { page, setPage, totalPages, total, pageItems, serialOffset } = useClientPagination(
    items,
    PAGE_SIZE
  );

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (minStipend) params.set('minStipend', minStipend);
    if (workMode && workMode !== 'all') params.set('workMode', workMode);
    if (minMatch) params.set('minMatch', minMatch);
    if (minValidation) params.set('minValidation', minValidation);
    if (savedOnly) params.set('savedOnly', '1');
    const res = await fetch(`/api/ip/candidate/internships?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleSave(internshipId, saved) {
    await fetch('/api/ip/candidate/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internshipId, saved: !saved }),
    });
    await load();
  }

  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="ip-browse">
      <div className="ip-br-top">
        <div>
          <h1>Browse internships</h1>
          <p>Filter by stipend, work mode, match, and Validation Score.</p>
        </div>
        <div className="ip-br-seg" role="group" aria-label="View mode">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List className="size-4" />
            List
          </button>
          <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
            <LayoutGrid className="size-4" />
            Cards
          </button>
        </div>
      </div>

      <div className="ip-br-card ip-br-filters">
        <div className="ip-br-filters__row">
          <div className="ip-br-field ip-br-field--grow">
            <span className="ip-br-field__icon" aria-hidden>
              <Search className="size-4" />
            </span>
            <input
              className="ip-br-input"
              placeholder="Search title or company"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') load();
              }}
            />
          </div>

          <div className="ip-br-field ip-br-field--sm">
            <span className="ip-br-field__icon" aria-hidden>
              ₹
            </span>
            <input
              className="ip-br-input"
              placeholder="Min stipend"
              type="number"
              value={minStipend}
              onChange={(e) => setMinStipend(e.target.value)}
            />
          </div>

          <select
            className="ip-br-select"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            aria-label="Work mode"
          >
            {WORK_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <div className="ip-br-field ip-br-field--xs">
            <input
              className="ip-br-input"
              placeholder="Min match %"
              type="number"
              value={minMatch}
              onChange={(e) => setMinMatch(e.target.value)}
            />
          </div>

          <div className="ip-br-field ip-br-field--sm">
            <span className="ip-br-field__icon" aria-hidden>
              <Shield className="size-4" />
            </span>
            <input
              className="ip-br-input"
              placeholder="Min validation"
              type="number"
              value={minValidation}
              onChange={(e) => setMinValidation(e.target.value)}
              title="Minimum Validation Score /100"
            />
          </div>

          <div className="ip-br-actions">
            <label className="ip-br-check">
              <input
                type="checkbox"
                checked={savedOnly}
                onChange={(e) => setSavedOnly(e.target.checked)}
              />
              Saved only
            </label>
            <button type="button" className="ip-br-btn" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      <div className="ip-br-card">
        <div className="ip-br-results__head">
          <h2>Results</h2>
          <span>
            {items.length} internship(s)
          </span>
        </div>

        {view === 'list' ? (
          <div className="ip-br-table-wrap">
            <table className="ip-br-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Mode</th>
                  <th>Stipend</th>
                  <th>Match</th>
                  <th>Validation</th>
                  <th className="ip-br-actions-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((i, idx) => (
                  <tr key={i.id} className={i.saved ? 'is-saved' : undefined}>
                    <td className="ip-br-num">{serialOffset + idx + 1}</td>
                    <td className="ip-br-title">
                      <button
                        type="button"
                        className="ip-br-title-btn"
                        onClick={() => router.push(`/candidate/internships/${i.id}`)}
                      >
                        {i.saved ? (
                          <span className="ip-br-saved-chip" title="Saved">
                            <Bookmark className="size-3.5" fill="currentColor" />
                            Saved
                          </span>
                        ) : null}
                        <span>{i.title}</span>
                      </button>
                    </td>
                    <td className="ip-br-muted">{i.company_name}</td>
                    <td className="ip-br-muted">{i.work_mode || i.location || '—'}</td>
                    <td className="ip-br-stipend">{stipendLabel(i)}</td>
                    <td>
                      <MatchCell score={i.match_score} />
                    </td>
                    <td>
                      <div className="ip-br-valid">
                        <ValidationScoreButton
                          score={i.validation_score}
                          label={i.validation_label}
                          breakdown={i.validation_breakdown}
                        />
                      </div>
                    </td>
                    <td className="ip-br-actions-cell">
                      <div className="ip-br-row-actions">
                        <button
                          type="button"
                          className={`ip-br-btn ip-br-btn--icon${i.saved ? ' is-saved' : ''}`}
                          title={i.saved ? 'Unsave' : 'Save'}
                          aria-label={i.saved ? 'Unsave' : 'Save'}
                          onClick={() => toggleSave(i.id, i.saved)}
                        >
                          <Bookmark
                            className="size-4"
                            fill={i.saved ? 'currentColor' : 'none'}
                          />
                        </button>
                        <button
                          type="button"
                          className="ip-br-btn ip-br-btn--icon"
                          title="View & apply"
                          aria-label="View & apply"
                          onClick={() => router.push(`/candidate/internships/${i.id}`)}
                        >
                          <Eye className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && !loading ? (
                  <tr>
                    <td colSpan={8} className="ip-br-empty">
                      No internships match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ip-br-cards">
            {pageItems.map((i) => (
              <div key={i.id} className={`ip-br-job-card${i.saved ? ' is-saved' : ''}`}>
                {i.saved ? (
                  <div className="ip-br-job-card__saved-banner">
                    <span>
                      <Bookmark className="size-3" fill="currentColor" />
                      SAVED INTERNSHIP
                    </span>
                    <span>★ Bookmarked</span>
                  </div>
                ) : null}
                <div className="ip-br-job-card__top">
                  <div>
                    <button
                      type="button"
                      className="ip-br-title-btn"
                      onClick={() => router.push(`/candidate/internships/${i.id}`)}
                    >
                      <h3>{i.title}</h3>
                    </button>
                    <p>{i.company_name}</p>
                  </div>
                  <button
                    type="button"
                    className={`ip-br-btn ip-br-btn--icon ip-br-btn--ghost${i.saved ? ' is-saved' : ''}`}
                    title={i.saved ? 'Unsave' : 'Save'}
                    aria-label={i.saved ? 'Unsave' : 'Save'}
                    onClick={() => toggleSave(i.id, i.saved)}
                  >
                    <Bookmark
                      className="size-4"
                      fill={i.saved ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <div className="ip-br-job-card__meta">
                  <span>
                    <MapPin className="size-4 text-slate-400" />
                    {i.work_mode || i.location || '—'}
                  </span>
                  <span>
                    <span aria-hidden>₹</span>
                    {stipendLabel(i)}
                  </span>
                  <MatchCell score={i.match_score} />
                </div>
                <div className="ip-br-job-card__foot">
                  <div className="ip-br-valid">
                    <ValidationScoreButton
                      score={i.validation_score}
                      label={i.validation_label}
                      breakdown={i.validation_breakdown}
                    />
                  </div>
                  <button
                    type="button"
                    className="ip-br-btn ip-br-btn--outline ip-br-btn--sm"
                    onClick={() => router.push(`/candidate/internships/${i.id}`)}
                  >
                    View details
                  </button>
                </div>
              </div>
            ))}
            {!items.length && !loading ? (
              <p className="ip-br-empty">No internships match your filters.</p>
            ) : null}
          </div>
        )}

        {total > 0 ? (
          <div className="ip-br-pager">
            <span>
              Showing {from}–{to} of {total}
            </span>
            <div className="ip-br-pager__btns">
              <button
                type="button"
                className="ip-br-btn ip-br-btn--outline ip-br-btn--sm"
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                className="ip-br-btn ip-br-btn--outline ip-br-btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
