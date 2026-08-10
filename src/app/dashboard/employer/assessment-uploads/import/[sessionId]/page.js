'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { HIRING_RESULT_OPTIONS } from '@/lib/hiringResult';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Review CSV import</h1>
          <p>
            Fix rows below, then <strong>Accept import</strong>. Or reject and re-upload a corrected CSV from{' '}
            <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" render={<Link href={`/dashboard/employer/assessment-uploads/review?kind=${payload?.session?.opportunity_kind || 'jobs'}`} />}>
            All pending imports
          </Button>
          <Button type="button" variant="destructive" disabled={rejecting} onClick={() => void rejectImport()}>
            {rejecting ? 'Rejecting…' : 'Reject import'}
          </Button>
          <Button type="button" disabled={!canAccept || accepting} onClick={() => void acceptImport()}>
            {accepting ? 'Accepting…' : 'Accept import'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 280 }} />
      ) : (
        <>
          <Alert className="mb-4" variant={invalidCount ? 'destructive' : 'default'}>
            <AlertTitle>{invalidCount ? 'Corrections required' : 'Ready to accept'}</AlertTitle>
            <AlertDescription>
              File: <strong>{payload?.session?.original_file_name || '—'}</strong> · Rows: <strong>{draftRows.length}</strong> · Errors:{' '}
              <strong>{invalidCount}</strong>
              {invalidCount > 0 ? (
                <span className="text-secondary"> — save each fixed row, then Accept import.</span>
              ) : draftRows.length > 0 ? (
                <span className="text-secondary"> — all rows valid. You can accept the import.</span>
              ) : null}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Import rows</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 pl-4">Row</TableHead>
                    <TableHead>System ID</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Candidate name</TableHead>
                    <TableHead>Hiring result</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="min-w-[16rem]">Errors</TableHead>
                    <TableHead className="w-[7.5rem] pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftRows.map((r) => (
                    <TableRow key={r.id} className={!r.is_valid ? 'bg-destructive/5' : undefined}>
                      <TableCell className="pl-4 align-top tabular-nums">{r.row_num}</TableCell>
                      <TableCell className="align-top">
                        <Input
                          className="min-w-24 font-mono"
                          value={r.system_id}
                          onChange={(e) => patchDraft(r.id, 'system_id', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          className="min-w-20 font-mono"
                          value={r.college_roll_no}
                          onChange={(e) => patchDraft(r.id, 'college_roll_no', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          className="min-w-28"
                          value={r.candidate_name}
                          onChange={(e) => patchDraft(r.id, 'candidate_name', e.target.value)}
                          placeholder="Optional"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <AdminFilterSelect
                          className="min-w-28"
                          value={r.hiring_result}
                          emptyMapsToAll={false}
                          onValueChange={(v) => patchDraft(r.id, 'hiring_result', v)}
                          items={HIRING_RESULT_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          className="min-w-36"
                          value={r.remarks}
                          onChange={(e) => patchDraft(r.id, 'remarks', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="max-w-xs align-top whitespace-normal">
                        {r.validation_errors.length ? (
                          <ul className="text-destructive m-0 list-none space-y-1 p-0 text-xs leading-snug">
                            {r.validation_errors.map((err) => (
                              <li key={err} className="break-words">
                                {err}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 align-top text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 whitespace-nowrap"
                          disabled={savingRowId === r.id}
                          onClick={() => void saveRow(r)}
                        >
                          {savingRowId === r.id ? 'Saving…' : 'Save row'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {draftRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                        No rows in this session.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
