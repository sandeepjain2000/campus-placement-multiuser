'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ChevronUp, Lightbulb, Search } from 'lucide-react';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import {
  FEATURE_IDEA_STATUSES,
  FEATURE_IDEA_TOPICS,
  MAX_FEATURE_IDEA_DESCRIPTION,
  MAX_FEATURE_IDEA_TITLE,
  MAX_FEATURE_IDEA_TOPICS,
} from '@/lib/featureIdeas';
import { timeAgo } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AdminFilterSelect from '@/components/AdminFilterSelect';

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
    <div className="animate-fadeIn feature-ideas-page flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <h1 className="text-foreground m-0 text-2xl font-semibold tracking-tight">Feature Ideas</h1>
          <p className="text-muted-foreground m-0 text-sm">Suggest product improvements for PlacementHub. Vote on ideas from other colleges.</p>
        </div>
        <Button type="button" onClick={() => setModalOpen(true)}>
          + Submit Idea
        </Button>
      </div>

      <div className="feature-ideas-layout">
        <Card className="feature-ideas-sidebar">
          <CardContent>
          <div className="feature-ideas-sidebar-block">
            <h3>Status</h3>
            <Button
              type="button"
              className={`feature-ideas-filter${!status ? ' is-active' : ''}`}
              variant="ghost"
              onClick={() => setStatus('')}
            >
              All
            </Button>
            {FEATURE_IDEA_STATUSES.map((s) => (
              <Button
                key={s}
                type="button"
                className={`feature-ideas-filter${status === s ? ' is-active' : ''}`}
                variant="ghost"
                onClick={() => setStatus(status === s ? '' : s)}
              >
                <span className={`feature-ideas-status-dot status-${s.replace(/\s+/g, '-').toLowerCase()}`} />
                <span className="feature-ideas-filter-label">{s}</span>
                <span className="feature-ideas-filter-count">{statusCounts[s] || 0}</span>
              </Button>
            ))}
          </div>
          <div className="feature-ideas-sidebar-block">
            <h3>Topics</h3>
            {FEATURE_IDEA_TOPICS.map((t) => (
              <Button
                key={t}
                type="button"
                className={`feature-ideas-filter${topic === t ? ' is-active' : ''}`}
                variant="ghost"
                onClick={() => setTopic(topic === t ? '' : t)}
              >
                <span className="feature-ideas-filter-label">#{t}</span>
                <span className="feature-ideas-filter-count">{topicCounts[t] || 0}</span>
              </Button>
            ))}
          </div>
          </CardContent>
        </Card>

        <section className="feature-ideas-main">
          <div className="feature-ideas-toolbar">
            <div className="feature-ideas-search">
              <Search size={16} aria-hidden />
              <Input
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                placeholder="Search ideas…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQ(searchDraft.trim());
                }}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setQ(searchDraft.trim())}>
                Search
              </Button>
            </div>
            <AdminFilterSelect
              aria-label="Sort ideas"
              className="h-9 min-w-[140px] w-auto"
              value={sort}
              onValueChange={setSort}
              emptyMapsToAll={false}
              items={[
                { label: 'Trending', value: 'trending' },
                { label: 'Newest', value: 'newest' },
              ]}
            />
          </div>

          {isLoading ? (
            <PageLoading message="Loading ideas…" inline />
          ) : items.length === 0 ? (
            <Alert>
              <Lightbulb aria-hidden />
              <AlertTitle>No Ideas Yet</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                <p>Be the first college to submit a product idea.</p>
              <Button type="button" onClick={() => setModalOpen(true)}>
                Submit Idea
              </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="feature-ideas-list">
              {items.map((idea) => (
                <Card key={idea.id}>
                  <CardContent className="feature-ideas-row">
                  <Button
                    type="button"
                    className={`feature-ideas-vote${idea.voted_by_me ? ' is-voted' : ''}`}
                    variant="outline"
                    onClick={() => onVote(idea.id)}
                    aria-label={idea.voted_by_me ? 'Remove vote' : 'Upvote idea'}
                    title={idea.voted_by_me ? 'Remove vote' : 'Upvote'}
                  >
                    <ChevronUp size={18} />
                    <span>{idea.vote_count}</span>
                  </Button>
                  <Button
                    type="button"
                    className="feature-ideas-body"
                    variant="ghost"
                    onClick={() => setDetailIdea(idea)}
                  >
                    <div className="feature-ideas-title-row">
                      <h2>{idea.title}</h2>
                      <Badge variant="secondary">
                        {idea.status}
                      </Badge>
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
                  </Button>
                  </CardContent>
                </Card>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle id="submit-idea-title">Tell us your idea</DialogTitle>
          <DialogDescription>Describe the problem and choose the topics it affects.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
          <Field>
            <FieldLabel htmlFor="idea-title">Idea title</FieldLabel>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_FEATURE_IDEA_TITLE}
              placeholder="Short, specific title"
              required
              disabled={submitting}
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="idea-desc">Description</FieldLabel>
            <Textarea
              id="idea-desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_FEATURE_IDEA_DESCRIPTION}
              placeholder="What problem does this solve? Who benefits?"
              required
              disabled={submitting}
            />
          </Field>
          <Field>
            <FieldLabel>Choose up to {MAX_FEATURE_IDEA_TOPICS} topics</FieldLabel>
            <div className="feature-ideas-topic-grid">
              {FEATURE_IDEA_TOPICS.map((t) => (
                <Button
                  key={t}
                  type="button"
                  className={`feature-ideas-topic-chip${topics.includes(t) ? ' is-selected' : ''}`}
                  variant={topics.includes(t) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTopic(t)}
                  disabled={submitting}
                >
                  {t}
                </Button>
              ))}
            </div>
          </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Idea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuccessModal({ idea, onClose, onView, onAddAnother }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Idea submitted</DialogTitle>
          <DialogDescription>
            Thanks — <strong>{idea?.title || 'your idea'}</strong> is on the board with status Pending approval.
            Other colleges can view and vote on it.
          </DialogDescription>
        </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onView}>
              View Idea
            </Button>
            <Button type="button" onClick={onAddAnother}>
              Add new Idea
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailModal({ idea, onClose, onVote }) {
  if (!idea) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{idea.title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-3">
          <Button
            type="button"
            className={`feature-ideas-vote${idea.voted_by_me ? ' is-voted' : ''}`}
            variant="outline"
            onClick={onVote}
          >
            <ChevronUp size={18} />
            <span>{idea.vote_count}</span>
          </Button>
          <Badge variant="secondary">{idea.status}</Badge>
        </div>
        <p className="text-muted-foreground m-0 whitespace-pre-wrap leading-relaxed">
          {idea.description}
        </p>
        <div className="feature-ideas-meta">
          {(idea.topics || []).map((t) => (
            <span key={t} className="feature-ideas-topic">
              #{t}
            </span>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
