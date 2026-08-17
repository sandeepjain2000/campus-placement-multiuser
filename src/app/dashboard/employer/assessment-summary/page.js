'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Briefcase, FolderDot, GraduationCap, Target } from 'lucide-react';
import { ASSESSMENT_ROUND_KINDS } from '@/lib/assessmentRoundMap';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Assessment map</h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '42rem', lineHeight: 1.55 }}>
            Default display names for <code>round_1</code>…<code>round_5</code> on CSV uploads and hiring results. Set a row to{' '}
            <strong>NA</strong> when your process does not use that round.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={saving || isLoading} onClick={saveMap}>
            {saving ? 'Saving…' : `Save ${tabLabel}`}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4"><AlertTitle>Could not load round map</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
      ) : null}

      <Alert className="mb-4"><AlertTitle>Employer View Settings</AlertTitle><AlertDescription>Rounds are configured on this page for now.</AlertDescription></Alert>

      <Tabs value={kindTab} onValueChange={setKindTab} className="mb-5">
      <TabsList aria-label="Opportunity type">
        {ASSESSMENT_ROUND_KINDS.map((t) => {
          const Icon = TAB_ICONS[t.id] || Briefcase;
          const active = kindTab === t.id;
          return (
            <TabsTrigger
              key={t.id}
              type="button"
              value={t.id}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
              {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      </Tabs>

      <Card>
        {isLoading && !data ? (
          <div className="skeleton skeleton-card" style={{ height: 220 }} />
        ) : (
          <>
            <CardHeader><CardTitle>{tabLabel} — round mapping</CardTitle><CardDescription>Name each CSV assessment round or mark it unused.</CardDescription></CardHeader>
            <CardContent>
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[22%]">Round</TableHead>
                    <TableHead className="w-[28%]">CSV column</TableHead>
                    <TableHead>Display name</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold">{`Round ${i + 1}`}</TableCell>
                      <TableCell>
                        <code className="font-mono text-sm">{`round_${i + 1}`}</code>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={draftLabels[i] ?? ''}
                          onChange={(e) => setLabelAt(i, e.target.value)}
                          placeholder={activeRounds[i]?.label || `Round ${i + 1}`}
                          aria-label={`Round ${i + 1} display name`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRoundNa(i)}
                          title="Mark round as not used"
                        >
                          NA
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            <p className="text-xs text-tertiary" style={{ marginTop: '0.85rem', marginBottom: 0, lineHeight: 1.5 }}>
              Up to five rounds apply across jobs, drives, internships, and projects. Most employers use fewer — mark unused rounds as{' '}
              <strong>NA</strong>. Per-upload overrides remain available under Assessment uploads until that flow is retired.
            </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
