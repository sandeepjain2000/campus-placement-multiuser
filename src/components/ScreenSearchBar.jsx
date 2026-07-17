'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { filterScreensForRole } from '@/config/screenRegistry';

export default function ScreenSearchBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [aiMatches, setAiMatches] = useState([]);
  const wrapRef = useRef(null);

  const localMatches = useMemo(() => {
    if (!role) return [];
    return filterScreensForRole(role, q, 30);
  }, [role, q]);

  const runAi = useCallback(async () => {
    if (!q.trim()) return;
    setAiLoading(true);
    setAiNote('');
    setAiMatches([]);
    try {
      const res = await fetch('/api/screens/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiNote(data.error || 'AI search failed');
        return;
      }
      if (!data.openaiConfigured) {
        setAiNote('Smart screen matching is not available yet. Try searching by screen name.');
        return;
      }
      const matches = Array.isArray(data.matches) ? data.matches : [];
      setAiMatches(matches);
      setAiNote(matches.length ? 'Smart matches (click to open):' : 'No smart matches — try different words.');
    } catch {
      setAiNote('AI search failed');
    } finally {
      setAiLoading(false);
    }
  }, [q]);

  useEffect(() => {
    setOpen(false);
    setQ('');
    setAiNote('');
    setAiMatches([]);
  }, [pathname]);

  useEffect(() => {
    const clear = () => {
      setOpen(false);
      setQ('');
      setAiNote('');
      setAiMatches([]);
    };
    window.addEventListener('placementhub-clear-search', clear);
    return () => window.removeEventListener('placementhub-clear-search', clear);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = wrapRef.current?.querySelector('input[type="search"]');
        if (input) {
          input.focus();
          setOpen(true);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (status === 'loading' || !role) return null;

  return (
    <div className="screen-search-bar" ref={wrapRef} style={{ position: 'relative' }}>
      <div
        className="screen-search-inline"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '0.15rem 0.5rem 0.15rem 0.35rem',
          background: 'var(--bg-primary)',
          minWidth: 'min(200px, 42vw)',
        }}
      >
        <Search size={16} aria-hidden style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
        <input
          type="search"
          className="form-input"
          placeholder="Search screens (Ctrl+K)…"
          value={q}
          aria-label="Search dashboard screens"
          title="Filter screens by name, path, or tag (e.g. S-11). Shortcut: Ctrl+K or ⌘K"
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            setAiMatches([]);
            setAiNote('');
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          style={{
            border: 'none',
            boxShadow: 'none',
            flex: 1,
            minWidth: 0,
            padding: '0.35rem 0.25rem',
            background: 'transparent',
          }}
        />
      </div>
      {open && (
        <div
          className="card screen-search-popover"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: 'min(420px, 92vw)',
            zIndex: 80,
            padding: '0.75rem',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          }}
        >
          <label className="form-label" style={{ marginBottom: '0.35rem' }}>
            Screens ({role.replace(/_/g, ' ')})
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" disabled={aiLoading || !q.trim()} onClick={runAi}>
              <Sparkles size={14} style={{ marginRight: 4 }} aria-hidden />
              {aiLoading ? '…' : 'Smart match (AI)'}
            </button>
            {aiNote && <span className="text-xs text-secondary" style={{ flex: '1 1 100%' }}>{aiNote}</span>}
          </div>
          <div style={{ marginTop: '0.65rem', maxHeight: 280, overflowY: 'auto' }}>
            {aiMatches.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '0 0 0.75rem', padding: 0, display: 'grid', gap: '0.35rem' }}>
                {aiMatches.map((s) => (
                  <li key={`ai-${s.href}`}>
                    <Link
                      href={s.href}
                      onClick={() => setOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.45rem 0.5rem',
                        borderRadius: 6,
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--accent-500)',
                        background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.label}</div>
                      <div className="text-xs text-tertiary">
                        {s.section} · <code>{s.screenId}</code>
                      </div>
                      <div className="text-xs text-secondary">{s.href}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {localMatches.length > 0 && (
              <>
                <div className="text-xs text-tertiary" style={{ marginBottom: '0.35rem' }}>
                  Keyword matches
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 0.5rem', padding: 0, display: 'grid', gap: '0.35rem' }}>
                  {localMatches.map((s) => (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        className="screen-search-hit"
                        onClick={() => setOpen(false)}
                        style={{
                          display: 'block',
                          padding: '0.45rem 0.5rem',
                          borderRadius: 6,
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                          background: pathname === s.href ? 'var(--bg-secondary)' : 'transparent',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.label}</div>
                        <div className="text-xs text-tertiary">
                          {s.section} · <code>{s.screenId}</code>
                        </div>
                        <div className="text-xs text-secondary">{s.href}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {localMatches.length === 0 && aiMatches.length === 0 && (
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                {q.trim()
                  ? 'No keyword matches — try Smart match if NVIDIA or OpenAI API keys are set.'
                  : 'Type a screen name, menu label, or tag (e.g. S-11) to jump there.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
