'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { MAX_CSV_UPLOAD_BYTES, PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';

const MAX_CSV_BYTES = MAX_CSV_UPLOAD_BYTES;
const CSV_MIME_TYPES = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']);

/**
 * CSV upload for Assessment uploads — includes campus + target context.
 * @param {{
 *   kind: 'internship' | 'jobs' | 'drive' | 'projects',
 *   tenantId?: string,
 *   driveId?: string,
 *   jobId?: string,
 *   targetId?: string,
 *   disabled?: boolean,
 *   onUploaded?: (json: object) => void,
 *   onNeedsReview?: () => void
 * }} props
 */
export function AssessmentCsvUploadForm({
  kind,
  tenantId,
  driveId = '',
  jobId = '',
  targetId = '',
  disabled = false,
  onUploaded,
  onNeedsReview,
}) {
  const { addToast } = useToast();
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const resolvedDriveId = (kind === 'drive' ? driveId || targetId : driveId || '').trim();
  const resolvedJobId = (kind !== 'drive' ? jobId || targetId : jobId || '').trim();

  const onUpload = async () => {
    if (!tenantId) {
      addToast('Select a campus before uploading.', 'warning');
      return;
    }
    if (!resolvedDriveId && !resolvedJobId) {
      addToast(
        kind === 'drive'
          ? 'Open the Drive tab, select your placement drive, then upload (or use a CSV with placement_drive_id filled).'
          : 'Select a job posting above before uploading.',
        'warning',
      );
      return;
    }
    if (!file) {
      addToast('Select a CSV file first.', 'warning');
      return;
    }
    const lowerName = String(file.name || '').toLowerCase();
    if (!lowerName.endsWith('.csv')) {
      addToast('Upload a .csv file.', 'warning');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      addToast(`CSV must be ${PLATFORM_SETTINGS_DEFAULTS.maxUploadSizeMb || 5} MB or smaller.`, 'warning');
      return;
    }
    if (file.type && !CSV_MIME_TYPES.has(file.type)) {
      addToast('Upload a valid CSV file.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      form.append('tenantId', tenantId);
      if (resolvedDriveId) form.append('driveId', resolvedDriveId);
      if (resolvedJobId) form.append('jobId', resolvedJobId);

      const res = await fetch('/api/employer/assessments/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 422 && json.needsReview && json.sessionId) {
        addToast('Fix validation errors before importing.', 'warning');
        if (typeof onNeedsReview === 'function') await onNeedsReview();
        router.push(`/dashboard/employer/assessment-uploads/import/${json.sessionId}`);
        return;
      }

      if (!res.ok) throw new Error(json.error || 'Upload failed');
      addToast('Assessment CSV uploaded.', 'success');
      setFile(null);
      if (typeof onUploaded === 'function') onUploaded(json);
    } catch (e) {
      addToast(e.message || 'Upload failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
      <div className="form-group" style={{ marginBottom: 0, flex: '1 1 16rem', minWidth: '14rem' }}>
        <label className="form-label" htmlFor={`assessment-csv-${kind}`}>
          CSV file
        </label>
        <input
          id={`assessment-csv-${kind}`}
          className="form-input"
          type="file"
          accept=".csv,text/csv"
          disabled={disabled || submitting}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled || submitting}
        title={
          disabled && !resolvedDriveId && !resolvedJobId ? 'Select a drive or job above first' : undefined
        }
        onClick={onUpload}
      >
        {submitting ? 'Uploading…' : 'CSV upload'}
      </button>
    </div>
  );
}
