'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Sparkles, MessageCircleQuestion, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
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
        <Button
          type="button"
          className="documentation-help-fab fixed right-5 bottom-5 z-40 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
          title="Help — answers from your documentation (Esc to close when open)"
          aria-expanded="false"
          aria-label="Open help panel"
        >
          <Sparkles data-icon="inline-start" aria-hidden />
          Help
        </Button>
      )}

      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            showCloseButton={false}
            className="documentation-help-panel top-0 right-0 bottom-0 left-auto flex h-svh w-full max-w-[420px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-[420px]"
          >
            <DialogHeader className="flex-row items-start justify-between gap-3 border-b p-4">
              <div>
                <DialogTitle id="documentation-help-title" className="flex items-center gap-2">
                  <MessageCircleQuestion aria-hidden />
                  PlacementHub help
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Screen <strong>{screenTag}</strong> · full help library + AI (like Cursor on docs/help)
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close help"
              >
                <X />
              </Button>
            </DialogHeader>

            <div
              style={{
                padding: '1rem 1rem 0.75rem',
                borderBottom: '1px solid var(--border-default)',
                flexShrink: 0,
              }}
            >
              <form onSubmit={onSubmit}>
                <Field>
                  <FieldLabel htmlFor="documentation-help-query">Ask a Question</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="documentation-help-query"
                      name="documentation-help-query"
                      placeholder="How do I upload assessment results CSV?…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                    />
                    <InputGroupAddon align="inline-end">
                      <Button type="submit" size="sm" disabled={loading}>Search</Button>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </form>
              <p className="text-secondary" style={{ margin: '0.65rem 0 0', fontSize: '0.8125rem' }}>
                Answers are drawn from the in-app help library. AI-powered answers may be limited when smart search is not enabled.
              </p>
              {hint ? <Alert className="mt-3"><AlertDescription>{hint}</AlertDescription></Alert> : null}
              {error ? <Alert className="mt-3" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
            </div>

            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {loading && !aiAnswer && suggestions.length === 0 && !query.trim() && (
                <div className="flex flex-col gap-2" aria-label="Loading help">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-9 w-4/5" />
                </div>
              )}

              {aiAnswer && (
                <Card className="mb-4 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Sparkles aria-hidden />
                    Answer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                  <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
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
                  </CardContent>
                </Card>
              )}

              {suggestionRows.length > 0 && !query.trim() && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {suggestionRows.map((row) => (
                    <Button
                      key={row.id}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start whitespace-normal text-left"
                      onClick={() => pickSuggestion(row.question)}
                    >
                      {row.question}
                    </Button>
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
                      <li key={row.id}>
                        <Card size="sm">
                          <CardHeader><CardTitle>{row.question}</CardTitle></CardHeader>
                          <CardContent className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {row.answer}
                          </CardContent>
                        </Card>
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
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
