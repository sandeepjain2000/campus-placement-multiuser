'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { buildDriveCtcBreakup } from '@/lib/amountInWords';
import { FIELD_IDS } from '@/lib/inputConstraints';
import {
  emptyPlacementDriveForm,
  mapDriveApiErrorToFieldErrors,
  placementDriveFormToApiBody,
  validatePlacementDriveForm,
} from '@/lib/placementDriveJobFields';
import { formatCurrency } from '@/lib/utils';
import PlacementDriveJobFormSections, {
  adminInputClass,
  adminNativeSelectClass,
} from '@/components/employer/PlacementDriveJobFormSections';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import EmployerListFormLayout from '@/components/employer/EmployerListFormLayout';
import { useEmployerPostingCampuses } from '@/hooks/useEmployerPostingCampuses';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const fetcher = (url) => fetch(url).then((r) => r.json());

function tabForDriveErrors(errors) {
  const keys = Object.keys(errors);
  if (keys.some((key) => ['campusId', 'title', 'driveDate'].includes(key))) return 'drive';
  if (keys.some((key) => ['jobType', 'vacancies'].includes(key))) return 'role';
  if (keys.some((key) => ['minCgpa', 'maxBacklogs', 'batchYear', 'minTenthPct', 'minTwelfthPct', 'applicationDeadline'].includes(key))) {
    return 'eligibility';
  }
  if (keys.some((key) => ['salaryMin', 'salaryMax'].includes(key))) return 'compensation';
  return null;
}

