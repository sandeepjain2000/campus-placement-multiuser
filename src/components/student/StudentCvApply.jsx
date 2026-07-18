'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CV_LABEL_MAX_LENGTH } from '@/lib/studentCvShared';
import {
  STUDENT_CV_LOAD,
  STUDENT_CV_LOAD_MESSAGES,
  fetchStudentCvListClassified,
} from '@/lib/studentCvLoadClient';

async function loadEligibleCvs() {
  const result = await fetchStudentCvListClassified();

  if (result.status === STUDENT_CV_LOAD.REQUEST_FAILED) {
    return {
      kind: 'request_failed',
      error: result.message || STUDENT_CV_LOAD_MESSAGES.REQUEST_FAILED,
    };
  }

  if (result.status === STUDENT_CV_LOAD.UNAVAILABLE || result.legacy) {
    return {
      kind: 'legacy',
      items: [],
      legacyResumeAvailable: true,
      verificationRequired: false,
      message: result.message || null,
    };
  }

  const items = Array.isArray(result.items) ? result.items.filter((c) => !c.archivedAt) : [];
  const verificationRequired = Boolean(result.cvVerification?.required);
  const eligible = verificationRequired ? items.filter((c) => c.isVerified) : items;

  if (!items.length) {
    if (result.legacyResumeAvailable) {
      return { kind: 'legacy', items: [], legacyResumeAvailable: true, verificationRequired };
    }
    return {
      kind: 'empty',
      error: STUDENT_CV_LOAD_MESSAGES.EMPTY,
    };
  }
  if (verificationRequired && !eligible.length) {
    return {
      kind: 'empty',
      error: 'Your college requires a verified CV before applying to drives and internships.',
    };
  }

  return { kind: 'ok', items: eligible, verificationRequired };
}

/**
 * Single apply dialog: choose CV first, then optional extra fields, then submit.
 */
