'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data;
};

export default function EmployerAssessmentUploadsPage() {
  const { addToast } = useToast();

  const [targetType, setTargetType] = useState('drive');
  const [driveId, setDriveId] = useState('');
  const [jobId, setJobId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [file, setFile] = useState(null);
  const [rounds, setRounds] = useState(['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5']);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [editorUploadId, setEditorUploadId] = useState(null);
  const [draftRows, setDraftRows] = useState([]);
  const [savingRows, setSavingRows] = useState(false);
  const [addRoll, setAddRoll] = useState('');
  const [addRemarks, setAddRemarks] = useState('');
  const [addingRow, setAddingRow] = useState(false);

  const { data: drivesData } = useSWR('/api/employer/drives', fetcher);
  const { data: jobsData } = useSWR('/api/employer/jobs', fetcher);
  const { data: uploadsData, mutate: mutateUploads, error, isLoading } = useSWR('/api/employer/assessments?limit=20', fetcher);
  const {
    data: detailData,
    mutate: mutateDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useSWR(editorUploadId ? `/api/employer/assessments/${editorUploadId}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const rowsSig = useMemo(() => {
    if (!editorUploadId || !detailData?.upload?.id || detailData.upload.id !== editorUploadId || !Array.isArray(detailData.rows)) {
      return '';
    }
    return `${detailData.rows.length}:${detailData.rows.map((r) => r.id).join('|')}`;
  }, [editorUploadId, detailData?.upload?.id, detailData?.rows]);

  useEffect(() => {
    if (!editorUploadId) {
      setDraftRows([]);
      return;
    }
    if (!detailData?.upload?.id || detailData.upload.id !== editorUploadId) {
      setDraftRows([]);
      return;
    }
    if (!Array.isArray(detailData.rows)) return;
    setDraftRows(detailData.rows.map((r) => ({ ...r })));
  }, [editorUploadId, rowsSig, detailData?.upload?.id, detailData?.rows]);

  const roundLabels = useMemo(() => {
    const roundsMeta = Array.isArray(detailData?.rounds) ? detailData.rounds : [];
    return [1, 2, 3, 4, 5].map((n) => {
      const hit = roundsMeta.find((x) => Number(x.round_no) === n);
      return hit?.round_label || `Round ${n}`;
    });
  }, [detailData]);

  const patchDraft = (rowId, field, value) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
  };

  const saveDraftRows = async () => {
    if (!editorUploadId || draftRows.length === 0) {
      addToast('Nothing to save.', 'warning');
      return;
    }
    setSavingRows(true);
    try {
      const res = await fetch(`/api/employer/assessments/${editorUploadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: draftRows.map((r) => ({
            id: r.id,
            round_1_result: r.round_1_result,
            round_2_result: r.round_2_result,
            round_3_result: r.round_3_result,
            round_4_result: r.round_4_result,
            round_5_result: r.round_5_result,
            remarks: r.remarks,
            candidate_name: r.candidate_name,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Save failed');
      addToast('Assessment rows saved.', 'success');
      await mutateDetail();
      await mutateUploads();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingRows(false);
    }
  };

  const addManualRow = async () => {
    if (!editorUploadId || !addRoll.trim()) {
      addToast('Enter a college roll number.', 'warning');
      return;
    }
    setAddingRow(true);
    try {
      const res = await fetch(`/api/employer/assessments/${editorUploadId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_roll_no: addRoll.trim(),
          remarks: addRemarks.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not add row');
      addToast(json.created ? 'Student added to this upload.' : 'Student updated in this upload.', 'success');
      setAddRoll('');
      setAddRemarks('');
      await mutateDetail();
      await mutateUploads();
    } catch (e) {
      addToast(e.message || 'Could not add row', 'error');
    } finally {
      setAddingRow(false);
    }
  };

  const drives = Array.isArray(drivesData?.drives) ? drivesData.drives : [];
  const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : [];
  const uploads = uploadsData?.uploads || [];
  const selectedDrive = useMemo(() => drives.find((d) => d.id === driveId), [drives, driveId]);

  const downloadTemplate = () => {
    window.location.href = '/api/employer/assessments/template';
  };

  const onUpload = async () => {
    if (!file) {
      addToast('Please select a CSV file first.', 'warning');
      return;
    }
    const lowerName = String(file.name || '').toLowerCase();
    if (!lowerName.endsWith('.csv')) {
      addToast('Please upload a .csv file.', 'warning');
      return;
    }
    if (targetType === 'job' && !jobId) {
      addToast('Select a job.', 'warning');
      return;
    }
    if (targetType === 'job' && !tenantId.trim()) {
      addToast('Tenant ID is required for job-level upload.', 'warning');
      return;
    }
    if (rounds.some((r) => !String(r || '').trim())) {
      addToast('Please provide names for all 5 rounds.', 'warning');
      return;
    }

    setSubmitting(true);
    setLastResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (targetType === 'drive' && driveId) form.append('driveId', driveId);
      if (targetType === 'job') {
        form.append('jobId', jobId);
        form.append('tenantId', tenantId.trim());
      }
      rounds.forEach((r, i) => form.append(`round_${i + 1}_name`, r || `Round ${i + 1}`));

      const res = await fetch('/api/employer/assessments/upload', {
        method: 'POST',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setLastResult(json);
      setShowAllErrors(false);
      addToast('Assessment CSV uploaded.', 'success');
      await mutateUploads();
    } catch (e) {
      addToast(e.message || 'Upload failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧪 Assessment Uploads</h1>
          <p>
            <strong>CSV is the primary path:</strong> upload once, then use <strong>View / edit</strong> below to fix typos or adjust outcomes.
            Unsure where things live? See{' '}
            <Link href="/dashboard/employer/assessment-summary" style={{ fontWeight: 600 }}>
              Assessment map
            </Link>
            .{' '}
            <Link href="/dashboard/employer/hiring-assessment" style={{ fontWeight: 600 }}>
              Hiring Assessment
            </Link>{' '}
            is a read-only campus view of these same upload rows (summary + export only).
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <ExportCsvSplitButton
            mode="dual"
            filenameBase="employer_assessment_uploads"
            currentCount={uploads.length}
            fullCount={uploads.length}
            getRows={() => ({
              headers: ['id', 'created_at', 'target', 'original_file_name', 'total_rows', 'accepted_rows', 'rejected_rows'],
              rows: uploads.map((u) => [
                u.id,
                u.created_at ? new Date(u.created_at).toISOString() : '',
                u.drive_id ? `drive:${u.drive_id}` : `job:${u.job_id || ''}`,
                u.original_file_name ?? '',
                String(u.total_rows ?? ''),
                String(u.accepted_rows ?? ''),
                String(u.rejected_rows ?? ''),
              ]),
            })}
          />
          <button className="btn btn-secondary" type="button" onClick={downloadTemplate}>Download CSV template</button>
        </div>
      </div>

      <div className="directive-panel" role="region" aria-label="How to use assessment uploads">
        <p className="directive-panel__title">What to do (in order)</p>
        <ol className="directive-steps">
          <li>
            <strong>Use the section below</strong> — choose <strong>drive or job</strong>, attach the <strong>CSV</strong>, and name the five rounds (those names are labels for your team; the file still uses{' '}
            <code>round_1</code>…<code>round_5</code>).
          </li>
          <li>
            <strong>Press “Upload CSV”</strong> — the summary shows accepted vs rejected rows. Fix the sheet and upload again if something failed.
          </li>
          <li>
            <strong>In Upload history, click “View / edit”</strong> — change any result, then <strong>Save changes</strong>. Adding one extra student by roll at the bottom is <strong>optional</strong>.
          </li>
        </ol>
        <p className="directive-hint">
          <Link href="/dashboard/employer/hiring-assessment">Hiring Assessment</Link> mirrors this data per campus for reporting; it does not accept edits — keep
          changing results here.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
          1 · Upload spreadsheet
        </h3>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
          Most teams only need this block. Download the template if you are unsure about columns.
        </p>
        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label">Target</label>
            <select className="form-select" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <option value="drive">Placement Drive</option>
              <option value="job">Job</option>
            </select>
            <p className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
              Only placement drives/jobs are supported. Internships/projects are blocked.
            </p>
          </div>

          {targetType === 'drive' ? (
            <div className="form-group">
              <label className="form-label">Drive</label>
              <select className="form-select" value={driveId} onChange={(e) => { setDriveId(e.target.value); setTenantId(''); }}>
                <option value="">Select drive</option>
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {(d.role || d.title || d.college || 'Drive') + (d.date ? ` (${formatDate(d.date)})` : '')}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Job</label>
              <select className="form-select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">Select job</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">CSV file</label>
            <input className="form-input" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
              Key must be <strong>college_roll_no</strong>. Template includes <strong>placement_drive_id</strong> (optional
              if you choose the drive above; required on every row if you leave the dropdown empty). Use the same UUID for
              all rows. Column <strong>remarks</strong> (last column) is optional — panel notes, up to 4000 characters. Students
              outside the college master list are rejected.
            </p>
          </div>
        </div>

        <div className="grid grid-3" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label className="form-label">Round 1 name</label>
            <input className="form-input" value={rounds[0]} onChange={(e) => setRounds((r) => [e.target.value, r[1], r[2], r[3], r[4]])} />
          </div>
          <div className="form-group">
            <label className="form-label">Round 2 name</label>
            <input className="form-input" value={rounds[1]} onChange={(e) => setRounds((r) => [r[0], e.target.value, r[2], r[3], r[4]])} />
          </div>
          <div className="form-group">
            <label className="form-label">Round 3 name</label>
            <input className="form-input" value={rounds[2]} onChange={(e) => setRounds((r) => [r[0], r[1], e.target.value, r[3], r[4]])} />
          </div>
          <div className="form-group">
            <label className="form-label">Round 4 name</label>
            <input className="form-input" value={rounds[3]} onChange={(e) => setRounds((r) => [r[0], r[1], r[2], e.target.value, r[4]])} />
          </div>
          <div className="form-group">
            <label className="form-label">Round 5 name</label>
            <input className="form-input" value={rounds[4]} onChange={(e) => setRounds((r) => [r[0], r[1], r[2], r[3], e.target.value])} />
          </div>
          {targetType === 'job' ? (
            <div className="form-group">
              <label className="form-label">Tenant ID (required for job)</label>
              <input className="form-input" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="College tenant UUID" />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Tenant context</label>
              <input className="form-input" disabled value={selectedDrive?.tenant_id || 'Auto from selected drive'} />
            </div>
          )}
        </div>
        <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
          System columns are <code>round_1</code>…<code>round_5</code> plus optional <code>remarks</code>. Round names above are display labels only.
          After upload, open <strong>View / edit</strong> — the grid’s rightmost column is <strong>Remarks</strong> (same field).
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button className="btn btn-primary" disabled={submitting} onClick={onUpload}>
            {submitting ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
      </div>

      {lastResult && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">Latest upload summary</h3>
          <p>
            Total: <strong>{lastResult.totalRows}</strong> | Accepted: <strong>{lastResult.acceptedRows}</strong> | Rejected:{' '}
            <strong>{lastResult.rejectedRows}</strong>
          </p>
          {Array.isArray(lastResult.errors) && lastResult.errors.length > 0 && (
            <div className="text-sm text-secondary" style={{ marginTop: '0.5rem', maxHeight: 160, overflowY: 'auto' }}>
              {(showAllErrors ? lastResult.errors : lastResult.errors.slice(0, 20)).map((e) => (
                <div key={e}>• {e}</div>
              ))}
              {lastResult.errors.length > 20 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setShowAllErrors((v) => !v)}
                >
                  {showAllErrors ? 'Show less' : `Show all ${lastResult.errors.length} errors`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
          2 · Upload history
        </h3>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
          After a file lands here, use <strong>View / edit</strong> on the right to open the grid — that is the only place to change round results (Hiring Assessment is read-only).
        </p>
        {error && <p style={{ color: 'var(--danger-600)' }}>{error.message}</p>}
        {isLoading ? (
          <div className="skeleton skeleton-card" style={{ height: 180 }} />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Target</th>
                  <th>File</th>
                  <th>Total</th>
                  <th>Accepted</th>
                  <th>Rejected</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    <td>{u.drive_id ? `Drive (${String(u.drive_id).slice(0, 8)}...)` : `Job (${String(u.job_id).slice(0, 8)}...)`}</td>
                    <td>{u.original_file_name}</td>
                    <td>{u.total_rows}</td>
                    <td>{u.accepted_rows}</td>
                    <td>{u.rejected_rows}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditorUploadId(u.id);
                          setAddRoll('');
                          setAddRemarks('');
                        }}
                      >
                        {editorUploadId === u.id ? 'Editing…' : 'View / edit'}
                      </button>
                    </td>
                  </tr>
                ))}
                {uploads.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No uploads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorUploadId && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <h3 className="card-title">3 · Results for this upload — edit &amp; save</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditorUploadId(null)}>
                Close editor
              </button>
              <button type="button" className="btn btn-primary" disabled={savingRows || draftRows.length === 0} onClick={saveDraftRows}>
                {savingRows ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
          {detailError && <p style={{ color: 'var(--danger-600)' }}>{detailError.message}</p>}
          {detailLoading ? (
            <div className="skeleton skeleton-card" style={{ height: 200 }} />
          ) : (
            <>
              <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                Edit round outcomes below; use the <strong>Remarks</strong> column (far right) for notes — or set <strong>remarks</strong> in your CSV before upload.
                You can add one student by roll at the bottom (optional).
              </p>
              <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
                <table className="data-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Account name</th>
                      <th>Candidate (override)</th>
                      {roundLabels.map((label, i) => (
                        <th key={i}>{label}</th>
                      ))}
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono text-sm">{r.roll_number}</td>
                        <td className="text-sm">{r.account_name || '—'}</td>
                        <td>
                          <input
                            className="form-input"
                            style={{ minWidth: 120, fontSize: '0.8rem' }}
                            value={r.candidate_name || ''}
                            onChange={(e) => patchDraft(r.id, 'candidate_name', e.target.value)}
                            placeholder="Optional"
                          />
                        </td>
                        {['round_1_result', 'round_2_result', 'round_3_result', 'round_4_result', 'round_5_result'].map((field) => (
                          <td key={field}>
                            <input
                              className="form-input"
                              style={{ minWidth: 88, fontSize: '0.8rem' }}
                              value={r[field] || ''}
                              onChange={(e) => patchDraft(r.id, field, e.target.value)}
                            />
                          </td>
                        ))}
                        <td>
                          <textarea
                            className="form-input"
                            style={{ minWidth: 160, fontSize: '0.8rem', minHeight: 48 }}
                            value={r.remarks || ''}
                            onChange={(e) => patchDraft(r.id, 'remarks', e.target.value)}
                            rows={2}
                          />
                        </td>
                      </tr>
                    ))}
                    {draftRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-secondary">
                          No accepted rows for this upload yet. Use optional add-by-roll below, or re-upload a CSV with valid rolls.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle, #e5e7eb)' }}>
                <h4 className="text-sm font-semibold" style={{ marginBottom: '0.5rem' }}>
                  Optional: add one student by roll
                </h4>
                <p className="text-xs text-tertiary" style={{ marginBottom: '0.5rem' }}>
                  Same rules as CSV: roll must exist on this upload’s campus. If the student is already in this upload, their row is updated.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 480 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ maxWidth: 220 }}
                      placeholder="College roll no."
                      value={addRoll}
                      onChange={(e) => setAddRoll(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary" disabled={addingRow} onClick={addManualRow}>
                      {addingRow ? 'Adding…' : 'Add to upload'}
                    </button>
                  </div>
                  <textarea
                    className="form-input"
                    style={{ minHeight: 56, fontSize: '0.875rem' }}
                    placeholder="Optional remarks for this student (same as CSV remarks column)"
                    value={addRemarks}
                    onChange={(e) => setAddRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
