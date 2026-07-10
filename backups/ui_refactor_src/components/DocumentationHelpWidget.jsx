'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Sparkles, MessageCircleQuestion } from 'lucide-react';
import { getDevScreenId } from '@/config/devScreenIds';
import { appendClientDebugLog } from '@/lib/clientDebugLog';

const GLOBAL_TAG = 'GLOBAL';

export default function DocumentationHelpWidget() {
  const pathname = usePathname();
  const screenTag = getDevScreenId(pathname) || GLOBAL_TAG;

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [scope, setScope] = useState('');
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
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setSuggestions([]);
        setHint(data.hint || 'Run documentation FAQ migration to enable help content.');
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
        setError(data.error || 'Could not load help');
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

  const runSearch = useCallback(async (q) => {
    const text = String(q || '').trim();
    if (!text) {
      setMatches([]);
      setScope('');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `/api/help/faq?screen=${encodeURIComponent(screenTag)}&q=${encodeURIComponent(text)}`
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setMatches([]);
        setHint(data.hint || '');
        appendClientDebugLog({
          source: 'help_faq',
          action: 'search',
          screenTag,
          queryLen: text.length,
          status: res.status,
          hint: data.hint,
          error: data.error,
        });
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Search failed');
        setMatches([]);
        appendClientDebugLog({
          source: 'help_faq',
          action: 'search',
          screenTag,
          queryLen: text.length,
          status: res.status,
          error: data.error,
        });
        return;
      }
      const matchList = Array.isArray(data.matches) ? data.matches : [];
      setMatches(matchList);
      setScope(data.scope || '');
      appendClientDebugLog({
        source: 'help_faq',
        action: 'search',
        screenTag,
        queryLen: text.length,
        status: res.status,
        scope: data.scope,
        ai: Boolean(data.ai),
        matchCount: matchList.length,
        helpAi: data.helpAi || null,
      });
    } catch (err) {
      setError('Search failed (network)');
      setMatches([]);
      appendClientDebugLog({
        source: 'help_faq',
        action: 'search',
        screenTag,
        queryLen: text.length,
        networkError: String(err?.message || err),
      });
    } finally {
      setLoading(false);
    }
  }, [screenTag]);

  useEffect(() => {
    if (!open) return undefined;
    const t = query.trim();
    if (!t) {
      setMatches([]);
      setScope('');
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
                  Screen <strong>{screenTag}</strong> · keyword search; AI suggests FAQs when nothing matches
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

            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
              <p className="text-secondary" style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem' }}>
                Try a suggested question, or type your own below.
              </p>

              {hint && (
                <p className="text-xs text-warning-600" style={{ margin: '0 0 0.75rem' }}>
                  {hint}
                </p>
              )}
              {error && (
                <p className="text-xs" style={{ margin: '0 0 0.75rem', color: 'var(--danger-600)' }}>
                  {error}
                </p>
              )}

              {loading && !matches.length && suggestions.length === 0 && !query.trim() && (
                <p className="text-tertiary text-sm">Loading…</p>
              )}

              {suggestionRows.length > 0 && matches.length === 0 && (
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

              {matches.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {scope && (
                    <p className="text-xs text-tertiary" style={{ margin: '0 0 0.5rem' }}>
                      {scope === 'screen' && 'Matches on this screen'}
                      {scope === 'global' && 'No match on this screen — showing global FAQs'}
                      {scope === 'any' && 'No screen/global match — showing other topics'}
                      {scope === 'ai' && 'No keyword match — AI chose the closest FAQs from your library'}
                      {scope === 'none' && 'No matching FAQs yet'}
                    </p>
                  )}
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {matches.map((row) => (
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
                        {row.screen_tag && row.screen_tag !== screenTag && (
                          <div className="text-xs text-tertiary" style={{ marginTop: '0.5rem' }}>
                            Tag: {row.screen_tag}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={onSubmit} style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <label htmlFor="documentation-help-query" className="form-label text-xs" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Ask a question
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="documentation-help-query"
                    className="form-input"
                    placeholder="e.g. How do I upload my resume?"
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
            </div>
          </aside>
        </>
      )}
    </>
  );
}
