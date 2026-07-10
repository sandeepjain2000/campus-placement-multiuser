'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, FolderDot, GraduationCap, Target } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

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
      <div className="page-header">
        <div className="page-header-left">
          <h1>Correct CSV import — {kindLabel}</h1>
          <p>
            Fix validation errors row by row, then <strong>Accept import</strong>. Or reject and upload a new CSV from{' '}
            <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>.
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Opportunity type"
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}
      >
        {KIND_TABS.map((t) => {
          const Icon = t.icon;
          const active = activeKind === t.id;
          return (
            <Link
              key={t.id}
              href={`/dashboard/employer/assessment-uploads/review?kind=${t.id}`}
              role="tab"
              aria-selected={active}
              className={active ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '999px',
                textDecoration: 'none',
              }}
            >
              <Icon size={16} aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </div>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      ) : sessions.length === 0 ? (
        <div className="card">
          <p className="text-secondary" style={{ margin: 0 }}>
            No pending CSV imports for {kindLabel}. Upload a CSV on{' '}
            <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>. If the file has errors, it will appear here for correction.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Uploaded</th>
                  <th>File</th>
                  <th>Rows</th>
                  <th>Errors</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
                    <td>{s.original_file_name || '—'}</td>
                    <td>{s.row_count ?? '—'}</td>
                    <td>
                      <strong style={{ color: Number(s.invalid_count) > 0 ? 'var(--danger-600)' : undefined }}>
                        {s.invalid_count ?? 0}
                      </strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => router.push(`/dashboard/employer/assessment-uploads/import/${s.id}`)}
                      >
                        Review &amp; correct
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
