'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { HiringResultBreakdown } from '@/components/assessment/HiringResultBreakdown';
import { buildAssessmentSummary } from '@/lib/assessmentHiringViewShared';
import { useToast } from '@/components/ToastProvider';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { ClipboardList, Users, Upload, Download } from 'lucide-react';

export default function CollegeHiringAssessmentPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch('/api/college/hiring-assessment-view');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        setLoadError(e?.message || 'Could not load assessment data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const baseDisplayRows = useMemo(() => pickRepresentativeAssessmentRows(rows), [rows]);
  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(baseDisplayRows, {
    getSearchText: (r) =>
      [r.employer_company, r.original_file_name, r.roll_number, r.candidate_name, r.remarks].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });
  const summary = payload?.summary || buildAssessmentSummary(rows);

  const getCsv = useCallback(
    (_scope) => ({
      headers: [
        'employer_company',
        'upload_file',
        'upload_at',
        'roll_number',
        'candidate_name',
        'hiring_result',
        'remarks',
      ],
      rows: displayRows.map((r) => [
        r.employer_company ?? '',
        r.original_file_name ?? '',
        r.upload_created_at ? new Date(r.upload_created_at).toISOString() : '',
        r.roll_number ?? '',
        r.candidate_name ?? '',
        r.hiring_result ?? '',
        r.remarks ?? '',
      ]),
    }),
    [displayRows],
  );

  const colCount = 6;

  const downloadOffersImportStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('CSV includes every campus master-list student (company prefilled from newest assessment when available).', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={28} /> Hiring Assessment
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Read-only view of employer CSV uploads for your campus. Export for spreadsheets.</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={downloadOffersImportStarter} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={16} /> All Students Template
          </button>
          <ExportCsvSplitButton filenameBase="hiring_assessment_college_view" currentCount={displayRows.length} fullCount={displayRows.length} getRows={getCsv} />
        </div>
      </div>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      ) : loadError ? (
        <div className="card" style={{ padding: '1.25rem', borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }}>
          <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{loadError}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            If this mentions missing tables, apply migration <code>013_audit_exports_and_assessment_uploads.sql</code> on production.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Students', value: summary.uniqueStudentCount ?? 0, sub: summary.totalResultRows > 0 ? `${summary.totalResultRows} upload row(s)` : null, icon: Users, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
              { label: 'Upload Batches', value: summary.uploadsCount, sub: null, icon: Upload, color: 'var(--info-600)', bg: 'rgba(2,132,199,0.08)' },
              { label: 'With hiring result', value: summary.withHiringResult ?? 0, sub: summary.withoutHiringResult ? `${summary.withoutHiringResult} pending` : null, icon: ClipboardList, color: 'var(--warning-600)', bg: 'rgba(217,119,6,0.08)' },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: bg, color }}><Icon size={20} strokeWidth={2} /></div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>{label}</div>
                {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>{sub}</div>}
              </div>
            ))}
          </div>

          <HiringResultBreakdown summary={summary} />

          <div className="card">
            <p className="text-xs text-secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.5 }}>
              <strong>Detail (read-only).</strong> One row per student; if the same roll appears in multiple assessment files, the <strong>most recent upload</strong>{' '}
              determines what you see here (older batches remain stored). <strong>Candidate</strong> is the name from your campus student master list for that roll (then
              email, then roll). CSV placeholders like &quot;Student_1&quot; are not shown here.
            </p>
            {totalCount > 0 ? (
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search employer, roll, or candidate…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={totalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                style={{ marginBottom: '1rem' }}
              />
            ) : null}
            <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
              <table className="data-table" style={{ minWidth: 960 }}>
                <thead>
                  <tr>
                    <th>Employer</th>
                    <th>File</th>
                    <th>Roll</th>
                    <th>Candidate</th>
                    <th>Hiring result</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 && totalCount > 0 ? (
                    <tr>
                      <td colSpan={colCount} className="text-center text-secondary">
                        No rows match your search.
                      </td>
                    </tr>
                  ) : null}
                  {displayRows.map((r) => (
                    <tr key={r.id}>
                      <td className="text-sm">{r.employer_company || '—'}</td>
                      <td className="text-xs">{r.original_file_name || '—'}</td>
                      <td className="text-sm font-mono">{r.roll_number}</td>
                      <td className="text-sm">{r.candidate_name || '—'}</td>
                      <td className="text-sm">{r.hiring_result || '—'}</td>
                      <td className="text-sm" style={{ maxWidth: 220 }}>
                        {r.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                  {totalCount === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="text-center text-secondary">
                        No assessment upload rows for your campus yet. When employers submit CSV results, they will appear here.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
