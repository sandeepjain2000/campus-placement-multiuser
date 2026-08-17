'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins,
  Lightbulb,
  LightbulbOff,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import '@/components/ip/ip-ideas-gemini.css';

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Map live triage statuses → roadmap buckets. */
function roadmapBucket(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'shipped' || s === 'completed') return 'completed';
  if (s === 'planned') return 'planned';
  if (s === 'in progress' || s === 'in_progress') return 'in_progress';
  if (s === 'declined') return 'declined';
  return 'under_review';
}

function statusBadge(bucket) {
  switch (bucket) {
    case 'in_progress':
      return { label: 'In Progress', Icon: Loader2, tone: 'in_progress' };
    case 'planned':
      return { label: 'Planned', Icon: Calendar, tone: 'planned' };
    case 'completed':
      return { label: 'Completed', Icon: CheckCircle2, tone: 'completed' };
    case 'declined':
      return { label: 'Declined', Icon: X, tone: 'declined' };
    default:
      return { label: 'Under Review', Icon: Clock, tone: 'under_review' };
  }
}

function workspaceLabel(role) {
  if (role === 'employer') return 'Employer Workspace';
  if (role === 'candidate') return 'Candidate Workspace';
  if (role === 'superadmin') return 'SuperAdmin Workspace';
  return 'Workspace';
}

function referralHref(role) {
  if (role === 'employer') return '/employer/referral';
  if (role === 'candidate') return '/candidate/referral';
  return '/account';
}

/**
 * Shared Feature Ideas for candidate + employer (same layout from employer HTML mock).
 */
