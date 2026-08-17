'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CV_LABEL_MAX_LENGTH } from '@/lib/studentCvShared';
import {
  STUDENT_CV_LOAD,
  STUDENT_CV_LOAD_MESSAGES,
  fetchStudentCvListClassified,
} from '@/lib/studentCvLoadClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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

  const showCvPicker = !legacyMode && cvs.length > 0;
  const submitDisabled = Boolean(blockReason) || submitting || loading || Boolean(loadError);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md gap-4" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle id="student-apply-cv-modal-title">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="grid gap-4">
          {loading ? <p className="text-muted-foreground m-0 text-sm">Loading your CVs…</p> : null}

          {loadError ? (
            <Alert className="border-amber-600/20 bg-amber-600/10 text-amber-800 dark:text-amber-400">
              <AlertDescription className="text-amber-800 dark:text-amber-400">{loadError}</AlertDescription>
            </Alert>
          ) : null}

          {showCvPicker ? (
            <div className="grid gap-2">
              <p className="text-foreground m-0 text-sm font-medium">Choose CV</p>
              <RadioGroup
                value={selectedCvId || ''}
                onValueChange={setSelectedCvId}
                disabled={submitting}
                className="grid gap-2"
              >
                {cvs.map((cv) => {
                  const selected = selectedCvId === cv.id;
                  return (
                    <label
                      key={cv.id}
                      className={`border-input bg-background flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 ${
                        selected ? 'border-primary ring-primary/30 ring-2' : ''
                      }`}
                    >
                      <RadioGroupItem value={cv.id} disabled={submitting} />
                      <span className="text-sm">
                        {cv.label}
                        {cv.isDefault ? (
                          <StatusBadge tone="green" className="ml-1.5">
                            Default
                          </StatusBadge>
                        ) : null}
                        {cv.isVerified ? (
                          <StatusBadge tone="green" className="ml-1.5">
                            Verified
                          </StatusBadge>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
              <p className="text-muted-foreground m-0 text-xs">
                Employers see your CV label only — not the original file name.
              </p>
            </div>
          ) : null}

          {!loading && legacyMode ? (
            <p className="text-muted-foreground m-0 text-sm">
              Your profile résumé will be submitted with this application.
            </p>
          ) : null}

          {children}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="secondary"
            size="sm"
            className="w-fit"
            render={<Link href="/dashboard/student/my-cvs" />}
            nativeButton={false}
          >
            Manage CVs
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitDisabled}
              aria-disabled={submitDisabled ? 'true' : undefined}
              title={blockReason || undefined}
            >
              {submitting ? 'Submitting…' : submitLabel}
            </Button>
          </div>
          {blockReason ? (
            <p className="text-amber-700 dark:text-amber-400 m-0 w-full text-sm sm:col-span-2">{blockReason}</p>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <Field data-disabled={disabled || undefined}>
      <FieldLabel>
        CV label <span className="text-destructive">*</span>
      </FieldLabel>
      <Input
        value={label}
        maxLength={CV_LABEL_MAX_LENGTH}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Product resume"
      />
      <FieldDescription>
        {label.length}/{CV_LABEL_MAX_LENGTH} — shown to employers instead of the file name
      </FieldDescription>
    </Field>
  );
}
