'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Database, Download, Play, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { SANDBOX_DEFAULT_PASSWORD } from '@/lib/sandboxCredentials';
import {
  DEMO_ACTION_GROUPS,
  DEMO_FLAT_ACTIONS,
  DEMO_PURGE_GROUPS,
  DEMO_PURGE_LIST_KEY_BY_ENTITY,
  demoPurgeRemainingCount,
  flattenDemoPurgeCandidates,
  formatDemoRunForDownload,
} from '@/lib/demoTesterConfig';

const ACTION_GROUPS = DEMO_ACTION_GROUPS;
const FLAT_ACTIONS = DEMO_FLAT_ACTIONS;
const PURGE_GROUPS = DEMO_PURGE_GROUPS;
const PURGE_LIST_KEY_BY_ENTITY = DEMO_PURGE_LIST_KEY_BY_ENTITY;
const purgeRemainingCount = demoPurgeRemainingCount;
const flattenPurgeCandidates = flattenDemoPurgeCandidates;
const formatRunForDownload = formatDemoRunForDownload;

/**
 * @param {{ variant?: 'page' | 'embed', focusSection?: 'apis' | 'purge' | null, compactHeader?: boolean, hideHeader?: boolean }} props
 */
export default function DemoDataTester({
  variant = 'page',
  focusSection = null,
  compactHeader = false,
  hideHeader = false,
}) {
  const purgeSectionRef = useRef(null);
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [apiDisabled, setApiDisabled] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [running, setRunning] = useState(null);
  const [counts, setCounts] = useState(() => {
    const init = {};
    for (const a of FLAT_ACTIONS) {
      if (!a.hideCount) init[a.id] = a.countDefault;
    }
    return init;
  });
  const [runs, setRuns] = useState([]);
  const [purgeCandidates, setPurgeCandidates] = useState(null);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeError, setPurgeError] = useState('');
  const [purgingKey, setPurgingKey] = useState(null);
  const [purgeNotice, setPurgeNotice] = useState('');
  const [purgeTypeFilter, setPurgeTypeFilter] = useState('all');
  const [selectedPurgeKey, setSelectedPurgeKey] = useState('');

  const purgeOptions = useMemo(
    () => flattenPurgeCandidates(purgeCandidates, purgeTypeFilter),
    [purgeCandidates, purgeTypeFilter],
  );

  const selectedPurgeItem = useMemo(
    () => purgeOptions.find((o) => o.optionKey === selectedPurgeKey) || null,
    [purgeOptions, selectedPurgeKey],
  );

  useEffect(() => {
    if (!purgeOptions.length) {
      setSelectedPurgeKey('');
      return;
    }
    if (selectedPurgeKey && !purgeOptions.some((o) => o.optionKey === selectedPurgeKey)) {
      setSelectedPurgeKey('');
    }
  }, [purgeOptions, selectedPurgeKey]);

  const loadPurgeCandidates = useCallback(async () => {
    if (apiDisabled) return;
    setPurgeLoading(true);
    setPurgeError('');
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const res = await fetch(`/api/demo/purge${qs}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setApiDisabled(true);
        return;
      }
      if (res.status === 503) {
        setPurgeError(json.error || 'Run migration 066 before purge.');
        setPurgeCandidates(null);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Failed to load purge list');
      setPurgeCandidates(json.candidates || {});
    } catch (e) {
      setPurgeError(e.message || 'Failed to load purge list');
      setPurgeCandidates(null);
    } finally {
      setPurgeLoading(false);
    }
  }, [apiDisabled, tenantId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCollegesLoading(true);
      try {
        const res = await fetch('/api/demo/colleges');
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (res.status === 403) {
          setApiDisabled(true);
          return;
        }
        if (!res.ok) throw new Error(json.error || 'Failed to load colleges');
        setColleges(Array.isArray(json.colleges) ? json.colleges : []);
      } catch {
        if (mounted) setColleges([]);
      } finally {
        if (mounted) setCollegesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!collegesLoading && !apiDisabled) {
      loadPurgeCandidates();
    }
  }, [collegesLoading, apiDisabled, loadPurgeCandidates]);

  useEffect(() => {
    if (focusSection !== 'purge' || !purgeSectionRef.current) return;
    const t = window.setTimeout(() => {
      purgeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [focusSection]);

  const purgeOne = useCallback(
    async (item) => {
      const key = `${item.entityType}:${item.entityId}`;
      setPurgingKey(key);
      try {
        const res = await fetch('/api/demo/purge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            entityType: item.entityType,
            entityId: item.entityId,
            tenantId: tenantId || undefined,
          }),
        });
        const json = await res.json().catch(() => ({}));
        setRuns((prev) => [
          {
            id: `purge-${Date.now()}`,
            action: `Purge ${item.entityType.replace(/_/g, ' ')}`,
            actionId: 'purge',
            at: json.timestamp || new Date().toISOString(),
            ok: res.ok && json.ok !== false,
            status: res.status,
            response: json,
          },
          ...prev,
        ]);
        if (res.ok && json.ok !== false) {
          const listKey = PURGE_LIST_KEY_BY_ENTITY[item.entityType];
          setPurgeCandidates((prev) => {
            if (!prev || !listKey) return prev;
            const next = {
              ...prev,
              [listKey]: (prev[listKey] || []).filter((row) => row.entityId !== item.entityId),
            };
            const left = purgeRemainingCount(next);
            setPurgeNotice(
              left > 0
                ? `Purged “${item.label}”. ${left} remaining — choose the next entity from the dropdown.`
                : `Purged “${item.label}”. No demo entities left for this campus filter — create more with Run above, or clear Campus.`,
            );
            setSelectedPurgeKey('');
            return next;
          });
          await loadPurgeCandidates();
        } else {
          setPurgeNotice(json.error ? `Purge failed: ${json.error}` : 'Purge failed.');
        }
      } catch (e) {
        setRuns((prev) => [
          {
            id: `purge-${Date.now()}`,
            action: `Purge ${item.entityType.replace(/_/g, ' ')}`,
            actionId: 'purge',
            at: new Date().toISOString(),
            ok: false,
            status: 0,
            response: { error: e.message || 'Network error' },
          },
          ...prev,
        ]);
      } finally {
        setPurgingKey(null);
      }
    },
    [loadPurgeCandidates, tenantId],
  );

  const runAction = useCallback(
    async (action) => {
      setRunning(action.id);
      try {
        const body = { tenantId: tenantId || undefined, ...(action.bodyExtra || {}) };
        if (!action.hideCount) {
          body.count = counts[action.id] ?? action.countDefault;
        }
        const res = await fetch(action.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        setRuns((prev) => [
          {
            id: `${action.id}-${Date.now()}`,
            action: action.title,
            actionId: action.id,
            at: json.timestamp || new Date().toISOString(),
            ok: res.ok && json.ok !== false,
            status: res.status,
            response: json,
          },
          ...prev,
        ]);
        if (res.ok && json.ok !== false) {
          await loadPurgeCandidates();
        }
      } catch (e) {
        setRuns((prev) => [
          {
            id: `${action.id}-${Date.now()}`,
            action: action.title,
            actionId: action.id,
            at: new Date().toISOString(),
            ok: false,
            status: 0,
            response: { error: e.message || 'Network error' },
          },
          ...prev,
        ]);
      } finally {
        setRunning(null);
      }
    },
    [counts, tenantId, loadPurgeCandidates],
  );

  const downloadPayload = useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      sandboxPassword: SANDBOX_DEFAULT_PASSWORD,
      runs,
    }),
    [runs],
  );

  const downloadResults = () => {
    const blob = new Blob([JSON.stringify(downloadPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placementhub-demo-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEmbed = variant === 'embed';

  return (
    <div className={`demo-tester-page${isEmbed ? ' demo-tester-page--embed' : ''}`}>
      <div className="demo-tester-wrap">
        {!hideHeader ? (
          <header className="demo-tester-header">
            <h1>
              <Database size={20} aria-hidden /> {compactHeader ? 'Demo APIs & cleanup' : 'Demo Data Tester'}
            </h1>
            {!compactHeader ? (
              <p>
                Live API seeding for QA. Password <code>{SANDBOX_DEFAULT_PASSWORD}</code> · emails{' '}
                <code>@placementhub.test</code>. Download JSON from results for handoff notes. Use it to seed and reset
                sandbox-only data so college, employer, and student screens can be exercised end-to-end before a demo or
                regression pass.
              </p>
            ) : (
              <p>
                Seed demo data or purge test records. Password <code>{SANDBOX_DEFAULT_PASSWORD}</code> ·{' '}
                <code>@placementhub.test</code>
              </p>
            )}
            {apiDisabled ? (
              <p className="demo-tester-warn">Demo APIs disabled — set DEMO_DATA_API_ENABLED=true on the server.</p>
            ) : null}
          </header>
        ) : apiDisabled ? (
          <p className="demo-tester-warn">Demo APIs disabled — set DEMO_DATA_API_ENABLED=true on the server.</p>
        ) : null}

        <div className="demo-tester-toolbar">
          <label className="demo-tester-campus">
            <span className="demo-tester-campus-label">Campus</span>
            <select
              className="form-select demo-tester-select"
              value={tenantId}
              disabled={collegesLoading || apiDisabled}
              onChange={(e) => {
                setTenantId(e.target.value);
                setSelectedPurgeKey('');
              }}
            >
              <option value="">Random</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!runs.length}
            onClick={downloadResults}
          >
            <Download size={14} /> JSON ({runs.length})
          </button>
        </div>

        <div className="demo-tester-panel">
          <div className="demo-tester-row demo-tester-row-head">
            <span>Action</span>
            <span className="demo-tester-col-n" title="How many records to create — only for bulk seed actions">
              Count
            </span>
            <span className="demo-tester-col-run" />
          </div>
          <p className="demo-tester-col-help">
            <strong>Count</strong> = number to create (student, jobs, internships). <strong>Once</strong> = single
            action per click — still use <strong>Run</strong>. Check <strong>Results</strong> below if Run returns an
            error (often missing setup: create jobs/internships first, or run tie-up before apply).
          </p>

          {ACTION_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="demo-tester-group">{group.label}</div>
              {group.items.map((action) => (
                <div key={action.id} className="demo-tester-row">
                  <div className="demo-tester-action">
                    <strong>{action.title}</strong>
                    <span className="demo-tester-hint">{action.hint}</span>
                  </div>
                  <div className="demo-tester-col-n">
                    {!action.hideCount ? (
                      <input
                        type="number"
                        className="form-input demo-tester-count"
                        min={1}
                        max={action.countMax}
                        value={counts[action.id] ?? action.countDefault}
                        disabled={apiDisabled}
                        aria-label={`Count for ${action.title}`}
                        onChange={(e) =>
                          setCounts((prev) => ({
                            ...prev,
                            [action.id]: Math.min(
                              action.countMax,
                              Math.max(1, Number(e.target.value) || action.countDefault),
                            ),
                          }))
                        }
                      />
                    ) : (
                      <span className="demo-tester-na" title="No count field — runs one action per click">
                        Once
                      </span>
                    )}
                  </div>
                  <div className="demo-tester-col-run">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm demo-tester-run"
                      disabled={apiDisabled || running !== null}
                      onClick={() => runAction(action)}
                    >
                      {running === action.id ? (
                        <Loader2 size={14} className="spin" aria-hidden />
                      ) : (
                        <Play size={14} aria-hidden />
                      )}
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <section id="demo-purge" className="demo-tester-purge" ref={purgeSectionRef}>
          <div className="demo-tester-purge-head">
            <div>
              <h2>Purge (soft delete)</h2>
              <p>
                One entity per API call · sets <code>is_deleted</code> · cascades related demo data · trashes
                matching alerts · removes linked calendar rows · logged in Audit Reports as{' '}
                <code>DEMO_PURGE</code>
                . Eligible records: Data Tester API posts, guided runner titles (<code>GT-*</code>), UI/playbook
                forms (<code>Duration: N months.</code>), employer UI auto-generated descriptions, seed rows (
                <code>d1000000-*</code> or employer loop descriptions). Internships &amp; programs includes
                internships, short projects, and hackathons.
                Choose from the dropdown, then purge.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={apiDisabled || purgeLoading}
              onClick={loadPurgeCandidates}
            >
              {purgeLoading ? <Loader2 size={14} className="spin" aria-hidden /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>
          {purgeError ? <p className="demo-tester-warn">{purgeError}</p> : null}
          {purgeNotice && !purgeError ? (
            <p className="demo-tester-purge-notice" role="status">
              {purgeNotice}
            </p>
          ) : null}
          <div className="demo-tester-panel demo-tester-purge-panel">
            {purgeLoading && !purgeCandidates ? (
              <p className="demo-tester-row-empty">Loading purge candidates…</p>
            ) : null}
            {!purgeLoading && purgeCandidates ? (
              <>
                <div className="demo-tester-purge-summary" aria-label="Counts by type">
                  {PURGE_GROUPS.map((group) => {
                    const n = (purgeCandidates[group.key] || []).length;
                    return (
                      <span
                        key={group.key}
                        className={`demo-tester-purge-chip${n ? '' : ' demo-tester-purge-chip-empty'}`}
                      >
                        {group.label}: {n}
                      </span>
                    );
                  })}
                </div>
                {purgeRemainingCount(purgeCandidates) === 0 ? (
                  <div className="demo-tester-row-empty">
                    <p>No demo data to purge yet for this campus filter.</p>
                    <ul className="demo-tester-empty-hints">
                      <li>
                        Run <strong>Create jobs</strong>, <strong>Create student</strong>, or other actions above — only
                        data created here appears (marked &quot;Data Tester API&quot; or @placementhub.test).
                      </li>
                      <li>
                        If a Run returned <strong>500</strong>, nothing was saved — redeploy the latest build, then run
                        again.
                      </li>
                      <li>
                        Campus set to a specific college? Jobs only show if visibility includes that college — try{' '}
                        <strong>Random</strong> (all campuses) in the toolbar.
                      </li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className="demo-tester-purge-picker">
                      <label className="demo-tester-purge-field">
                        <span className="demo-tester-purge-field-label">Type</span>
                        <select
                          className="form-select demo-tester-select"
                          value={purgeTypeFilter}
                          onChange={(e) => {
                            setPurgeTypeFilter(e.target.value);
                            setSelectedPurgeKey('');
                          }}
                          disabled={apiDisabled || purgingKey !== null}
                        >
                          <option value="all">All types</option>
                          {PURGE_GROUPS.map((group) => (
                            <option key={group.key} value={group.entityType}>
                              {group.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="demo-tester-purge-field demo-tester-purge-field-grow">
                        <span className="demo-tester-purge-field-label">Entity to purge</span>
                        <select
                          className="form-select demo-tester-select"
                          value={selectedPurgeKey}
                          onChange={(e) => setSelectedPurgeKey(e.target.value)}
                          disabled={apiDisabled || purgingKey !== null || !purgeOptions.length}
                        >
                          {purgeOptions.length === 0 ? (
                            <option value="">No matches — change type filter or campus</option>
                          ) : (
                            <>
                              <option value="">Select entity to purge…</option>
                              {purgeOptions.map((opt) => (
                                <option key={opt.optionKey} value={opt.optionKey}>
                                  {opt.optionLabel}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm demo-tester-purge-submit"
                        disabled={
                          apiDisabled ||
                          purgingKey !== null ||
                          !selectedPurgeItem
                        }
                        onClick={() => selectedPurgeItem && purgeOne(selectedPurgeItem)}
                      >
                        {purgingKey ? (
                          <Loader2 size={14} className="spin" aria-hidden />
                        ) : (
                          <Trash2 size={14} aria-hidden />
                        )}
                        Purge selected
                      </button>
                    </div>
                    {selectedPurgeItem ? (
                      <div className="demo-tester-purge-preview">
                        <strong>{selectedPurgeItem.label}</strong>
                        <span>{selectedPurgeItem.groupLabel}</span>
                        <span className="demo-tester-hint">
                          {selectedPurgeItem.sub || selectedPurgeItem.entityId}
                        </span>
                      </div>
                    ) : purgeOptions.length > 0 ? (
                      <p className="demo-tester-purge-hint">Select an entity above before purging.</p>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </div>
        </section>

        <details className="demo-tester-results" open={runs.length > 0}>
          <summary>Results ({runs.length})</summary>
          {!runs.length ? (
            <p className="demo-tester-empty">No runs yet.</p>
          ) : (
            <div className="demo-tester-results-list">
              {runs.map((run) => (
                <div key={run.id} className={`demo-tester-result ${run.ok ? '' : 'demo-tester-result-fail'}`}>
                  <div className="demo-tester-result-meta">
                    <span>{run.action}</span>
                    <span className={`badge ${run.ok ? 'badge-green' : 'badge-red'}`}>
                      {run.ok ? 'OK' : 'Fail'}
                    </span>
                    <span className="text-xs text-tertiary">
                      {new Date(run.at).toLocaleString()} · {run.status || '—'}
                    </span>
                  </div>
                  <pre>{formatRunForDownload(run.response)}</pre>
                </div>
              ))}
            </div>
          )}
        </details>

        {!isEmbed ? (
        <p className="demo-tester-footer">
          <Link href="/">Landing</Link> · <Link href="/developer">Developer Notes</Link> · <Link href="/login">Login</Link>
          {' · '}
          <Link href="/data-entry">Full page</Link>
        </p>
        ) : null}
      </div>

      <style jsx>{`
        .demo-tester-page {
          min-height: 100vh;
          background: var(--bg-secondary);
          padding: 1rem 1rem 2rem;
          font-size: 0.875rem;
        }
        .demo-tester-page--embed {
          min-height: 0;
          background: transparent;
          padding: 0 0 1rem;
        }
        .demo-tester-wrap {
          max-width: 920px;
          margin: 0 auto;
        }
        .demo-tester-header h1 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.35rem;
          color: var(--text-primary);
        }
        .demo-tester-header p {
          margin: 0;
          line-height: 1.45;
          color: var(--text-secondary);
          font-size: 0.8125rem;
        }
        .demo-tester-warn {
          margin: 0.5rem 0 0;
          color: var(--danger-600);
          font-size: 0.8125rem;
        }
        .demo-tester-toolbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin: 0.85rem 0 0.5rem;
        }
        .demo-tester-campus {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          flex: 1;
          min-width: 200px;
          max-width: 420px;
        }
        .demo-tester-campus-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-tertiary);
        }
        .demo-tester-select {
          padding: 0.35rem 0.5rem;
          font-size: 0.8125rem;
          min-height: 2rem;
        }
        .demo-tester-panel {
          background: var(--bg-primary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .demo-tester-purge {
          margin-top: 0.85rem;
        }
        .demo-tester-purge-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.45rem;
        }
        .demo-tester-purge-head h2 {
          margin: 0 0 0.2rem;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .demo-tester-purge-head p {
          margin: 0;
          font-size: 0.6875rem;
          line-height: 1.4;
          color: var(--text-tertiary);
        }
        .demo-tester-purge-notice {
          margin: 0 0 0.45rem;
          padding: 0.45rem 0.6rem;
          font-size: 0.75rem;
          line-height: 1.45;
          color: var(--success-800, #166534);
          background: var(--success-50, #f0fdf4);
          border: 1px solid var(--success-200, #bbf7d0);
          border-radius: var(--radius-sm);
        }
        .demo-tester-purge-panel {
          padding: 0.65rem;
        }
        .demo-tester-purge-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem 0.5rem;
          margin-bottom: 0.65rem;
        }
        .demo-tester-purge-chip {
          font-size: 0.625rem;
          font-weight: 600;
          padding: 0.2rem 0.45rem;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
        }
        .demo-tester-purge-chip-empty {
          opacity: 0.55;
        }
        .demo-tester-purge-picker {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 0.5rem 0.65rem;
        }
        .demo-tester-purge-field {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 8.5rem;
        }
        .demo-tester-purge-field-grow {
          flex: 1 1 14rem;
          min-width: 12rem;
        }
        .demo-tester-purge-field-label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-tertiary);
        }
        .demo-tester-purge-submit {
          flex-shrink: 0;
          align-self: flex-end;
        }
        .demo-tester-purge-preview {
          margin-top: 0.55rem;
          padding: 0.45rem 0.55rem;
          font-size: 0.75rem;
          line-height: 1.4;
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 0.35rem 0.65rem;
        }
        .demo-tester-purge-preview strong {
          color: var(--text-primary);
        }
        .demo-tester-purge-hint {
          margin: 0.55rem 0 0;
          font-size: 0.6875rem;
          color: var(--text-tertiary);
          font-style: italic;
        }
        .demo-tester-purge-preview > span:first-of-type {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--danger-700, #b91c1c);
        }
        .demo-tester-row-empty {
          grid-template-columns: 1fr;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          padding: 0.65rem;
        }
        .demo-tester-empty-hints {
          margin: 0.5rem 0 0;
          padding-left: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .demo-tester-empty-hints li {
          line-height: 1.45;
        }
        .btn-danger {
          background: var(--danger-600, #dc2626);
          color: #fff;
          border: 1px solid var(--danger-700, #b91c1c);
        }
        .btn-danger:hover:not(:disabled) {
          background: var(--danger-700, #b91c1c);
        }
        .demo-tester-row {
          display: grid;
          grid-template-columns: 1fr 3.25rem 4.5rem;
          align-items: center;
          gap: 0.5rem 0.65rem;
          padding: 0.4rem 0.65rem;
          border-bottom: 1px solid var(--border-default);
          min-height: 2.35rem;
        }
        .demo-tester-row:last-child {
          border-bottom: none;
        }
        .demo-tester-row-head {
          background: var(--bg-secondary);
          min-height: 1.75rem;
          padding: 0.3rem 0.65rem;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-tertiary);
        }
        .demo-tester-group {
          padding: 0.35rem 0.65rem;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--primary-700);
          background: var(--primary-50);
          border-bottom: 1px solid var(--border-default);
        }
        .demo-tester-action {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }
        .demo-tester-action strong {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.25;
        }
        .demo-tester-hint {
          font-size: 0.6875rem;
          line-height: 1.35;
          color: var(--text-tertiary);
        }
        .demo-tester-col-n {
          display: flex;
          justify-content: center;
        }
        .demo-tester-col-run {
          display: flex;
          justify-content: flex-end;
        }
        .demo-tester-count {
          width: 100%;
          max-width: 3.25rem;
          padding: 0.2rem 0.35rem;
          font-size: 0.8125rem;
          text-align: center;
          min-height: 1.75rem;
        }
        .demo-tester-na {
          color: var(--text-tertiary);
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .demo-tester-col-help {
          margin: 0;
          padding: 0.5rem 0.65rem 0.65rem;
          font-size: 0.8125rem;
          line-height: 1.5;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-default);
        }
        .demo-tester-run {
          padding: 0.2rem 0.5rem;
          min-height: 1.75rem;
          font-size: 0.75rem;
          gap: 0.25rem;
        }
        .demo-tester-results {
          margin-top: 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 0.5rem 0.65rem;
        }
        .demo-tester-results summary {
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--text-primary);
          user-select: none;
        }
        .demo-tester-empty {
          margin: 0.5rem 0 0;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .demo-tester-results-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
          max-height: 420px;
          overflow-y: auto;
        }
        .demo-tester-result {
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          padding: 0.4rem 0.5rem;
          background: var(--bg-secondary);
        }
        .demo-tester-result-fail {
          border-color: var(--danger-200);
          background: var(--danger-50, #fef2f2);
        }
        .demo-tester-result-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.35rem 0.5rem;
          margin-bottom: 0.35rem;
          font-size: 0.75rem;
        }
        .demo-tester-result pre {
          margin: 0;
          font-size: 0.6875rem;
          line-height: 1.4;
          overflow: auto;
          max-height: 160px;
          padding: 0.4rem;
          background: var(--bg-primary);
          border-radius: 4px;
        }
        .demo-tester-footer {
          margin: 0.75rem 0 0;
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 560px) {
          .demo-tester-row {
            grid-template-columns: 1fr auto;
            grid-template-rows: auto auto;
          }
          .demo-tester-col-n {
            grid-column: 1;
            justify-content: flex-start;
          }
          .demo-tester-col-run {
            grid-column: 2;
            grid-row: 1 / span 2;
            align-self: center;
          }
          .demo-tester-row-head .demo-tester-col-n,
          .demo-tester-row-head .demo-tester-col-run {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
