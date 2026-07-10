'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { buildDriveCtcBreakup } from '@/lib/amountInWords';
import { FIELD_IDS } from '@/lib/inputConstraints';
import {
  driveFormFromApiDrive,
  emptyPlacementDriveForm,
  mapDriveApiErrorToFieldErrors,
  placementDriveFormToApiBody,
  validatePlacementDriveForm,
} from '@/lib/placementDriveJobFields';
import PageLoading from '@/components/PageLoading';
import { formatCurrency, formatStatus } from '@/lib/utils';
import { DriveFormSection, driveFormCompactField, driveFormFullRow } from '@/components/employer/DriveFormSection';
import PlacementDriveJobFormSections from '@/components/employer/PlacementDriveJobFormSections';

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function EmployerEditDrivePage() {
  const router = useRouter();
  const params = useParams();
  const driveId = params?.id;
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyPlacementDriveForm);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = useCallback((key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const scrollToFirstFieldError = useCallback((errors) => {
    const firstKey = Object.keys(errors).find((k) => k !== '_form');
    if (!firstKey) return;
    requestAnimationFrame(() => {
      document.getElementById(`drive-field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const { data, error, isLoading } = useSWR(
    driveId ? `/api/employer/drives/${driveId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const drive = data?.drive;

  useEffect(() => {
    if (!drive) return;
    setForm(driveFormFromApiDrive(drive));
  }, [drive]);

  const saveDrive = useCallback(async (e) => {
    e.preventDefault();
    const validationErrors = validatePlacementDriveForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      scrollToFirstFieldError(validationErrors);
      return;
    }
    setFieldErrors({});
    const ctcBreakup = buildDriveCtcBreakup(form.packageCtc, form.ctcBreakup, formatCurrency);
    const apiBody = placementDriveFormToApiBody(form, { ctcBreakup });
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employer/drives/${driveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
      });
      const json = await res.json();
      if (!res.ok) {
        const apiErrors = mapDriveApiErrorToFieldErrors(json.error || json.userMessage || 'Update failed');
        setFieldErrors(apiErrors);
        scrollToFirstFieldError(apiErrors);
        return;
      }
      addToast('Drive updated. The campus was notified.', 'success');
      router.push('/dashboard/employer/drives');
    } catch {
      setFieldErrors({ _form: 'Network error. Check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [driveId, form, addToast, router, scrollToFirstFieldError]);

  if (isLoading) {
    return <PageLoading message="Loading drive details…" />;
  }

  if (error || !drive) {
    return (
      <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
        <Link href="/dashboard/employer/drives" className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem', paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Back to Placement Drives
        </Link>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {error?.message || 'This drive could not be loaded.'}
          </p>
          <Link href="/dashboard/employer/drives" className="btn btn-secondary">Return to drives</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/dashboard/employer/drives"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', paddingLeft: 0 }}
        >
          <ArrowLeft size={16} />
          Back to Placement Drives
        </Link>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.35rem',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              display: 'flex',
              padding: '0.35rem',
              background: 'var(--primary-50)',
              borderRadius: '8px',
              color: 'var(--primary-600)',
            }}
          >
            <Pencil size={22} />
          </span>
          Edit placement drive
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          Update drive and role details for <strong>{drive.college}</strong>. Campus cannot be changed after submission.
          {drive.status ? ` Current status: ${formatStatus(drive.status)}.` : ''}
        </p>
      </div>

      <form onSubmit={saveDrive} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
        {fieldErrors._form ? (
          <div
            className="card"
            style={{
              padding: '0.875rem 1rem',
              marginBottom: '0.75rem',
              borderColor: 'var(--danger-200)',
              background: 'var(--danger-50)',
              color: 'var(--danger-800)',
              fontSize: '0.875rem',
            }}
            data-drive-field-error
          >
            {fieldErrors._form}
          </div>
        ) : null}
        <DriveFormSection
          title="Drive details"
          description="Campus, schedule, and logistics for this placement drive."
          first
        >
          <div className="form-group" style={driveFormFullRow}>
            <label className="form-label">Campus</label>
            <input className="form-input" value={drive.college || ''} readOnly disabled />
            <span className="form-hint">Campus is fixed for this drive request.</span>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-title">
            <label className="form-label">Drive title <span style={{ color: 'red' }}>*</span></label>
            <input
              className={`form-input${fieldErrors.title ? ' input-error' : ''}`}
              value={form.title}
              onChange={(e) => {
                clearFieldError('title');
                setForm((p) => ({ ...p, title: e.target.value }));
              }}
              placeholder="e.g. SDE — Phase 2"
            />
            {fieldErrors.title ? <p className="form-error" data-drive-field-error>{fieldErrors.title}</p> : null}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Drive type</label>
            <select
              className="form-select"
              value={form.driveType}
              onChange={(e) => setForm((p) => ({ ...p, driveType: e.target.value }))}
            >
              <option value="on_campus">On campus</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
              <option value="off_campus">Off campus</option>
            </select>
          </div>
          <div className="form-group" style={driveFormCompactField} id="drive-field-driveDate">
            <label className="form-label">Drive Date <span style={{ color: 'red' }}>*</span></label>
            <ValidatedDateInput
              fieldId={FIELD_IDS.EMPLOYER_DRIVE_DATE}
              value={form.driveDate}
              onChange={(v) => {
                clearFieldError('driveDate');
                setForm((p) => ({ ...p, driveDate: v }));
              }}
              className={fieldErrors.driveDate ? 'form-input input-error' : 'form-input'}
            />
            {fieldErrors.driveDate ? (
              <p className="form-error" data-drive-field-error>{fieldErrors.driveDate}</p>
            ) : null}
          </div>
          <div className="form-group" style={driveFormFullRow}>
            <label className="form-label">Venue</label>
            <input
              className="form-input"
              value={form.venue}
              onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
              placeholder="Venue (optional — add when known)"
            />
          </div>
          <div className="form-group" style={driveFormFullRow}>
            <label className="form-label">Notes for placement office</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.placementNotes}
              onChange={(e) => setForm((p) => ({ ...p, placementNotes: e.target.value }))}
              placeholder="Scheduling constraints, contact person, or internal context for the TPO team"
            />
            <span className="form-hint">Optional. For the placement office when reviewing your request — not shown to students.</span>
          </div>
        </DriveFormSection>

        <PlacementDriveJobFormSections
          form={form}
          setForm={setForm}
          errors={fieldErrors}
          onFieldEdit={clearFieldError}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1.25rem', borderTop: '1px solid var(--border-default)' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <Link href="/dashboard/employer/drives" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
