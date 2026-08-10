'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, FolderDot, GraduationCap, Target } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const KIND_TABS = [
  { id: 'internship', label: 'Internship', icon: GraduationCap },
  { id: 'drive', label: 'Drive', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderDot },
];

function ReviewListContent() {
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = searchParams.get('kind') || 'internship';
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);

  const activeKind = KIND_TABS.some((t) => t.id === kind) ? kind : 'internship';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/assessments/import?kind=${encodeURIComponent(activeKind)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setSessions(Array.isArray(json.sessions) ? json.sessions : []);
    } catch (e) {
      setSessions([]);
      addToast(e.message || 'Could not load pending imports', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeKind, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const kindLabel = useMemo(() => KIND_TABS.find((t) => t.id === activeKind)?.label || activeKind, [activeKind]);

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Correct CSV import — {kindLabel}</h1>
          <p>
            Fix validation errors row by row, then <strong>Accept import</strong>. Or reject and upload a new CSV from{' '}
            <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>.
          </p>
        </div>
      </div>

      <Tabs value={activeKind} className="mb-6"><TabsList aria-label="Opportunity type">
        {KIND_TABS.map((t) => {
          const Icon = t.icon;
          const active = activeKind === t.id;
          return (
            <TabsTrigger key={t.id} value={t.id} render={<Link href={`/dashboard/employer/assessment-uploads/review?kind=${t.id}`} />}>
              <Icon size={16} aria-hidden />
              {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList></Tabs>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
            No pending CSV imports for {kindLabel}. Upload a CSV on{' '}
            <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>. If the file has errors, it will appear here for correction.
        </CardContent></Card>
      ) : (
        <Card><CardHeader><CardTitle>Pending imports</CardTitle><CardDescription>Correct every invalid row before accepting an import.</CardDescription></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow>
                  <TableHead>Uploaded</TableHead><TableHead>File</TableHead><TableHead>Rows</TableHead><TableHead>Errors</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</TableCell>
                    <TableCell>{s.original_file_name || '—'}</TableCell>
                    <TableCell>{s.row_count ?? '—'}</TableCell>
                    <TableCell><StatusBadge tone={Number(s.invalid_count) > 0 ? 'red' : 'green'} showDot>{s.invalid_count ?? 0}</StatusBadge></TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => router.push(`/dashboard/employer/assessment-uploads/import/${s.id}`)}
                      >
                        Review &amp; correct
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent></Card>
      )}
    </div>
  );
}

export default function AssessmentImportReviewListPage() {
  return (
    <Suspense fallback={<div className="skeleton skeleton-card" style={{ height: 240 }} />}>
      <ReviewListContent />
    </Suspense>
  );
}
