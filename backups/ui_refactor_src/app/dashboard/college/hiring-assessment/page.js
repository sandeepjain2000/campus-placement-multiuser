'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { HiringAssessmentRoundBreakdown } from '@/components/assessment/HiringAssessmentRoundBreakdown';
import { useToast } from '@/components/ToastProvider';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';

export default function CollegeHiringAssessmentPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/college/hiring-assessment-view');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch {
        if (!mounted) return;
        setPayload(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const displayRows = useMemo(() => pickRepresentativeAssessmentRows(rows), [rows]);
  const roundLabels = useMemo(() => {
    const rl = payload?.roundLabels;
    if (!Array.isArray(rl) || rl.length === 0) {
      return [1, 2, 3, 4, 5].map((n) => `Round ${n}`);
    }
    return [1, 2, 3, 4, 5].map((n) => {
      const hit = rl.find((x) => Number(x.round_no) === n);
      return hit?.round_label || `Round ${n}`;
    });
  }, [payload]);

  const summary = payload?.summary || {
    uniqueStudentCount: 0,
    totalResultRows: 0,
    uploadsCount: 0,
    perRoundFilled: [0, 0, 0, 0, 0],
    perRoundByStatus: [[], [], [], [], []],
    perRoundUnspecified: [0, 0, 0, 0, 0],
  };

  const getCsv = useCallback(
    (_scope) => ({
      headers: [
        'employer_company',
        'upload_file',
        'upload_at',
        'roll_number',
        'candidate_name',
        'round_1',
        'round_2',
        'round_3',
        'round_4',
        'round_5',
        'remarks',
      ],
      rows: displayRows.map((r) => [
        r.employer_company ?? '',
        r.original_file_name ?? '',
        r.upload_created_at ? new Date(r.upload_created_at).toISOString() : '',
        r.roll_number ?? '',
        r.candidate_name ?? '',
        r.round_1_result ?? '',
        r.round_2_result ?? '',
        r.round_3_result ?? '',
        r.round_4_result ?? '',
        r.round_5_result ?? '',
        r.remarks ?? '',
      ]),
    }),
    [displayRows],
  );

  const colCount = 4 + roundLabels.length + 1;

  const downloadOffersImportStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('CSV includes every campus master-list student (company prefilled from newest assessment when available).', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📋 Hiring Assessment (read-only)</h1>
          <p className="text-secondary text-sm" style={{ maxWidth: 720 }}>
            Data comes from <strong>employer assessment CSV uploads</strong> for your campus. Employers add or change rows only under their{' '}
            <strong>Assessment uploads</strong> screen — this page is view, summary, and export only.
          </p>
          <div className="directive-panel" style={{ marginTop: '1rem' }} role="region" aria-label="College hiring assessment help">
            <p className="directive-panel__title">How to use this page</p>
            <ol className="directive-steps">
              <li>
                <strong>Total students</strong> and <strong>round-wise status</strong> (Passed, shortlisted, etc.) use one line per student, preferring the{' '}
                <strong>newest upload</strong> when the same person appears in several files (from all employers for your campus).
              </li>
              <li>
                The table shows <strong>one line per student</strong> (newest assessment batch wins for display; older uploads stay in the database).
              </li>
              <li>
                Use <strong>Export</strong> for spreadsheets, <strong>Offers CSV (all students)</strong> for an import-ready file listing <strong>every</strong> campus
                student (assessment data merged in where present), and{' '}
                <Link href="/dashboard/college/reports" style={{ fontWeight: 600 }}>
                  Reports
                </Link>{' '}
                for broader analytics.
              </li>
            </ol>
          </div>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadOffersImportStarter}>
            Offers CSV (all students)
          </button>
          <ExportCsvSplitButton
            filenameBase="hiring_assessment_college_view"
            currentCount={displayRows.length}
            fullCount={displayRows.length}
            getRows={getCsv}
          />
        </div>
      </div>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: '1.25rem' }}>
            <div className="stats-card">
              <div className="stats-card-value">{summary.uniqueStudentCount ?? 0}</div>
              <div className="stats-card-label">Total students</div>
              <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                Distinct students (profile) — all employers, this campus
                {summary.totalResultRows > 0 ? (
                  <>
                    <br />
                    {summary.totalResultRows} upload row{summary.totalResultRows === 1 ? '' : 's'} total
                  </>
                ) : null}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{summary.uploadsCount}</div>
              <div className="stats-card-label">Upload batches</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{summary.perRoundFilled.filter((n) => n > 0).length}</div>
              <div className="stats-card-label">Rounds with data</div>
            </div>
          </div>

          <HiringAssessmentRoundBreakdown
            roundLabels={roundLabels}
            perRoundByStatus={summary.perRoundByStatus}
            perRoundUnspecified={summary.perRoundUnspecified}
          />

          <div className="card">
            <p className="text-xs text-secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.5 }}>
              <strong>Detail (read-only).</strong> One row per student; if the same roll appears in multiple assessment files, the <strong>most recent upload</strong>{' '}
              determines what you see here (older batches remain stored). <strong>Candidate</strong> is the name from your campus student master list for that roll (then
              email, then roll). CSV placeholders like &quot;Student_1&quot; are not shown here.
            </p>
            <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
              <table className="data-table" style={{ minWidth: 960 }}>
                <thead>
                  <tr>
                    <th>Employer</th>
                    <th>File</th>
                    <th>Roll</th>
                    <th>Candidate</th>
                    {roundLabels.map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => (
                    <tr key={r.id}>
                      <td className="text-sm">{r.employer_company || '—'}</td>
                      <td className="text-xs">{r.original_file_name || '—'}</td>
                      <td className="text-sm font-mono">{r.roll_number}</td>
                      <td className="text-sm">{r.candidate_name || '—'}</td>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <td key={n} className="text-sm">
                          {r[`round_${n}_result`] || '—'}
                        </td>
                      ))}
                      <td className="text-sm" style={{ maxWidth: 220 }}>
                        {r.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
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
