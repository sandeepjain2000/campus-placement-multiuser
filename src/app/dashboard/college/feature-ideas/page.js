'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ChevronUp, Lightbulb, Search, X } from 'lucide-react';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import {
  FEATURE_IDEA_STATUS_TONE,
  FEATURE_IDEA_STATUSES,
  FEATURE_IDEA_TOPICS,
  MAX_FEATURE_IDEA_DESCRIPTION,
  MAX_FEATURE_IDEA_TITLE,
  MAX_FEATURE_IDEA_TOPICS,
} from '@/lib/featureIdeas';
import { timeAgo } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load ideas');
  return data;
};

function buildKey({ status, topic, sort, q }) {
  const sp = new URLSearchParams();
  if (status) sp.set('status', status);
  if (topic) sp.set('topic', topic);
  if (sort) sp.set('sort', sort);
  if (q) sp.set('q', q);
  const qs = sp.toString();
  return `/api/college/feature-ideas${qs ? `?${qs}` : ''}`;
}

export default function CollegeFeatureIdeasPage() {
  const { addToast } = useToast();
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');
  const [sort, setSort] = useState('trending');
  const [q, setQ] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [successIdea, setSuccessIdea] = useState(null);
  const [detailIdea, setDetailIdea] = useState(null);

  const swrKey = useMemo(() => buildKey({ status, topic, sort, q }), [status, topic, sort, q]);
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher);

  const items = data?.items || [];
  const statusCounts = data?.statusCounts || {};
  const topicCounts = data?.topicCounts || {};

  const onVote = useCallback(
    async (ideaId) => {
      try {
        const res = await fetch(`/api/college/feature-ideas/${ideaId}/vote`, { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Vote failed');
        await mutate();
        setDetailIdea((prev) =>
          prev && prev.id === ideaId
            ? { ...prev, vote_count: body.vote_count, voted_by_me: body.voted_by_me }
            : prev,
        );
      } catch (e) {
        addToast(e.message || 'Vote failed', 'warning');
      }
    },
    [addToast, mutate],
  );

  if (error) return <PageError error={error} />;

  return (
    <div className="animate-fadeIn feature-ideas-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Feature Ideas</h1>
          <p>Suggest product improvements for PlacementHub. Vote on ideas from other colleges.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Submit Idea
        </button>
      </div>

      <div className="feature-ideas-layout">
        <aside className="feature-ideas-sidebar card">
          <div className="feature-ideas-sidebar-block">
            <h3>Status</h3>
            <button
              type="button"
              className={`feature-ideas-filter${!status ? ' is-active' : ''}`}
              onClick={() => setStatus('')}
            >
              All
            </button>
            {FEATURE_IDEA_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`feature-ideas-filter${status === s ? ' is-active' : ''}`}
                onClick={() => setStatus(status === s ? '' : s)}
              >
                <span className={`feature-ideas-status-dot status-${s.replace(/\s+/g, '-').toLowerCase()}`} />
                <span className="feature-ideas-filter-label">{s}</span>
                <span className="feature-ideas-filter-count">{statusCounts[s] || 0}</span>
              </button>
            ))}
          </div>
          <div className="feature-ideas-sidebar-block">
            <h3>Topics</h3>
            {FEATURE_IDEA_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                className={`feature-ideas-filter${topic === t ? ' is-active' : ''}`}
                onClick={() => setTopic(topic === t ? '' : t)}
              >
                <span className="feature-ideas-filter-label">#{t}</span>
                <span className="feature-ideas-filter-count">{topicCounts[t] || 0}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="feature-ideas-main">
          <div className="feature-ideas-toolbar">
            <div className="feature-ideas-search">
              <Search size={16} aria-hidden />
              <input
                className="form-input"
                placeholder="Search ideas…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQ(searchDraft.trim());
                }}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQ(searchDraft.trim())}>
                Search
              </button>
            </div>
            <select
              className="form-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort ideas"
              style={{ width: 'auto', minWidth: 140 }}
            >
              <option value="trending">Trending</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {isLoading ? (
            <PageLoading message="Loading ideas…" inline />
          ) : items.length === 0 ? (
            <div className="card feature-ideas-empty">
              <Lightbulb size={28} strokeWidth={1.5} />
              <h2>No ideas yet</h2>
              <p>Be the first college to submit a product idea.</p>
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
                Submit Idea
              </button>
            </div>
          ) : (
            <div className="feature-ideas-list">
              {items.map((idea) => (
                <article key={idea.id} className="card feature-ideas-row">
                  <button
                    type="button"
                    className={`feature-ideas-vote${idea.voted_by_me ? ' is-voted' : ''}`}
                    onClick={() => onVote(idea.id)}
                    aria-label={idea.voted_by_me ? 'Remove vote' : 'Upvote idea'}
                    title={idea.voted_by_me ? 'Remove vote' : 'Upvote'}
                  >
                    <ChevronUp size={18} />
                    <span>{idea.vote_count}</span>
                  </button>
                  <button
                    type="button"
                    className="feature-ideas-body"
                    onClick={() => setDetailIdea(idea)}
                  >
                    <div className="feature-ideas-title-row">
                      <h2>{idea.title}</h2>
                      <span className={`badge ${FEATURE_IDEA_STATUS_TONE[idea.status] || 'badge-gray'}`}>
                        {idea.status}
                      </span>
                    </div>
                    <p className="feature-ideas-snippet">
                      {String(idea.description || '').length > 160
                        ? `${String(idea.description).slice(0, 160)}…`
                        : idea.description}
                    </p>
                    <div className="feature-ideas-meta">
                      <span>{idea.author_name?.trim() || 'College user'}</span>
                      {idea.college_name ? <span>· {idea.college_name}</span> : null}
                      <span>· {timeAgo(idea.created_at)}</span>
                      {(idea.topics || []).map((t) => (
                        <span key={t} className="feature-ideas-topic">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {modalOpen ? (
        <SubmitIdeaModal
          onClose={() => setModalOpen(false)}
          onSubmitted={(idea) => {
            setModalOpen(false);
            setSuccessIdea(idea);
            mutate();
          }}
        />
      ) : null}

      {successIdea ? (
        <SuccessModal
          idea={successIdea}
          onClose={() => setSuccessIdea(null)}
          onView={() => {
            setDetailIdea(successIdea);
            setSuccessIdea(null);
          }}
          onAddAnother={() => {
            setSuccessIdea(null);
            setModalOpen(true);
          }}
        />
      ) : null}

      {detailIdea ? (
        <DetailModal idea={detailIdea} onClose={() => setDetailIdea(null)} onVote={() => onVote(detailIdea.id)} />
      ) : null}

      <style jsx global>{`
        .feature-ideas-layout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 1.25rem;
          align-items: start;
        }
        .feature-ideas-sidebar {
          padding: 1rem 0.85rem;
          position: sticky;
          top: 1rem;
        }
        .feature-ideas-sidebar-block + .feature-ideas-sidebar-block {
          margin-top: 1.25rem;
          padding-top: 1.15rem;
          border-top: 1px solid var(--border-default);
        }
        .feature-ideas-sidebar h3 {
          margin: 0 0 0.55rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-tertiary);
        }
        .feature-ideas-filter {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          border: none;
          background: transparent;
          padding: 0.4rem 0.45rem;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          color: var(--text-secondary);
          cursor: pointer;
          text-align: left;
        }
        .feature-ideas-filter:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .feature-ideas-filter.is-active {
          background: var(--primary-50);
          color: var(--primary-800);
          font-weight: 600;
        }
        .feature-ideas-filter-label {
          flex: 1;
          min-width: 0;
        }
        .feature-ideas-filter-count {
          font-variant-numeric: tabular-nums;
          color: var(--text-tertiary);
          font-size: 0.75rem;
        }
        .feature-ideas-status-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 999px;
          background: var(--border-strong);
          flex-shrink: 0;
        }
        .feature-ideas-status-dot.status-shipped { background: var(--success-500); }
        .feature-ideas-status-dot.status-in-development { background: var(--warning-500); }
        .feature-ideas-status-dot.status-planned { background: var(--primary-500); }
        .feature-ideas-status-dot.status-under-consideration { background: var(--text-tertiary); }
        .feature-ideas-status-dot.status-on-hold { background: #db2777; }
        .feature-ideas-status-dot.status-not-planning { background: var(--text-primary); }
        .feature-ideas-status-dot.status-pending-approval { background: var(--border-strong); }
        .feature-ideas-toolbar {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .feature-ideas-search {
          flex: 1;
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 0 0.5rem;
          background: var(--bg-secondary);
        }
        .feature-ideas-search .form-input {
          border: none;
          box-shadow: none;
          background: transparent;
        }
        .feature-ideas-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .feature-ideas-row {
          display: flex;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          align-items: flex-start;
        }
        .feature-ideas-vote {
          min-width: 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          padding: 0.4rem 0.35rem;
          cursor: pointer;
          color: var(--text-secondary);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .feature-ideas-vote:hover {
          border-color: var(--primary-300);
          color: var(--primary-700);
        }
        .feature-ideas-vote.is-voted {
          background: var(--primary-50);
          border-color: var(--primary-300);
          color: var(--primary-800);
        }
        .feature-ideas-body {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          text-align: left;
          padding: 0;
          cursor: pointer;
        }
        .feature-ideas-title-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: flex-start;
        }
        .feature-ideas-title-row h2 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .feature-ideas-snippet {
          margin: 0.35rem 0 0.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }
        .feature-ideas-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem 0.5rem;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          align-items: center;
        }
        .feature-ideas-topic {
          color: var(--primary-700);
          font-weight: 600;
        }
        .feature-ideas-empty {
          padding: 2.5rem 1.5rem;
          text-align: center;
          display: grid;
          gap: 0.5rem;
          justify-items: center;
          color: var(--text-secondary);
        }
        .feature-ideas-empty h2 {
          margin: 0.25rem 0 0;
          font-size: 1.15rem;
          color: var(--text-primary);
        }
        .feature-ideas-empty p {
          margin: 0 0 0.75rem;
        }
        .feature-ideas-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
        }
        .feature-ideas-modal {
          width: min(560px, 100%);
          max-height: min(90vh, 760px);
          overflow: auto;
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 1.25rem 1.35rem 1.35rem;
        }
        .feature-ideas-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .feature-ideas-modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
        }
        .feature-ideas-topic-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .feature-ideas-topic-chip {
          border: 1px solid var(--border-default);
          background: var(--bg-primary);
          border-radius: 999px;
          padding: 0.35rem 0.7rem;
          font-size: 0.8125rem;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .feature-ideas-topic-chip.is-selected {
          background: var(--primary-600);
          border-color: var(--primary-600);
          color: white;
          font-weight: 600;
        }
        .feature-ideas-success {
          text-align: center;
          padding: 1.5rem 0.5rem 0.5rem;
        }
        .feature-ideas-success h2 {
          margin: 0 0 0.35rem;
          font-size: 1.5rem;
          font-weight: 800;
        }
        .feature-ideas-success p {
          margin: 0 0 1.25rem;
          color: var(--text-secondary);
        }
        .feature-ideas-success-actions {
          display: flex;
          gap: 0.6rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        @media (max-width: 900px) {
          .feature-ideas-layout {
            grid-template-columns: 1fr;
          }
          .feature-ideas-sidebar {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}

function SubmitIdeaModal({ onClose, onSubmitted }) {
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState(['New Feature']);
  const [submitting, setSubmitting] = useState(false);

  const toggleTopic = (t) => {
    setTopics((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= MAX_FEATURE_IDEA_TOPICS) return prev;
      return [...prev, t];
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !topics.length) {
      addToast('Title, description, and at least one topic are required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/college/feature-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim().slice(0, MAX_FEATURE_IDEA_TITLE),
          description: description.trim().slice(0, MAX_FEATURE_IDEA_DESCRIPTION),
          topics,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not submit idea');
      onSubmitted(body.idea);
    } catch (err) {
      addToast(err.message || 'Could not submit idea', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feature-ideas-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="submit-idea-title">
      <div className="feature-ideas-modal">
        <div className="feature-ideas-modal-header">
          <h2 id="submit-idea-title">Tell us your Idea</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" disabled={submitting}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.85rem' }}>
          <div>
            <label className="form-label" htmlFor="idea-title">
              Idea title
            </label>
            <input
              id="idea-title"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_FEATURE_IDEA_TITLE}
              placeholder="Short, specific title"
              required
              disabled={submitting}
              autoFocus
            />
          </div>
          <div>
            <label className="form-label" htmlFor="idea-desc">
              Description
            </label>
            <textarea
              id="idea-desc"
              className="form-input"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_FEATURE_IDEA_DESCRIPTION}
              placeholder="What problem does this solve? Who benefits?"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <div className="form-label">Choose up to {MAX_FEATURE_IDEA_TOPICS} topics</div>
            <div className="feature-ideas-topic-grid">
              {FEATURE_IDEA_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`feature-ideas-topic-chip${topics.includes(t) ? ' is-selected' : ''}`}
                  onClick={() => toggleTopic(t)}
                  disabled={submitting}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuccessModal({ idea, onClose, onView, onAddAnother }) {
  return (
    <div className="feature-ideas-modal-backdrop" role="dialog" aria-modal="true">
      <div className="feature-ideas-modal">
        <div className="feature-ideas-modal-header">
          <span />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="feature-ideas-success">
          <h2>Idea submitted</h2>
          <p>
            Thanks — <strong>{idea?.title || 'your idea'}</strong> is on the board with status Pending approval.
            Other colleges can view and vote on it.
          </p>
          <div className="feature-ideas-success-actions">
            <button type="button" className="btn btn-outline" onClick={onView}>
              View Idea
            </button>
            <button type="button" className="btn btn-primary" onClick={onAddAnother}>
              Add new Idea
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ idea, onClose, onVote }) {
  if (!idea) return null;
  return (
    <div className="feature-ideas-modal-backdrop" role="dialog" aria-modal="true">
      <div className="feature-ideas-modal">
        <div className="feature-ideas-modal-header">
          <h2 style={{ fontSize: '1.1rem' }}>{idea.title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
          <button
            type="button"
            className={`feature-ideas-vote${idea.voted_by_me ? ' is-voted' : ''}`}
            onClick={onVote}
          >
            <ChevronUp size={18} />
            <span>{idea.vote_count}</span>
          </button>
          <span className={`badge ${FEATURE_IDEA_STATUS_TONE[idea.status] || 'badge-gray'}`}>{idea.status}</span>
        </div>
        <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 1rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {idea.description}
        </p>
        <div className="feature-ideas-meta">
          {(idea.topics || []).map((t) => (
            <span key={t} className="feature-ideas-topic">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
