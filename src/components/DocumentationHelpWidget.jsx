'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Sparkles, MessageCircleQuestion, ExternalLink } from 'lucide-react';
import { getDevScreenId } from '@/config/devScreenIds';
import { appendClientDebugLog } from '@/lib/clientDebugLog';
import { clientSafeMessageFromBody, stripInternalApiFields } from '@/lib/publicApiErrorClient';

const GLOBAL_TAG = 'GLOBAL';

/**
 * @param {{ fullDocHref?: string }} props
 */
export default function DocumentationHelpWidget({ fullDocHref = '/dashboard/help' }) {
  const pathname = usePathname();
  const screenTag = getDevScreenId(pathname) || GLOBAL_TAG;

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiSources, setAiSources] = useState([]);
  const [retrievalMode, setRetrievalMode] = useState('');
  const [relatedFaqs, setRelatedFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const searchDebounceRef = useRef(null);

  const loadSuggestions = useCallback(async () => {
    setError('');
    setHint('');
    setLoading(true);
    try {
      const res = await fetch(`/api/help/faq?screen=${encodeURIComponent(screenTag)}`);
      const data = stripInternalApiFields(await res.json().catch(() => ({})));
      if (res.status === 503) {
        setSuggestions([]);
        setHint('Help is temporarily unavailable. Please try again later or open full documentation.');
        appendClientDebugLog({
          source: 'help_faq',
          action: 'suggestions',
          screenTag,
          status: res.status,
          hint: data.hint,
          error: data.error,
          suggestionCount: 0,
        });
        return;
      }
      if (!res.ok) {
        setError(clientSafeMessageFromBody(data, 'Could not load help'));
        setSuggestions([]);
        appendClientDebugLog({
          source: 'help_faq',
          action: 'suggestions',
          screenTag,
          status: res.status,
          error: data.error,
          suggestionCount: 0,
        });
        return;
      }
      const list = Array.isArray(data.suggestions) ? data.suggestions : [];
      setSuggestions(list);
      appendClientDebugLog({
        source: 'help_faq',
        action: 'suggestions',
        screenTag,
        status: res.status,
        suggestionCount: list.length,
      });
    } catch (err) {
      setError('Network error loading help');
      setSuggestions([]);
      appendClientDebugLog({
        source: 'help_faq',
        action: 'suggestions',
        screenTag,
        networkError: String(err?.message || err),
      });
    } finally {
      setLoading(false);
    }
  }, [screenTag]);

  useEffect(() => {
    if (open) void loadSuggestions();
  }, [open, loadSuggestions]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const roleHint = useMemo(() => {
    const p = pathname || '';
    if (p.includes('/dashboard/employer')) return 'employer';
    if (p.includes('/dashboard/college')) return 'college';
    if (p.includes('/dashboard/student')) return 'student';
    if (p.includes('/dashboard/admin')) return 'super_admin';
    return null;
  }, [pathname]);

  const askHelp = useCallback(async (q) => {
    const text = String(q || '').trim();
    if (!text) {
      setAiAnswer('');
      setAiSources([]);
      setRetrievalMode('');
      setRelatedFaqs([]);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/help/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          screenTag,
          roleHint,
          docBasePath: fullDocHref,
        }),
      });
      const data = stripInternalApiFields(await res.json().catch(() => ({})));
      if (res.status === 503) {
        setAiAnswer('');
        setHint(data.error || 'Help AI is not indexed yet. Open full documentation below.');
        appendClientDebugLog({
          source: 'help_ask',
          action: 'ask',
          screenTag,
          queryLen: text.length,
          status: res.status,
        });
        return;
      }
      if (!res.ok) {
        setError(clientSafeMessageFromBody(data, 'Could not answer your question'));
        setAiAnswer('');
        return;
      }
      setAiAnswer(data.answer || '');
      setAiSources(Array.isArray(data.sources) ? data.sources : []);
      setRetrievalMode(data.retrievalMode || '');
      setRelatedFaqs(Array.isArray(data.relatedFaqs) ? data.relatedFaqs : []);
      appendClientDebugLog({
        source: 'help_ask',
        action: 'ask',
        screenTag,
        queryLen: text.length,
        status: res.status,
        retrievalMode: data.retrievalMode,
        sourceCount: (data.sources || []).length,
      });
    } catch (err) {
      setError('Network error — try again or open full documentation');
      setAiAnswer('');
      appendClientDebugLog({
        source: 'help_ask',
        action: 'ask',
        screenTag,
        networkError: String(err?.message || err),
      });
    } finally {
      setLoading(false);
    }
  }, [screenTag, roleHint, fullDocHref]);

  const runSearch = useCallback(async (q) => {
    await askHelp(q);
  }, [askHelp]);

  useEffect(() => {
    if (!open) return undefined;
    const t = query.trim();
    if (!t) {
      setAiAnswer('');
      setAiSources([]);
      setRetrievalMode('');
      setRelatedFaqs([]);
      return undefined;
    }
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      void runSearch(query);
    }, 320);
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [query, open, runSearch]);

  const suggestionRows = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return suggestions;
    return suggestions.filter((row) => {
      const qtext = (row.question || '').toLowerCase();
      const atext = (row.answer || '').toLowerCase();
      return qtext.includes(t) || atext.includes(t);
    });
  }, [suggestions, query]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    void runSearch(query);
  };

  const pickSuggestion = (question) => {
    setQuery(question);
    void runSearch(question);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          className="documentation-help-fab"
          onClick={() => setOpen(true)}
          title="Help — answers from your documentation (Esc to close when open)"
          aria-expanded="false"
          aria-label="Open help panel"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            right: '1.25rem',
            zIndex: 1200,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1rem',
            borderRadius: '999px',
            border: '1px solid var(--border-default)',
            background: 'var(--primary-600)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          }}
        >
          <Sparkles size={18} aria-hidden />
          Help
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label="Close help overlay"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1298,
              background: 'rgba(15,23,42,0.35)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <aside
            className="documentation-help-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="documentation-help-title"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(420px, 100vw)',
              zIndex: 1299,
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border-default)',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              fontSize: '0.875rem',
            }}
          >
            <header
              style={{
                padding: '1rem 1rem 0.75rem',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div>
                <h2
                  id="documentation-help-title"
                  style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <MessageCircleQuestion size={20} style={{ opacity: 0.9 }} aria-hidden />
                  PlacementHub help
                </h2>
                <p className="text-xs text-tertiary" style={{ margin: '0.35rem 0 0' }}>
                  Screen <strong>{screenTag}</strong> · full help library + AI (like Cursor on docs/help)
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setOpen(false)}
                aria-label="Close help"
              >
                <X size={20} />
              </button>
            </header>

            <div
              style={{
                padding: '1rem 1rem 0.75rem',
                borderBottom: '1px solid var(--border-default)',
                flexShrink: 0,
              }}
            >
              <form onSubmit={onSubmit}>
                <label htmlFor="documentation-help-query" className="form-label text-xs" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Ask a question
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="documentation-help-query"
                    className="form-input"
                    placeholder="e.g. How do I upload assessment results CSV?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    Search
                  </button>
                </div>
              </form>
              <p className="text-secondary" style={{ margin: '0.65rem 0 0', fontSize: '0.8125rem' }}>
                Answers are drawn from the in-app help library. AI-powered answers may be limited when smart search is not enabled.
              </p>
              {hint && (
                <p className="text-xs text-warning-600" style={{ margin: '0.5rem 0 0' }}>
                  {hint}
                </p>
              )}
              {error && (
                <p className="text-xs" style={{ margin: '0.5rem 0 0', color: 'var(--danger-600)' }}>
                  {error}
                </p>
              )}
            </div>

            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {loading && !aiAnswer && suggestions.length === 0 && !query.trim() && (
                <p className="text-tertiary text-sm">Loading…</p>
              )}

              {aiAnswer && (
                <div
                  className="card"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.85rem',
                    background: 'var(--primary-50, #eef2ff)',
                    border: '1px solid var(--primary-200, #c7d2fe)',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={16} aria-hidden />
                    Answer
                  </div>
                  <div className="text-secondary" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                    {aiAnswer}
                  </div>
                  {aiSources.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="text-xs text-tertiary" style={{ marginBottom: '0.35rem' }}>
                        Sources{retrievalMode ? ` · ${retrievalMode}` : ''}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {aiSources.slice(0, 4).map((src) => (
                          <li key={src.chunkKey} style={{ fontSize: '0.8125rem' }}>
                            <Link href={src.href} onClick={() => setOpen(false)} style={{ color: 'var(--text-link)', fontWeight: 600 }}>
                              {src.title}
                            </Link>
                            {src.section ? (
                              <span className="text-tertiary" style={{ marginLeft: '0.35rem' }}>
                                ({src.section})
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {suggestionRows.length > 0 && !query.trim() && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {suggestionRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => pickSuggestion(row.question)}
                      style={{
                        textAlign: 'left',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '999px',
                        border: '1px solid var(--border-default)',
                        background: 'var(--primary-50, #eef2ff)',
                        color: 'var(--primary-800, #3730a3)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {row.question}
                    </button>
                  ))}
                </div>
              )}

              {relatedFaqs.length > 0 && query.trim() && (
                <div style={{ marginBottom: '1rem' }}>
                  <p className="text-xs text-tertiary" style={{ margin: '0 0 0.5rem' }}>
                    Related FAQ entries
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {relatedFaqs.map((row) => (
                      <li
                        key={row.id}
                        className="card"
                        style={{
                          padding: '0.75rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{row.question}</div>
                        <div className="text-secondary" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {row.answer}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {loading && query.trim() && !aiAnswer && (
                <p className="text-tertiary text-sm">Searching help documentation…</p>
              )}
            </div>

            <div
              style={{
                padding: '0.75rem 1rem 1rem',
                borderTop: '1px solid var(--border-default)',
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
                <Link
                  href={fullDocHref}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--text-link)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  <ExternalLink size={16} aria-hidden />
                  Open full help documentation
                </Link>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
