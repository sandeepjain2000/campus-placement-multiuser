'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, FileText, MessageSquare, Search, Send } from 'lucide-react';
import '@/components/ip/ip-employer-messages-gemini.css';

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
  if (!value) return '';
  const d = new Date(value);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatBubbleTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function counterpartName(t, role) {
  if (role === 'employer') return t.candidate_name || 'Candidate';
  return t.company_name || t.employer_name || 'Employer';
}

function roleLine(t) {
  if (t.internship_title) return t.internship_title;
  if (t.candidate_specialization) return t.candidate_specialization;
  if (t.candidate_degree) return t.candidate_degree;
  return t.subject || 'Conversation';
}

function subtitleLine(t, role) {
  if (role === 'employer') {
    return t.candidate_college || null;
  }
  return t.employer_name && t.company_name && t.employer_name !== t.company_name
    ? t.employer_name
    : null;
}

/**
 * Split-pane inbox from gemini-tsx-handoff/mocks/redesigned_employer_messages.html.
 * Shared by employer + candidate with role-aware labels.
 */
export default function MessagesSplitPane({ role = 'employer' }) {
  const isEmployer = role === 'employer';
  const base = isEmployer ? '/employer/messages' : '/candidate/messages';
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get('thread') || '';
  const feedRef = useRef(null);

  const [threads, setThreads] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(threadFromUrl);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  const loadThreads = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/ip/messages/threads');
      const data = await res.json();
      setThreads(data.items || []);
    } catch {
      setThreads([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (threadFromUrl) setSelectedId(threadFromUrl);
  }, [threadFromUrl]);

  const unreadCount = useMemo(
    () => threads.filter((t) => Number(t.unread_count) > 0).length,
    [threads]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === 'unread' && !(Number(t.unread_count) > 0)) return false;
      if (!q) return true;
      const hay = `${counterpartName(t, role)} ${t.internship_title || ''} ${t.subject || ''} ${t.last_message || ''} ${t.candidate_college || ''} ${t.employer_name || ''} ${t.company_name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [threads, search, tab, role]);

  const loadThread = useCallback(
    async (id) => {
      if (!id) {
        setThread(null);
        setMessages([]);
        return;
      }
      setLoadingThread(true);
      setError('');
      try {
        const res = await fetch(`/api/ip/messages/threads/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Thread not found');
        setThread(data.thread);
        setMessages(data.messages || []);
        await loadThreads();
      } catch (e) {
        setError(e.message);
        setThread(null);
        setMessages([]);
      } finally {
        setLoadingThread(false);
      }
    },
    [loadThreads]
  );

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
    else {
      setThread(null);
      setMessages([]);
    }
  }, [selectedId, loadThread]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, selectedId]);

  function selectThread(id) {
    setSelectedId(id);
    router.replace(id ? `${base}?thread=${encodeURIComponent(id)}` : base, { scroll: false });
  }

  async function send(e) {
    e?.preventDefault?.();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/ip/messages/threads/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setDraft('');
      await loadThread(selectedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function archiveSelected() {
    if (!selectedId || !thread) return;
    try {
      const res = await fetch(`/api/ip/messages/threads/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Archive failed');
      showToast('Conversation archived');
      selectThread('');
      await loadThreads();
    } catch (err) {
      setError(err.message);
    }
  }

  function openResume() {
    const url = thread?.candidate_resume_url;
    if (url) {
      window.open(url, '_blank', 'noreferrer');
      return;
    }
    showToast('No resume on file for this candidate yet.');
  }

  const activeName = thread ? counterpartName(thread, role) : isEmployer ? 'candidate' : 'employer';
  const bannerTitle = isEmployer ? 'Candidate Communications Inbox' : 'Employer Communications Inbox';
  const bannerDesc = isEmployer
    ? 'Direct messaging hub for discussing interview availability, project briefs, and application updates.'
    : 'Direct messaging hub for discussing interviews, offers, and application updates with employers.';
  const searchPlaceholder = isEmployer
    ? 'Search candidates or roles...'
    : 'Search employers or roles...';

  return (
    <div className="ip-emp-msg">
      {toast ? <div className="ip-em-toast">{toast}</div> : null}

      <div className="ip-em-banner">
        <div>
          <h1>{bannerTitle}</h1>
          <p>{bannerDesc}</p>
        </div>
        <div className="ip-em-count">
          <MessageSquare className="size-4" aria-hidden />
          <span>
            {threads.length} Active Conversation{threads.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="ip-em-split">
        <aside className="ip-em-list">
          <div className="ip-em-list-head">
            <div className="ip-em-search">
              <Search aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Search conversations"
              />
            </div>
            <div className="ip-em-tabs">
              <button
                type="button"
                className={`ip-em-tab${tab === 'all' ? ' ip-em-tab--on' : ''}`}
                onClick={() => setTab('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`ip-em-tab${tab === 'unread' ? ' ip-em-tab--on' : ''}`}
                onClick={() => setTab('unread')}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          <div className="ip-em-list-body">
            {loadingList ? (
              <p className="ip-em-empty-list">Loading…</p>
            ) : filtered.length ? (
              filtered.map((t) => {
                const unread = Number(t.unread_count) > 0;
                const on = t.id === selectedId;
                const name = counterpartName(t, role);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`ip-em-item${on ? ' ip-em-item--on' : ''}`}
                    onClick={() => selectThread(t.id)}
                  >
                    <div className="ip-em-avatar">
                      {initials(name)}
                      {unread ? <span className="ip-em-unread-dot" aria-hidden /> : null}
                    </div>
                    <div className="ip-em-item-main">
                      <div className="ip-em-item-top">
                        <strong>{name}</strong>
                        <span>{formatWhen(t.last_message_at || t.updated_at)}</span>
                      </div>
                      <p className="ip-em-item-role">{roleLine(t)}</p>
                      <p className="ip-em-item-preview">
                        {t.last_message || t.subject || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="ip-em-empty-list">No conversations match.</p>
            )}
          </div>
        </aside>

        <section className="ip-em-thread">
          {!selectedId ? (
            <div className="ip-em-thread-empty">Select a conversation to read and reply.</div>
          ) : loadingThread && !thread ? (
            <div className="ip-em-thread-empty">Loading thread…</div>
          ) : !thread ? (
            <div className="ip-em-thread-empty">{error || 'Thread not found.'}</div>
          ) : (
            <>
              <div className="ip-em-thread-head">
                <div className="ip-em-thread-person">
                  <div className="ip-em-avatar">{initials(counterpartName(thread, role))}</div>
                  <div>
                    <h3>{counterpartName(thread, role)}</h3>
                    <p>
                      {roleLine(thread)}
                      {subtitleLine(thread, role) ? (
                        <>
                          {' '}
                          — <span>{subtitleLine(thread, role)}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="ip-em-thread-actions">
                  {isEmployer && thread.candidate_cgpa != null && thread.candidate_cgpa !== '' ? (
                    <span className="ip-em-cgpa">{thread.candidate_cgpa} CGPA</span>
                  ) : null}
                  {isEmployer ? (
                    <button type="button" className="ip-em-btn ip-em-btn--resume" onClick={openResume}>
                      <FileText className="size-3.5" aria-hidden />
                      Resume
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ip-em-btn ip-em-btn--ghost"
                    title="Archive conversation"
                    onClick={archiveSelected}
                  >
                    <Archive className="size-3.5" aria-hidden />
                    Archive
                  </button>
                </div>
              </div>

              {error ? <div className="ip-em-alert">{error}</div> : null}

              <div className="ip-em-feed" ref={feedRef}>
                <span className="ip-em-secure">Secure Application Thread</span>
                {messages.map((m) => {
                  const mine = isEmployer
                    ? m.sender_role === 'employer' || m.sender_user_id === thread.employer_user_id
                    : m.sender_role === 'candidate' || m.sender_user_id === thread.candidate_user_id;
                  return (
                    <div
                      key={m.id}
                      className={`ip-em-bubble-row ${mine ? 'ip-em-bubble-row--me' : 'ip-em-bubble-row--them'}`}
                    >
                      <div className={`ip-em-bubble ${mine ? 'ip-em-bubble--me' : 'ip-em-bubble--them'}`}>
                        <p>{m.body}</p>
                        <time dateTime={m.sent_at}>{formatBubbleTime(m.sent_at)}</time>
                      </div>
                    </div>
                  );
                })}
                {!messages.length ? (
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                    No messages yet — say hello below.
                  </p>
                ) : null}
              </div>

              <form className="ip-em-composer" onSubmit={send}>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Reply to ${activeName}...`}
                  aria-label="Reply"
                />
                <button
                  type="submit"
                  className="ip-em-btn ip-em-btn--primary"
                  disabled={sending || !draft.trim()}
                >
                  <Send className="size-3.5" aria-hidden />
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
