'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Search, XCircle } from 'lucide-react';
import { useClientPagination } from '@/hooks/useClientPagination';
import { formatStatus } from '@/lib/utils';
import '@/components/ip/ip-applications-gemini.css';

const PAGE_SIZE = 10;

function MatchCell({ score }) {
  if (score == null) {
    return (
      <div className="ip-ap-match">
        <span className="ip-ap-match__pct is-na">—</span>
        <div className="ip-ap-match__bar" aria-hidden>
          <div className="ip-ap-match__fill is-mid" style={{ width: '0%' }} />
        </div>
      </div>
    );
  }
  const high = score >= 90;
  return (
    <div className="ip-ap-match">
      <span className={`ip-ap-match__pct ${high ? 'is-high' : 'is-mid'}`}>{score}%</span>
      <div className="ip-ap-match__bar" aria-hidden>
        <div
          className={`ip-ap-match__fill ${high ? 'is-high' : 'is-mid'}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'applied' || s === 'pending') return 'ip-ap-badge--applied';
  if (s.includes('interview')) return 'ip-ap-badge--interview';
  if (s.includes('offer') || s === 'accepted' || s === 'hired') return 'ip-ap-badge--offer';
  if (s.includes('reject') || s === 'withdrawn') return 'ip-ap-badge--rejected';
  if (s === 'completed') return 'ip-ap-badge--offer';
  return 'ip-ap-badge--other';
}

function canWithdraw(status) {
  const s = String(status || '').toLowerCase();
  return s === 'applied' || s === 'pending';
}

export default function MyApplicationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [threadByInternship, setThreadByInternship] = useState({});
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('latest');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = items.slice();
    if (needle) {
      rows = rows.filter((a) => {
        const title = String(a.title || '').toLowerCase();
        const company = String(a.company_name || '').toLowerCase();
        const status = String(formatStatus(a.status) || a.status || '').toLowerCase();
        return title.includes(needle) || company.includes(needle) || status.includes(needle);
      });
    }
    rows.sort((a, b) => {
      if (sort === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sort === 'match') {
        return (b.match_score ?? -1) - (a.match_score ?? -1);
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return rows;
  }, [items, q, sort]);

  const { page, setPage, totalPages, total, pageItems, serialOffset } = useClientPagination(
    filtered,
    PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [q, sort, setPage]);

  async function load() {
    const res = await fetch('/api/ip/candidate/applications');
    const data = await res.json();
    setItems(data.items || []);
  }

  async function loadThreads() {
    const res = await fetch('/api/ip/messages/threads');
    const data = await res.json().catch(() => ({}));
    const map = {};
    (data.items || []).forEach((t) => {
      if (t.internship_id) map[t.internship_id] = t.id;
    });
    setThreadByInternship(map);
  }

  useEffect(() => {
    load();
    loadThreads();
  }, []);

  function openThread(internshipId) {
    const threadId = threadByInternship[internshipId];
    router.push(threadId ? `/candidate/messages/${threadId}` : '/candidate/messages');
  }

  async function withdraw(id) {
    await fetch(`/api/ip/candidate/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'withdrawn' }),
    });
    await load();
  }

  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="ip-apps">
      <div className="ip-ap-top">
        <div>
          <h1>My applications</h1>
          <p>{items.length} application(s) total</p>
        </div>
        <div className="ip-ap-search">
          <span className="ip-ap-search__icon" aria-hidden>
            <Search className="size-4" />
          </span>
          <input
            type="search"
            placeholder="Search applications..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search applications"
          />
        </div>
      </div>

      <div className="ip-ap-card">
        <div className="ip-ap-card__head">
          <h2>Applications</h2>
          <div className="ip-ap-sort">
            <span>Sort by:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort applications">
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
              <option value="match">Highest match</option>
            </select>
          </div>
        </div>

        <div className="ip-ap-table-wrap">
          <table className="ip-ap-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Internship</th>
                <th>Company</th>
                <th>Match</th>
                <th>Status</th>
                <th>Applied</th>
                <th className="ip-ap-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a, idx) => (
                <tr key={a.id}>
                  <td className="ip-ap-num">{serialOffset + idx + 1}</td>
                  <td>
                    <Link
                      href={`/candidate/internships/${a.internship_id}`}
                      className="ip-ap-title"
                    >
                      {a.title || 'Internship'}
                    </Link>
                  </td>
                  <td className="ip-ap-muted">{a.company_name || '—'}</td>
                  <td>
                    <MatchCell score={a.match_score} />
                  </td>
                  <td>
                    <span className={`ip-ap-badge ${statusClass(a.status)}`}>
                      {formatStatus(a.status) || 'Applied'}
                    </span>
                  </td>
                  <td className="ip-ap-muted">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="ip-ap-actions">
                    <div className="ip-ap-actions__row">
                      <button
                        type="button"
                        className="ip-ap-icon"
                        title="Message employer"
                        aria-label="Message employer"
                        onClick={() => openThread(a.internship_id)}
                      >
                        <MessageSquare className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="ip-ap-icon ip-ap-icon--withdraw"
                        title="Withdraw application"
                        aria-label="Withdraw application"
                        disabled={!canWithdraw(a.status)}
                        onClick={() => withdraw(a.id)}
                      >
                        <XCircle className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="ip-ap-empty">
                    {items.length ? 'No applications match your search.' : 'No applications yet.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {total > 0 ? (
          <div className="ip-ap-pager">
            <span>
              Showing {from}–{to} of {total}
            </span>
            <div className="ip-ap-pager__btns">
              <button
                type="button"
                className="ip-ap-btn"
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
                className="ip-ap-btn"
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