export default function FeatureIdeasPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('votes');
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [commentsByIdea, setCommentsByIdea] = useState({});
  const [commentDraft, setCommentDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

  const canSubmit = role === 'candidate' || role === 'employer';

  function showToast(msg) {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3200);
  }

  async function load() {
    const res = await fetch('/api/ip/ideas');
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  async function loadCategories() {
    const res = await fetch('/api/ip/idea-categories');
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data.items || []);
  }

  async function loadPoints() {
    const res = await fetch('/api/ip/referral').catch(() => null);
    if (!res?.ok) return;
    const data = await res.json().catch(() => ({}));
    if (typeof data.points === 'number') setPoints(data.points);
  }

  useEffect(() => {
    if (status === 'authenticated') {
      load();
      loadCategories();
      loadPoints();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please fill in both title and description.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ip/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, categoryId: categoryId || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Could not submit idea.');
        return;
      }
      setTitle('');
      setDescription('');
      setCategoryId('');
      setFormOpen(false);
      await load();
      showToast('Idea submitted successfully! Under review by team.');
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(id) {
    await fetch(`/api/ip/ideas/${id}/vote`, { method: 'POST' });
    await load();
    showToast('Upvoted! Thank you for your feedback.');
  }

  async function toggleComments(ideaId) {
    if (openCommentsId === ideaId) {
      setOpenCommentsId(null);
      setCommentDraft('');
      return;
    }
    setOpenCommentsId(ideaId);
    setCommentDraft('');
    if (!commentsByIdea[ideaId]) {
      const res = await fetch(`/api/ip/ideas/${ideaId}/comments`);
      const data = await res.json().catch(() => ({}));
      setCommentsByIdea((prev) => ({ ...prev, [ideaId]: data.items || [] }));
    }
  }

  async function postComment(ideaId) {
    const body = commentDraft.trim();
    if (!body) return;
    setCommentBusy(true);
    try {
      const res = await fetch(`/api/ip/ideas/${ideaId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Could not post comment.');
        return;
      }
      const data = await res.json();
      setCommentsByIdea((prev) => ({
        ...prev,
        [ideaId]: [...(prev[ideaId] || []), data.item],
      }));
      setCommentDraft('');
      await load();
      showToast('Comment posted.');
    } finally {
      setCommentBusy(false);
    }
  }

  function resetFilters() {
    setFilter('all');
    setSearch('');
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((idea) => {
      const bucket = roadmapBucket(idea.status);
      if (filter !== 'all' && bucket !== filter) return false;
      if (!q) return true;
      return `${idea.title || ''} ${idea.description || ''} ${idea.category_name || ''}`
        .toLowerCase()
        .includes(q);
    });
    list.sort((a, b) => {
      if (sortBy === 'votes') return (b.vote_count || 0) - (a.vote_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [items, filter, search, sortBy]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="ip-ideas">
      {toastMsg ? (
        <div className="ip-id-toast" role="status">
          <span className="ip-id-toast-ico">
            <Check aria-hidden />
          </span>
          <span>{toastMsg}</span>
        </div>
      ) : null}

      <div className="ip-id-toolbar">
        <div className="ip-id-crumb">
          <span>{workspaceLabel(role)}</span>
          <ChevronRight size={14} aria-hidden />
          <strong>Feature Ideas & Roadmap</strong>
        </div>
        <div className="ip-id-toolbar-actions">
          <Link className="ip-id-pts-pill" href={referralHref(role)}>
            <span className="ip-id-pts-pill__dot" aria-hidden>
              <Coins size={12} />
            </span>
            <span>{points == null ? '— Points' : `${points} Points`}</span>
          </Link>
          {canSubmit ? (
            <button type="button" className="ip-id-suggest" onClick={() => setFormOpen(true)}>
              <Plus size={15} aria-hidden />
              <span>Suggest an Idea</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="ip-id-header">
        <div>
          <div className="ip-id-title-row">
            <h1>Suggestions & Ideas</h1>
            <span className="ip-id-pill">Product Roadmap</span>
          </div>
          <p>
            Vote up feature requests you would like to see built next, or submit your own ideas directly to our
            engineering team.
          </p>
        </div>
      </div>

      <div className="ip-id-toolbar-panel">
        <div className="ip-id-tabs" role="tablist" aria-label="Idea status filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'planned', label: 'Planned' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={`ip-id-tab${filter === tab.id ? ' is-active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
              {tab.id === 'all' ? ` (${items.length})` : ''}
            </button>
          ))}
        </div>
        <div className="ip-id-tools">
          <div className="ip-id-search">
            <Search aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas..."
              aria-label="Search ideas"
            />
          </div>
          <select
            className="ip-id-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort ideas"
          >
            <option value="votes">Most Voted</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ip-id-skel" aria-busy="true" aria-label="Loading ideas">
          {[1, 2, 3].map((n) => (
            <div key={n} className="ip-id-skel-card">
              <div className="ip-id-skel-vote" />
              <div className="ip-id-skel-lines">
                <div className="ip-id-skel-line w1" />
                <div className="ip-id-skel-line w2" />
                <div className="ip-id-skel-line w3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <ul className="ip-id-list">
          {filtered.map((idea) => {
            const bucket = roadmapBucket(idea.status);
            const badge = statusBadge(bucket);
            const StatusIcon = badge.Icon;
            const voted = !!idea.voted_by_me;
            const open = openCommentsId === idea.id;
            const thread = commentsByIdea[idea.id] || [];
            const commentCount =
              typeof idea.comment_count === 'number' ? idea.comment_count : thread.length;
            return (
              <li key={idea.id} className="ip-id-card">
                <div className="ip-id-card-top">
                  <button
                    type="button"
                    className={`ip-id-vote${voted ? ' is-on' : ''}`}
                    onClick={() => vote(idea.id)}
                    aria-pressed={voted}
                    title={voted ? 'Remove upvote' : 'Upvote'}
                  >
                    <ChevronUp aria-hidden />
                    <span>{idea.vote_count || 0}</span>
                  </button>
                  <div className="ip-id-main">
                    <div className="ip-id-card-title-row">
                      <h3>{idea.title}</h3>
                      <div className="ip-id-badges">
                        {idea.category_name ? <span className="ip-id-cat">{idea.category_name}</span> : null}
                        <span className={`ip-id-status ip-id-status--${badge.tone}`}>
                          <StatusIcon aria-hidden />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>
                    {idea.description ? <p className="ip-id-desc">{idea.description}</p> : null}
                    <div className="ip-id-meta">
                      <div className="ip-id-author">
                        <span className="ip-id-avatar">{initials(idea.author_name)}</span>
                        <span>Submitted by</span>
                        <strong>{idea.author_name || 'Unknown'}</strong>
                        <span>•</span>
                        <span>{formatWhen(idea.created_at)}</span>
                      </div>
                      <button
                        type="button"
                        className={`ip-id-comments-btn${open ? ' is-open' : ''}`}
                        onClick={() => toggleComments(idea.id)}
                      >
                        <MessageSquare aria-hidden />
                        <span>
                          {commentCount} comment{commentCount === 1 ? '' : 's'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {open ? (
                  <div className="ip-id-thread">
                    {thread.length ? (
                      <ul className="ip-id-thread-list">
                        {thread.map((c) => (
                          <li key={c.id} className="ip-id-thread-item">
                            <header>
                              <strong>{c.author_name || 'User'}</strong>
                              <span>{formatWhen(c.created_at)}</span>
                            </header>
                            <p>{c.body}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ip-id-thread-empty">No comments yet — start the discussion.</p>
                    )}
                    <div className="ip-id-thread-form">
                      <textarea
                        rows={2}
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Write a comment…"
                        maxLength={2000}
                      />
                      <button
                        type="button"
                        disabled={commentBusy || !commentDraft.trim()}
                        onClick={() => postComment(idea.id)}
                      >
                        {commentBusy ? '…' : 'Post'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="ip-id-empty">
          <div className="ip-id-empty-ico">
            <LightbulbOff size={28} aria-hidden />
          </div>
          <h3>No Feature Requests Found</h3>
          <p>
            {search
              ? `No suggestions found for "${search}".`
              : 'There are no ideas matching your filter. Be the first to submit a request to help guide our product roadmap!'}
          </p>
          <div className="ip-id-empty-actions">
            <button type="button" className="ip-id-btn-ghost" onClick={resetFilters}>
              Reset Filters
            </button>
            {canSubmit ? (
              <button type="button" className="ip-id-btn-primary" onClick={() => setFormOpen(true)}>
                <Plus size={14} aria-hidden />
                Suggest an Idea
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 ? (
        <div className="ip-id-footer">
          <span>
            Showing {filtered.length} of {items.length} ideas
          </span>
          <span className="ip-id-footer-note">
            <Sparkles size={12} aria-hidden />
            <span>Ideas are directly triaged by the PlacementHub product team</span>
          </span>
        </div>
      ) : null}

      {canSubmit && formOpen ? (
        <div className="ip-id-overlay" role="dialog" aria-modal="true" aria-labelledby="ip-id-modal-title">
          <div className="ip-id-modal">
            <div className="ip-id-modal-head">
              <div className="ip-id-modal-head-left">
                <span className="ip-id-form-ico">
                  <Lightbulb size={18} aria-hidden />
                </span>
                <h2 id="ip-id-modal-title">Suggest a New Feature</h2>
              </div>
              <button
                type="button"
                className="ip-id-form-close"
                onClick={() => setFormOpen(false)}
                aria-label="Close"
              >
                <X aria-hidden />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="ip-id-form-grid">
                <div className="ip-id-field">
                  <label htmlFor="idea-title">
                    Title <span>*</span>
                  </label>
                  <input
                    id="idea-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Add dark mode for workspace"
                    required
                    autoFocus
                  />
                </div>
                <div className="ip-id-field">
                  <label htmlFor="idea-cat">Category</label>
                  <select id="idea-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ip-id-field" style={{ marginTop: '0.75rem' }}>
                <label htmlFor="idea-desc">
                  Description <span>*</span>
                </label>
                <textarea
                  id="idea-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this feature would be useful…"
                  required
                />
              </div>
              <div className="ip-id-form-actions">
                <button type="button" className="ip-id-btn-ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ip-id-btn-primary" disabled={submitting}>
                  <Send size={14} aria-hidden />
                  <span>{submitting ? 'Submitting…' : 'Submit Idea'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