export function StudentApplyWithCvModal({
  open,
  onClose,
  title,
  description,
  children,
  blockReason = '',
  submitLabel = 'Submit application',
  submitting = false,
  onConfirm,
  onError,
}) {
  const [cvs, setCvs] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [legacyMode, setLegacyMode] = useState(false);

  useEffect(() => {
    if (!open) {
      setCvs([]);
      setSelectedCvId('');
      setLoadError('');
      setLegacyMode(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError('');

    void (async () => {
      const result = await loadEligibleCvs();
      if (cancelled) return;

      if (result.kind === 'request_failed') {
        setLoadError(result.error);
        setLoading(false);
        return;
      }

      if (result.kind === 'empty') {
        setLoadError(result.error);
        setLoading(false);
        return;
      }

      if (result.kind === 'error') {
        setLoadError(result.error);
        setLoading(false);
        return;
      }

      if (result.kind === 'legacy') {
        setLegacyMode(true);
        setCvs([]);
        setLoading(false);
        return;
      }

      const eligible = result.items;
      const defaultCv = eligible.find((c) => c.isDefault);
      setCvs(eligible);
      setSelectedCvId(defaultCv?.id || eligible[0]?.id || '');
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (blockReason || submitting || loading) return;

    if (loadError) return;

    let cvId = null;
    if (!legacyMode) {
      if (cvs.length > 1 && !selectedCvId) {
        onError?.('Choose which CV to submit.');
        return;
      }
      if (cvs.length >= 1) {
        cvId = selectedCvId || cvs[0].id;
      }
    }

    try {
      await onConfirm(cvId);
    } catch {
      onError?.('Could not submit application.');
    }
  }, [
    blockReason,
    submitting,
    loading,
    loadError,
    legacyMode,
    cvs,
    selectedCvId,
    onConfirm,
    onError,
  ]);

  if (!open) return null;

  const showCvPicker = !legacyMode && cvs.length > 0;
  const submitDisabled = Boolean(blockReason) || submitting || loading || Boolean(loadError);

  return (
    <div
      className="modal-overlay modal-overlay-solid"
      role="presentation"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-apply-cv-modal-title"
        style={{ maxWidth: 440, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="student-apply-cv-modal-title" className="modal-title">
            {title}
          </h2>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          {description ? (
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              {description}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Loading your CVs…
            </p>
          ) : null}

          {loadError ? (
            <div
              className="text-sm"
              style={{
                margin: 0,
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--warning-50, #fffbeb)',
                color: 'var(--warning-800, #92400e)',
                border: '1px solid var(--warning-200, #fde68a)',
              }}
            >
              {loadError}
            </div>
          ) : null}

          {showCvPicker ? (
            <div>
              <p className="form-label" style={{ marginBottom: '0.5rem' }}>
                Choose CV
              </p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {cvs.map((cv) => (
                  <label
                    key={cv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 8,
                      border: `1px solid ${selectedCvId === cv.id ? 'var(--primary-400)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="apply-cv-picker"
                      checked={selectedCvId === cv.id}
                      onChange={() => setSelectedCvId(cv.id)}
                      disabled={submitting}
                    />
                    <span>
                      {cv.label}
                      {cv.isDefault ? (
                        <span className="badge badge-green" style={{ marginLeft: 6 }}>
                          Default
                        </span>
                      ) : null}
                      {cv.isVerified ? (
                        <span className="badge badge-green" style={{ marginLeft: 6 }}>
                          Verified
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-secondary" style={{ margin: '0.5rem 0 0' }}>
                Employers see your CV label only — not the original file name.
              </p>
            </div>
          ) : null}

          {!loading && legacyMode ? (
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Your profile résumé will be submitted with this application.
            </p>
          ) : null}

          {children}
        </div>

        <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href="/dashboard/student/my-cvs" className="btn btn-secondary btn-sm">
            Manage CVs
          </Link>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSubmit()}
              disabled={submitDisabled}
              aria-disabled={submitDisabled ? 'true' : undefined}
              title={blockReason || undefined}
            >
              {submitting ? 'Submitting…' : submitLabel}
            </button>
          </div>
          {blockReason ? (
            <p className="text-sm" style={{ width: '100%', margin: '0.25rem 0 0', color: 'var(--warning-700, #b45309)' }}>
              {blockReason}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function useStudentApplyWithCvModal({ onApply, onError, renderExtras }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    description: '',
    blockReason: '',
    submitLabel: 'Submit application',
    metadata: null,
  });
  const metadataRef = useRef(null);
  const renderExtrasRef = useRef(renderExtras);
  renderExtrasRef.current = renderExtras;

  const openApplyModal = useCallback((nextConfig) => {
    metadataRef.current = nextConfig.metadata ?? null;
    setConfig({
      title: nextConfig.title || 'Submit application',
      description: nextConfig.description || '',
      blockReason: nextConfig.blockReason || '',
      submitLabel: nextConfig.submitLabel || 'Submit application',
      metadata: nextConfig.metadata ?? null,
    });
    setOpen(true);
  }, []);

  const closeApplyModal = useCallback(() => {
    if (submitting) return;
    setOpen(false);
    metadataRef.current = null;
  }, [submitting]);

  const handleConfirm = useCallback(
    async (cvId) => {
      setSubmitting(true);
      try {
        await onApply(cvId, metadataRef.current);
        setOpen(false);
        metadataRef.current = null;
      } finally {
        setSubmitting(false);
      }
    },
    [onApply],
  );

  const applyModal = (
    <StudentApplyWithCvModal
      open={open}
      onClose={closeApplyModal}
      title={config.title}
      description={config.description}
      blockReason={config.blockReason}
      submitLabel={config.submitLabel}
      submitting={submitting}
      onConfirm={handleConfirm}
      onError={onError}
    >
      {typeof renderExtrasRef.current === 'function'
        ? renderExtrasRef.current(metadataRef.current, { submitting })
        : null}
    </StudentApplyWithCvModal>
  );

  return { openApplyModal, closeApplyModal, applyModal, applying: submitting, applyModalOpen: open };
}

/**
 * @deprecated Prefer useStudentApplyWithCvModal for a single combined dialog.
 */
export function useStudentCvApply({ onApply, onError }) {
  const { openApplyModal, applyModal, applying } = useStudentApplyWithCvModal({
    onApply: async (cvId) => onApply(cvId),
    onError,
  });

  const runApplyFlow = useCallback(async () => {
    openApplyModal({
      title: 'Submit application',
      description: 'Choose which CV to submit with this application.',
    });
  }, [openApplyModal]);

  return { runApplyFlow, pickerModal: applyModal, applying };
}

/**
 * Shared apply flow for program opportunities (internships, jobs, projects, hackathons).
 */
export function useProgramApplicationWithCv({ addToast, mutate, fetchApply = fetch }) {
  const applyTargetRef = useRef(null);
  const [applyingId, setApplyingId] = useState(null);

  const { openApplyModal, applyModal, applying } = useStudentApplyWithCvModal({
    onApply: async (cvId, metadata) => {
      const target = metadata || applyTargetRef.current;
      if (!target?.jobId) return;
      setApplyingId(target.jobId);
      try {
        const body = { jobId: target.jobId };
        if (cvId) body.cvId = cvId;
        const res = await fetchApply('/api/student/program-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(json.error || 'Could not apply', 'error');
          return;
        }
        addToast(`Applied to ${target.title}`, 'success');
        mutate?.();
      } catch {
        addToast('Network error', 'error');
      } finally {
        setApplyingId(null);
        applyTargetRef.current = null;
      }
    },
    onError: (msg) => addToast(msg, 'error'),
  });

  const startApply = useCallback(
    (jobId, title, options = {}) => {
      const target = { jobId, title };
      applyTargetRef.current = target;
      openApplyModal({
        title: `Apply to ${title}`,
        description: 'Choose which CV to submit with this application.',
        blockReason: options.blockReason || '',
        metadata: target,
        children: options.children ?? null,
      });
    },
    [openApplyModal],
  );

  const activeApplyingId = applyingId || (applying ? applyTargetRef.current?.jobId : null);

  return { startApply, applyingId: activeApplyingId, pickerModal: applyModal };
}

export function CvLabelInput({ label, onChange, disabled }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="form-label">
        CV label <span style={{ color: 'var(--danger-600)' }}>*</span>
      </span>
      <input
        className="form-input"
        value={label}
        maxLength={CV_LABEL_MAX_LENGTH}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Product resume"
      />
      <span className="text-xs text-secondary">
        {label.length}/{CV_LABEL_MAX_LENGTH} — shown to employers instead of the file name
      </span>
    </label>
  );
}
