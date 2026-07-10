'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { HiringAssessmentRoundBreakdown } from '@/components/assessment/HiringAssessmentRoundBreakdown';
import { useToast } from '@/components/ToastProvider';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';
import { EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';

export default function EmployerHiringAssessmentPage() {
  const { addToast } = useToast();
  const [campusesLoading, setCampusesLoading] = useState(true);
  const [approvedCampuses, setApprovedCampuses] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCampusesLoading(true);
      try {
        const res = await fetch('/api/employer/campuses');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load campuses');
        const list = Array.isArray(json.colleges) ? json.colleges : [];
        const approved = list.filter((c) => String(c.approval_status || '').toLowerCase() === 'approved');
        if (!mounted) return;
        setApprovedCampuses(approved);
        if (approved.length && !selectedTenantId) {
          setSelectedTenantId(approved[0].id);
        }
      } catch (e) {
        if (!mounted) return;
        setApprovedCampuses([]);
        addToast(e.message || 'Could not load campuses', 'error');
      } finally {
        if (mounted) setCampusesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setPayload(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/employer/hiring-assessment-view?tenantId=${encodeURIComponent(selectedTenantId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        addToast(e.message || 'Could not load assessment view', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedTenantId, addToast]);

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
        'upload_file',
        'upload_at',
        'campus',
        'roll_number',
        'candidate_name',
        'employer_company',
        'round_1',
        'round_2',
        'round_3',
        'round_4',
        'round_5',
        'remarks',
      ],
      rows: displayRows.map((r) => [
        r.original_file_name ?? '',
        r.upload_created_at ? new Date(r.upload_created_at).toISOString() : '',
        r.tenant_name ?? '',
        r.roll_number ?? '',
        r.candidate_name ?? '',
        r.employer_company ?? '',
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

  const downloadOffersImportStarter = async () => {
    if (!selectedTenantId) {
      addToast('Choose a campus first.', 'warning');
      return;
    }
    try {
      const url = `/api/employer/offers/assessment-starter?tenantId=${encodeURIComponent(selectedTenantId)}`;
      await downloadCsvFromApi(url, EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('CSV lists every master-list student on this campus (tenant_id + roll; drive prefilled when available).', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📋 Hiring Assessment</h1>
          <p className="text-secondary text-sm" style={{ maxWidth: 720 }}>
            <strong>Read-only.</strong> This screen summarizes outcomes from your{' '}
            <Link href="/dashboard/employer/assessment-uploads" style={{ fontWeight: 600 }}>
              Assessment uploads
            </Link>{' '}
            (CSV). To add or change data, use that page only — nothing here can be edited.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadOffersImportStarter}>
            Offers CSV (all students)
          </button>
          <ExportCsvSplitButton
            filenameBase="hiring_assessment_from_uploads"
            currentCount={displayRows.length}
            fullCount={displayRows.length}
            getRows={getCsv}
          />
        </div>
      </div>

      <div className="directive-panel" role="region" aria-label="Scope">
        <p className="directive-panel__title">Scope</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          Choose a campus to see assessment rows from uploads tied to that tenant. <strong>Total students</strong> and <strong>round-wise status</strong> use one
          line per student (newest upload wins for display; older batches stay in the database). The detail table matches that rule.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Campus</label>
          <select
            className="form-select"
            value={selectedTenantId}
            disabled={campusesLoading || approvedCampuses.length === 0}
            onChange={(e) => setSelectedTenantId(e.target.value)}
          >
            {approvedCampuses.length === 0 ? (
              <option value="">{campusesLoading ? 'Loading…' : 'No approved campuses'}</option>
            ) : (
              approvedCampuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` (${c.city})` : ''}
                </option>
              ))
            )}
          </select>
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
                Distinct students (this campus)
                {summary.totalResultRows > 0 ? (
                  <>
                    <br />
                    {summary.totalResultRows} row{summary.totalResultRows === 1 ? '' : 's'} across uploads
                  </>
                ) : null}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{summary.uploadsCount}</div>
              <div className="stats-card-label">Upload batches</div>
              <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                Distinct CSV uploads represented
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{summary.perRoundFilled.filter((n) => n > 0).length}</div>
              <div className="stats-card-label">Rounds with data</div>
              <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                Of five round columns
              </div>
            </div>
          </div>

          <HiringAssessmentRoundBreakdown
            roundLabels={roundLabels}
            perRoundByStatus={summary.perRoundByStatus}
            perRoundUnspecified={summary.perRoundUnspecified}
          />

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
              Detail (read-only)
            </h3>
            <p className="text-xs text-secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.5 }}>
              One row per student on this campus; if the same roll appears in several uploads, the <strong>most recent file</strong> controls what you see here.{' '}
              <strong>Candidate</strong> is the name from the campus master list for that roll (then email, then roll). CSV placeholders like &quot;Student_1&quot; are not
              shown here.
            </p>
            <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
              <table className="data-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
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
                      <td className="text-xs">{r.original_file_name || '—'}</td>
                      <td className="font-mono text-sm">{r.roll_number}</td>
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
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-secondary">
                        No assessment rows for this campus yet. Upload a CSV under{' '}
                        <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
