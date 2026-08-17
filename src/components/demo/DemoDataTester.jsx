'use client';

import '@/components/demo/demo-data-tester.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Database, Download, Play, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import AdminFilterSelect from '@/components/AdminFilterSelect';
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
              <Alert className="mt-3" variant="destructive">
                <AlertDescription>Demo APIs disabled — set DEMO_DATA_API_ENABLED=true on the server.</AlertDescription>
              </Alert>
            ) : null}
          </header>
        ) : apiDisabled ? (
          <Alert variant="destructive">
            <AlertDescription>Demo APIs disabled — set DEMO_DATA_API_ENABLED=true on the server.</AlertDescription>
          </Alert>
        ) : null}

        <div className="demo-tester-toolbar">
          <label className="demo-tester-campus">
            <span className="demo-tester-campus-label">Campus</span>
            <AdminFilterSelect
              className="demo-tester-select h-8 min-h-8"
              value={tenantId}
              disabled={collegesLoading || apiDisabled}
              emptyMapsToAll={false}
              onValueChange={(id) => {
                setTenantId(id);
                setSelectedPurgeKey('');
              }}
              items={[
                { label: 'Random', value: '' },
                ...colleges.map((c) => ({ label: c.name, value: String(c.id) })),
              ]}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!runs.length}
            onClick={downloadResults}
          >
            <Download data-icon="inline-start" /> JSON ({runs.length})
          </Button>
        </div>

        <Card size="sm" className="demo-tester-panel gap-0 py-0">
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
                      <Input
                        type="number"
                        className="demo-tester-count"
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
                    <Button
                      type="button"
                      size="sm"
                      className="demo-tester-run"
                      disabled={apiDisabled || running !== null}
                      onClick={() => runAction(action)}
                    >
                      {running === action.id ? (
                        <Loader2 className="spin" data-icon="inline-start" aria-hidden />
                      ) : (
                        <Play data-icon="inline-start" aria-hidden />
                      )}
                      Run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </Card>

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={apiDisabled || purgeLoading}
              onClick={loadPurgeCandidates}
            >
              {purgeLoading ? <Loader2 className="spin" data-icon="inline-start" aria-hidden /> : <RefreshCw data-icon="inline-start" />}
              Refresh
            </Button>
          </div>
          {purgeError ? (
            <Alert className="mb-2" variant="destructive">
              <AlertDescription>{purgeError}</AlertDescription>
            </Alert>
          ) : null}
          {purgeNotice && !purgeError ? (
            <Alert className="mb-2" role="status">
              <AlertDescription>{purgeNotice}</AlertDescription>
            </Alert>
          ) : null}
          <Card size="sm" className="demo-tester-panel demo-tester-purge-panel gap-0">
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
                        <AdminFilterSelect
                          className="demo-tester-select h-8 min-h-8"
                          value={purgeTypeFilter}
                          disabled={apiDisabled || purgingKey !== null}
                          emptyMapsToAll={false}
                          onValueChange={(v) => {
                            setPurgeTypeFilter(v);
                            setSelectedPurgeKey('');
                          }}
                          items={[
                            { label: 'All types', value: 'all' },
                            ...PURGE_GROUPS.map((group) => ({ label: group.label, value: group.entityType })),
                          ]}
                        />
                      </label>
                      <label className="demo-tester-purge-field demo-tester-purge-field-grow">
                        <span className="demo-tester-purge-field-label">Entity to purge</span>
                        <AdminFilterSelect
                          className="demo-tester-select h-8 min-h-8 w-full"
                          value={selectedPurgeKey}
                          disabled={apiDisabled || purgingKey !== null || !purgeOptions.length}
                          emptyMapsToAll={false}
                          onValueChange={setSelectedPurgeKey}
                          items={
                            purgeOptions.length === 0
                              ? [{ label: 'No matches — change type filter or campus', value: '' }]
                              : [
                                  { label: 'Select entity to purge…', value: '' },
                                  ...purgeOptions.map((opt) => ({
                                    label: opt.optionLabel,
                                    value: opt.optionKey,
                                  })),
                                ]
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="demo-tester-purge-submit"
                        disabled={
                          apiDisabled ||
                          purgingKey !== null ||
                          !selectedPurgeItem
                        }
                        onClick={() => selectedPurgeItem && purgeOne(selectedPurgeItem)}
                      >
                        {purgingKey ? (
                          <Loader2 className="spin" data-icon="inline-start" aria-hidden />
                        ) : (
                          <Trash2 data-icon="inline-start" aria-hidden />
                        )}
                        Purge selected
                      </Button>
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
          </Card>
        </section>

        <Card size="sm" className="demo-tester-results">
        <details open={runs.length > 0}>
          <summary>Results ({runs.length})</summary>
          {!runs.length ? (
            <p className="demo-tester-empty">No runs yet.</p>
          ) : (
            <div className="demo-tester-results-list">
              {runs.map((run) => (
                <div key={run.id} className={`demo-tester-result ${run.ok ? '' : 'demo-tester-result-fail'}`}>
                  <div className="demo-tester-result-meta">
                    <span>{run.action}</span>
                    <StatusBadge tone={run.ok ? 'green' : 'red'}>
                      {run.ok ? 'OK' : 'Fail'}
                    </StatusBadge>
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
        </Card>

        {!isEmbed ? (
        <p className="demo-tester-footer">
          <Link href="/">Landing</Link> · <Link href="/developer">Developer Notes</Link> · <Link href="/login">Login</Link>
          {' · '}
          <Link href="/data-entry">Full page</Link>
        </p>
        ) : null}
      </div>
    </div>
  );
}
