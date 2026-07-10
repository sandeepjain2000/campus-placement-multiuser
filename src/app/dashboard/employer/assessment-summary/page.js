'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Briefcase, FolderDot, GraduationCap, Target } from 'lucide-react';
import { ASSESSMENT_ROUND_KINDS } from '@/lib/assessmentRoundMap';
import { useToast } from '@/components/ToastProvider';

const TAB_ICONS = {
  internship: GraduationCap,
  jobs: Briefcase,
  drive: Target,
  projects: FolderDot,
};

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load round map');
  return json;
};

export default function EmployerAssessmentMapPage() {
  const { addToast } = useToast();
  const [kindTab, setKindTab] = useState('jobs');
  const [draftLabels, setDraftLabels] = useState(['', '', '', '', '']);
  const [saving, setSaving] = useState(false);

  const { data, error, isLoading, mutate } = useSWR('/api/employer/assessment-round-map', fetcher, {
    revalidateOnFocus: true,
  });

  const maps = data?.maps || {};
  const activeRounds = useMemo(() => maps[kindTab] || [], [maps, kindTab]);
  useEffect(() => {
    const rounds = maps[kindTab];
    if (Array.isArray(rounds) && rounds.length === 5) {
      setDraftLabels(rounds.map((r) => r.label));
    }
  }, [kindTab, maps]);

  const setLabelAt = (index, value) => {
    setDraftLabels((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const setRoundNa = (index) => {
    setLabelAt(index, 'NA');
  };

  const saveMap = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/employer/assessment-round-map', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: kindTab,
          rounds: draftLabels.map((label, i) => ({ roundNo: i + 1, label })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      await mutate();
      addToast(`${ASSESSMENT_ROUND_KINDS.find((k) => k.id === kindTab)?.label || 'Round map'} saved.`, 'success');
    } catch (e) {
      addToast(e.message || 'Could not save round map', 'error');
    } finally {
      setSaving(false);
    }
  }, [addToast, draftLabels, kindTab, mutate]);

  const tabLabel = ASSESSMENT_ROUND_KINDS.find((k) => k.id === kindTab)?.label || kindTab;

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-header-left">
          <h1>Assessment map</h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '42rem', lineHeight: 1.55 }}>
            Default display names for <code>round_1</code>…<code>round_5</code> on CSV uploads and hiring results. Set a row to{' '}
            <strong>NA</strong> when your process does not use that round.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" disabled={saving || isLoading} onClick={saveMap}>
            {saving ? 'Saving…' : `Save ${tabLabel}`}
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <p className="text-sm" style={{ margin: 0, color: 'var(--danger-700, #b91c1c)' }}>
            {error.message}
          </p>
        </div>
      ) : null}

      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem', borderLeft: '4px solid var(--warning-500, #f59e0b)' }}>
        <p className="text-sm" style={{ margin: 0, color: 'var(--warning-800, #92400e)', fontWeight: 600 }}>
          Rounds feature is not implemented yet in Employer View Settings.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Opportunity type"
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
      >
        {ASSESSMENT_ROUND_KINDS.map((t) => {
          const Icon = TAB_ICONS[t.id] || Briefcase;
          const active = kindTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKindTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--primary-600)' : 'var(--bg-secondary)',
                color: active ? 'white' : 'var(--text-secondary)',
                boxShadow: active ? '0 4px 10px rgba(79, 70, 229, 0.25)' : 'none',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="card">
        {isLoading && !data ? (
          <div className="skeleton skeleton-card" style={{ height: 220 }} />
        ) : (
          <>
            <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
              {tabLabel} — round mapping
            </h2>
            <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Round</th>
                    <th style={{ width: '28%' }}>CSV column</th>
                    <th>Display name</th>
                    <th style={{ width: '5rem' }} />
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td className="text-sm font-semibold">{`Round ${i + 1}`}</td>
                      <td>
                        <code className="font-mono text-sm">{`round_${i + 1}`}</code>
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={draftLabels[i] ?? ''}
                          onChange={(e) => setLabelAt(i, e.target.value)}
                          placeholder={activeRounds[i]?.label || `Round ${i + 1}`}
                          aria-label={`Round ${i + 1} display name`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setRoundNa(i)}
                          title="Mark round as not used"
                        >
                          NA
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-tertiary" style={{ marginTop: '0.85rem', marginBottom: 0, lineHeight: 1.5 }}>
              Up to five rounds apply across jobs, drives, internships, and projects. Most employers use fewer — mark unused rounds as{' '}
              <strong>NA</strong>. Per-upload overrides remain available under Assessment uploads until that flow is retired.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
