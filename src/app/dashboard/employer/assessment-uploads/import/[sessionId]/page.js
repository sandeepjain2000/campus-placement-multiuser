'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { HIRING_RESULT_OPTIONS } from '@/lib/hiringResult';

function rowDraftFromApi(r) {
  return {
    id: r.id,
    row_num: r.row_num,
    system_id: r.system_id || '',
    college_roll_no: r.college_roll_no || '',
    candidate_name: r.candidate_name || '',
    hiring_result: r.hiring_result || '',
    remarks: r.remarks || '',
    placement_drive_id: r.placement_drive_id,
    job_id: r.job_id,
    tenant_id: r.tenant_id,
    validation_errors: Array.isArray(r.validation_errors) ? r.validation_errors : [],
    is_valid: r.is_valid,
  };
}

export default function AssessmentImportReviewPage({ params }) {
  const { addToast } = useToast();
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [draftRows, setDraftRows] = useState([]);
  const [savingRowId, setSavingRowId] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    void params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/assessments/import/${sessionId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setPayload(json);
      setDraftRows(Array.isArray(json.rows) ? json.rows.map(rowDraftFromApi) : []);
    } catch (e) {
      setPayload(null);
      setDraftRows([]);
      addToast(e.message || 'Could not load import review', 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionId, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (rowId, field, value) => {
    setDraftRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  };

  const saveRow = async (row) => {
    setSavingRowId(row.id);
    try {
      const patch = {
        system_id: row.system_id.trim() || null,
        college_roll_no: row.college_roll_no.trim() || null,
        candidate_name: row.candidate_name.trim() || null,
        hiring_result: row.hiring_result,
        remarks: row.remarks.trim() || null,
        placement_drive_id: row.placement_drive_id,
        job_id: row.job_id,
        tenant_id: row.tenant_id,
      };
      const res = await fetch(`/api/employer/assessments/import/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId: row.id, patch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      await load();
      addToast(`Row ${row.row_num} saved.`, 'success');
    } catch (e) {
      addToast(e.message || 'Update failed', 'error');
    } finally {
      setSavingRowId('');
    }
  };

  const acceptImport = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/employer/assessments/import/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Accept failed');
      addToast(`Import accepted — ${json.acceptedRows ?? 0} row(s) saved.`, 'success');
      router.push('/dashboard/employer/assessment-uploads');
    } catch (e) {
      addToast(e.message || 'Accept failed', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const rejectImport = async () => {
    if (!window.confirm('Reject this import? You can edit the CSV and upload again.')) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/employer/assessments/import/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Reject failed');
      addToast('Import rejected.', 'success');
      router.push('/dashboard/employer/assessment-uploads');
    } catch (e) {
      addToast(e.message || 'Reject failed', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const invalidCount = useMemo(() => draftRows.filter((r) => !r.is_valid).length, [draftRows]);
  const canAccept = payload?.canAccept ?? (invalidCount === 0 && draftRows.length > 0);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Review CSV import</h1>
          <p>
            Fix rows below, then <strong>Accept import</strong>. Or reject and re-upload a corrected CSV from{' '}
            <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href={`/dashboard/employer/assessment-uploads/review?kind=${payload?.session?.opportunity_kind || 'jobs'}`} className="btn btn-ghost">
            All pending imports
          </Link>
          <button type="button" className="btn btn-secondary" disabled={rejecting} onClick={() => void rejectImport()}>
            {rejecting ? 'Rejecting…' : 'Reject import'}
          </button>
          <button type="button" className="btn btn-primary" disabled={!canAccept || accepting} onClick={() => void acceptImport()}>
            {accepting ? 'Accepting…' : 'Accept import'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 280 }} />
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <p className="text-sm" style={{ margin: 0 }}>
              File: <strong>{payload?.session?.original_file_name || '—'}</strong> · Rows: <strong>{draftRows.length}</strong> · Errors:{' '}
              <strong style={{ color: invalidCount ? 'var(--danger-600)' : undefined }}>{invalidCount}</strong>
              {invalidCount > 0 ? (
                <span className="text-secondary"> — save each fixed row, then Accept import.</span>
              ) : draftRows.length > 0 ? (
                <span className="text-secondary"> — all rows valid. You can accept the import.</span>
              ) : null}
            </p>
          </div>

          <div className="card">
            <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
              <table className="data-table" style={{ minWidth: 1200 }}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>System ID</th>
                    <th>Roll</th>
                    <th>Candidate name</th>
                    <th>Hiring result</th>
                    <th>Remarks</th>
                    <th>Errors</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map((r) => (
                    <tr key={r.id} style={!r.is_valid ? { background: 'rgba(239, 68, 68, 0.06)' } : undefined}>
                      <td>{r.row_num}</td>
                      <td>
                        <input
                          className="form-input text-sm font-mono"
                          style={{ minWidth: 100 }}
                          value={r.system_id}
                          onChange={(e) => patchDraft(r.id, 'system_id', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input text-sm font-mono"
                          style={{ minWidth: 88 }}
                          value={r.college_roll_no}
                          onChange={(e) => patchDraft(r.id, 'college_roll_no', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input text-sm"
                          style={{ minWidth: 120 }}
                          value={r.candidate_name}
                          onChange={(e) => patchDraft(r.id, 'candidate_name', e.target.value)}
                          placeholder="Optional"
                        />
                      </td>
                      <td>
                        <select
                          className="form-select text-sm"
                          style={{ minWidth: 120 }}
                          value={r.hiring_result}
                          onChange={(e) => patchDraft(r.id, 'hiring_result', e.target.value)}
                        >
                          {HIRING_RESULT_OPTIONS.map((o) => (
                            <option key={o.value || 'empty'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="form-input text-sm"
                          style={{ minWidth: 140 }}
                          value={r.remarks}
                          onChange={(e) => patchDraft(r.id, 'remarks', e.target.value)}
                        />
                      </td>
                      <td className="text-xs text-secondary" style={{ maxWidth: 220 }}>
                        {r.validation_errors.length ? r.validation_errors.join('; ') : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={savingRowId === r.id}
                          onClick={() => void saveRow(r)}
                        >
                          {savingRowId === r.id ? 'Saving…' : 'Save row'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {draftRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-secondary">
                        No rows in this session.
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