export default function EmployerRequestDrivePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [campusId, setCampusId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyPlacementDriveForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formTab, setFormTab] = useState('drive');

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
    const errorTab = tabForDriveErrors(errors);
    if (errorTab) setFormTab(errorTab);
    requestAnimationFrame(() => {
      document.getElementById(`drive-field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const { data: campusData } = useSWR('/api/employer/campuses', fetcher, { revalidateOnFocus: false });
  const approvedCampuses = useEmployerPostingCampuses(campusData, 'drives');

  const submitDrive = useCallback(async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!campusId) nextErrors.campusId = 'Select a campus for this drive.';
    Object.assign(nextErrors, validatePlacementDriveForm(form));
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      scrollToFirstFieldError(nextErrors);
      return;
    }
    setFieldErrors({});
    const ctcBreakup = buildDriveCtcBreakup(form.packageCtc, form.ctcBreakup, formatCurrency);
    const apiBody = placementDriveFormToApiBody(form, { ctcBreakup });
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: campusId, ...apiBody }),
      });
      const json = await res.json();
      if (!res.ok) {
        const apiErrors = mapDriveApiErrorToFieldErrors(json.userMessage || json.error || 'Request failed');
        setFieldErrors(apiErrors);
        scrollToFirstFieldError(apiErrors);
        return;
      }
      addToast('Drive saved. College admins were notified.', 'success');
      router.push('/dashboard/employer/drives');
    } catch {
      setFieldErrors({ _form: 'Network error. Check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [campusId, form, addToast, router, scrollToFirstFieldError]);

  return (
    <EmployerListFormLayout
      title="Request placement drive"
      subtitle="Submit a drive request with full role details. The placement office will review it before students can register."
      backLabel="Back to Placement Drives"
      onBack={() => router.push('/dashboard/employer/drives')}
      footer={
        approvedCampuses.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" disabled={submitting} onClick={() => router.push('/dashboard/employer/drives')}>
              Cancel
            </Button>
            <Button type="submit" form="request-drive-form" disabled={submitting}>
              {submitting ? 'Saving…' : 'Submit request'}
            </Button>
          </div>
        ) : null
      }
    >
      {approvedCampuses.length === 0 ? (
        <Alert>
          <AlertCircle />
          <AlertTitle>Approved campus required</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>You need at least one approved campus partnership before requesting a drive.</span>
            <Link href="/dashboard/employer/select-campus" className={buttonVariants()}>
              Find campus partners
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <form id="request-drive-form" onSubmit={submitDrive} className="flex w-full flex-col gap-4">
          {fieldErrors._form ? (
            <Alert variant="destructive" data-drive-field-error>
              <AlertCircle />
              <AlertTitle>Could not save drive</AlertTitle>
              <AlertDescription>{fieldErrors._form}</AlertDescription>
            </Alert>
          ) : null}
          <PlacementDriveJobFormSections
            form={form}
            setForm={setForm}
            errors={fieldErrors}
            onFieldEdit={clearFieldError}
            activeTab={formTab}
            onTabChange={setFormTab}
            driveDetails={
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="gap-2" id="drive-field-campusId" data-invalid={fieldErrors.campusId ? true : undefined}>
                  <FieldLabel htmlFor="drive-campus">
                    Campus <span className="text-destructive">*</span>
                  </FieldLabel>
                  <AdminFilterSelect
                    id="drive-campus"
                    className={adminNativeSelectClass}
                    aria-invalid={fieldErrors.campusId ? true : undefined}
                    value={campusId}
                    emptyMapsToAll={false}
                    onValueChange={(id) => {
                      clearFieldError('campusId');
                      setCampusId(id);
                    }}
                    items={[
                      { label: '— Select a campus —', value: '' },
                      ...approvedCampuses.map((c) => ({ label: c.name, value: String(c.id) })),
                    ]}
                  />
                  {fieldErrors.campusId ? (
                    <FieldError data-drive-field-error>{fieldErrors.campusId}</FieldError>
                  ) : (
                    <FieldDescription>Only approved campus partnerships are shown.</FieldDescription>
                  )}
                </Field>
                <Field className="gap-2" id="drive-field-title" data-invalid={fieldErrors.title ? true : undefined}>
                  <FieldLabel htmlFor="drive-title">
                    Drive title <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="drive-title"
                    aria-invalid={fieldErrors.title ? true : undefined}
                    value={form.title}
                    onChange={(e) => {
                      clearFieldError('title');
                      setForm((p) => ({ ...p, title: e.target.value }));
                    }}
                    placeholder="e.g. SDE — Phase 2"
                  />
                  {fieldErrors.title ? <FieldError data-drive-field-error>{fieldErrors.title}</FieldError> : null}
                </Field>
                <Field className="gap-2">
                  <FieldLabel htmlFor="drive-type">Drive type</FieldLabel>
                  <AdminFilterSelect
                    id="drive-type"
                    className={adminNativeSelectClass}
                    value={form.driveType}
                    emptyMapsToAll={false}
                    onValueChange={(driveType) => setForm((p) => ({ ...p, driveType }))}
                    items={[
                      { label: 'On campus', value: 'on_campus' },
                      { label: 'Virtual', value: 'virtual' },
                      { label: 'Hybrid', value: 'hybrid' },
                      { label: 'Off campus', value: 'off_campus' },
                    ]}
                  />
                </Field>
                <Field className="gap-2" id="drive-field-driveDate" data-invalid={fieldErrors.driveDate ? true : undefined}>
                  <FieldLabel htmlFor="drive-date">
                    Drive date <span className="text-destructive">*</span>
                  </FieldLabel>
                  <ValidatedDateInput
                    id="drive-date"
                    fieldId={FIELD_IDS.EMPLOYER_DRIVE_DATE}
                    value={form.driveDate}
                    onChange={(v) => {
                      clearFieldError('driveDate');
                      setForm((p) => ({ ...p, driveDate: v }));
                    }}
                    className={`${adminInputClass}${fieldErrors.driveDate ? ' border-destructive ring-destructive/20' : ''}`}
                  />
                  {fieldErrors.driveDate ? <FieldError data-drive-field-error>{fieldErrors.driveDate}</FieldError> : null}
                </Field>
                <Field className="gap-2 sm:col-span-2">
                  <FieldLabel htmlFor="drive-venue">Venue</FieldLabel>
                  <Input
                    id="drive-venue"
                    value={form.venue}
                    onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                    placeholder="Venue (optional — add when known)"
                  />
                </Field>
                <Field className="gap-2 sm:col-span-2">
                  <FieldLabel htmlFor="drive-placement-notes">Notes for placement office</FieldLabel>
                  <Textarea
                    id="drive-placement-notes"
                    rows={3}
                    value={form.placementNotes}
                    onChange={(e) => setForm((p) => ({ ...p, placementNotes: e.target.value }))}
                    placeholder="Scheduling constraints, contact person, or internal context for the TPO team"
                  />
                  <FieldDescription>
                    Optional. For the placement office when reviewing your request — not shown to students.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            }
          />
        </form>
      )}
    </EmployerListFormLayout>
  );
}
