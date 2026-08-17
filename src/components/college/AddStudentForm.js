'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Plus, Loader2, Save, Upload } from 'lucide-react';
import TagPicker from '@/components/TagPicker';
import { resolveStudentRollNumber } from '@/lib/validators';
import {
  ADD_STUDENT_DEPARTMENTS,
  GENDERS,
  CATEGORIES,
  DISABILITY_OPTIONS,
  PLACEMENT_STATUSES,
  INTERNSHIP_STATUSES,
  SEMESTER_OPTIONS,
  initialCollegeStudentForm,
  validateCollegeStudentForm,
} from '@/lib/collegeStudentAdminFields';
import AcademicProgramPicker from '@/components/college/AcademicProgramPicker';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import AdmissionBatchYearPicker from '@/components/college/AdmissionBatchYearPicker';
import { mapProgramToStudentFields } from '@/lib/academicTaxonomy/mapProgram';
import { getMaxAdmissionBatchYear } from '@/lib/admissionBatchYear';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import CurrencyAmountInput from '@/components/form/CurrencyAmountInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import StudentListAvatar from '@/components/student/StudentListAvatar';
import { uploadCollegeStudentAvatarViaServer } from '@/lib/clientCollegeStudentAvatarUpload';
import { studentAvatarAcceptAttr } from '@/lib/studentAvatarUpload';
import { errorMessageFromApiBody } from '@/lib/errorReference';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field as FormField,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export { ADD_STUDENT_DEPARTMENTS };

const settingsFetcher = (url) => fetch(url).then((r) => r.json());

const STUDENT_FORM_TAB_ORDER = [
  'identity',
  'academic',
  'demographics',
  'placement',
  'profile',
  'preferences',
];

const STUDENT_FIELD_TO_TAB = {
  name: 'identity',
  roll_number: 'identity',
  email: 'identity',
  communication_email: 'identity',
  phone: 'identity',
  photo_url: 'identity',
  department: 'academic',
  academic_program_code: 'academic',
  degree_level: 'academic',
  specialization: 'academic',
  cgpa: 'academic',
  semester: 'academic',
  backlogs_active: 'academic',
  backlogs_history: 'academic',
  batch_year: 'academic',
  graduation_year: 'academic',
  batch: 'academic',
  gender: 'demographics',
  category: 'demographics',
  disability_status: 'demographics',
  date_of_birth: 'demographics',
  placement_status: 'placement',
  internship_status: 'placement',
  skills: 'profile',
  bio: 'profile',
  linkedin_url: 'profile',
  github_url: 'profile',
  portfolio_url: 'profile',
  resume_url: 'profile',
  expected_salary_min: 'preferences',
  expected_salary_max: 'preferences',
  preferred_locations: 'preferences',
};

function firstTabWithErrors(errors) {
  const tabs = new Set(
    Object.keys(errors || {})
      .filter((key) => errors[key])
      .map((key) => STUDENT_FIELD_TO_TAB[key] || 'identity'),
  );
  return STUDENT_FORM_TAB_ORDER.find((tab) => tabs.has(tab)) || 'identity';
}

/** Section title above content (AdminCN / FORM_PATTERN) — not HTML legend-on-border. */
function SectionTitle({ id, children }) {
  return (
    <h3 id={id} className="text-foreground m-0 text-sm font-medium">
      {children}
    </h3>
  );
}

function FormSection({ id, title, children }) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <SectionTitle id={titleId}>{title}</SectionTitle>
      {children}
    </section>
  );
}

function Field({ label, error, hint, children, fullWidth = false }) {
  return (
    <FormField data-invalid={Boolean(error)} className={fullWidth ? 'col-span-full' : undefined}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
      {hint && !error ? <FieldDescription>{hint}</FieldDescription> : null}
    </FormField>
  );
}

/**
 * Shared add/edit student form (aligned with CSV import + full profile fields).
 */
export default function AddStudentForm({
  active,
  onSuccess,
  onCancel,
  bodyPadding = '1.5rem',
  editStudentId = null,
  initialValues = null,
}) {
  const isEdit = Boolean(editStudentId);
  const [form, setForm] = useState(initialCollegeStudentForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const nameRef = useRef(null);
  const { data: collegeSettings } = useSWR(active ? '/api/college/settings' : null, settingsFetcher);
  const { data: taxonomySettings } = useSWR(
    active && !isEdit ? '/api/college/settings/academic-taxonomy' : null,
    settingsFetcher,
  );
  const collegeShortCode = collegeSettings?.institution?.shortCode?.trim() || '';

  const rollPreview = useMemo(() => {
    if (!form.roll_number.trim()) return '';
    const r = resolveStudentRollNumber(form.roll_number, collegeShortCode);
    return r.systemId || '';
  }, [form.roll_number, collegeShortCode]);

  useEffect(() => {
    if (!active) return;
    setErrors({});
    setServerError('');
    setActiveTab('identity');
    setPendingAvatarFile(null);
    setPendingAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    if (isEdit && initialValues) {
      setForm({ ...initialCollegeStudentForm(), ...initialValues });
    } else {
      setForm(initialCollegeStudentForm());
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [active, isEdit, initialValues]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    };
  }, [pendingAvatarPreview]);

  const displayPhoto = pendingAvatarPreview || form.photo_url || '';

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrors((err) => ({ ...err, photo_url: '' }));
    setServerError('');

    if (isEdit && editStudentId) {
      setAvatarUploading(true);
      try {
        const result = await uploadCollegeStudentAvatarViaServer(editStudentId, file);
        if (!result.ok) {
          setErrors((err) => ({ ...err, photo_url: result.error || 'Upload failed' }));
          return;
        }
        setForm((f) => ({ ...f, photo_url: result.avatar_url || '' }));
        setPendingAvatarFile(null);
        setPendingAvatarPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return '';
        });
      } finally {
        setAvatarUploading(false);
      }
      return;
    }

    // Add flow: upload after the student record is created.
    setPendingAvatarFile(file);
    setPendingAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearPendingPhoto = () => {
    setPendingAvatarFile(null);
    setPendingAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    if (!isEdit) {
      setForm((f) => ({ ...f, photo_url: '' }));
    }
  };

  useEffect(() => {
    if (!active || isEdit || !taxonomySettings?.settings?.defaultProgramCode) return;
    const code = taxonomySettings.settings.defaultProgramCode;
    const program = taxonomySettings.academicPrograms?.find((p) => p.code === code);
    const mapped = mapProgramToStudentFields(program);
    setForm((f) => {
      if (f.academic_program_code) return f;
      if (!mapped) return { ...f, academic_program_code: code };
      return { ...f, ...mapped };
    });
  }, [active, isEdit, taxonomySettings]);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: nextErrors, valid } = validateCollegeStudentForm(form, { isEdit, collegeShortCode });
    if (!valid) {
      setErrors(nextErrors);
      setActiveTab(firstTabWithErrors(nextErrors));
      return;
    }
    setSubmitting(true);
    setServerError('');

    try {
      const res = await fetch(
        isEdit ? `/api/college/students/${editStudentId}` : '/api/college/students',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setServerError(
          errorMessageFromApiBody(json, isEdit ? 'Failed to update student.' : 'Failed to add student.'),
        );
        return;
      }

      if (!isEdit && pendingAvatarFile && json.studentId) {
        setAvatarUploading(true);
        const uploaded = await uploadCollegeStudentAvatarViaServer(json.studentId, pendingAvatarFile);
        setAvatarUploading(false);
        if (!uploaded.ok) {
          onSuccess({
            ...json,
            message: `${json.message || 'Student added.'} Photo upload failed: ${uploaded.error}`,
            photoUploadError: uploaded.error,
          });
          return;
        }
      }

      onSuccess(json);
    } catch {
      setServerError(errorMessageFromApiBody(null, 'Network error. Please try again.'));
    } finally {
      setAvatarUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto" style={{ padding: bodyPadding }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-4">
          <TabsList variant="line" className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="placement">Placement</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

        {serverError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to save student</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <TabsContent value="identity" className="mt-2 flex flex-col gap-4 outline-none">
        <FormSection id="student-form-identity" title={isEdit ? 'Identity (locked)' : 'Identity (primary)'}>
          {isEdit ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.875rem' }}>
              Name, roll number, and login email cannot be changed after creation.
            </p>
          ) : null}
          <div className="add-student-grid">
            <Field label="Full Name *" error={errors.name} fullWidth>
              <Input
                ref={nameRef}
                aria-invalid={Boolean(errors.name)}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={isEdit}
                readOnly={isEdit}
                autoComplete="name"
              />
            </Field>
            <Field
              label="Roll No / System ID *"
              error={errors.roll_number}
              hint={
                !isEdit && rollPreview
                  ? `System ID: ${rollPreview}`
                  : !isEdit && collegeShortCode
                    ? `Stored as ${collegeShortCode}-<roll> when needed`
                    : undefined
              }
            >
              <Input
                aria-invalid={Boolean(errors.roll_number)}
                value={form.roll_number}
                onChange={(e) => set('roll_number', e.target.value)}
                disabled={isEdit}
                readOnly={isEdit}
              />
            </Field>
            <Field label="Login Email *" error={errors.email}>
              <Input
                aria-invalid={Boolean(errors.email)}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={isEdit}
                readOnly={isEdit}
              />
            </Field>
            <Field label="Communication Email" error={errors.communication_email}>
              <Input
                aria-invalid={Boolean(errors.communication_email)}
                type="email"
                value={form.communication_email}
                onChange={(e) => set('communication_email', e.target.value)}
                placeholder="Defaults to login email if blank"
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input
                aria-invalid={Boolean(errors.phone)}
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 9876543210"
              />
            </Field>
            <Field label="Enrollment No.">
              <Input
                value={form.enrollment_number}
                onChange={(e) => set('enrollment_number', e.target.value)}
              />
            </Field>
            <Field
              label="Profile photo"
              error={errors.photo_url}
              hint="Upload a JPEG, PNG, WebP, or GIF (max 2MB). Files are stored in Amazon S3 — URL pasting is not supported."
              fullWidth
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                }}
              >
                {pendingAvatarPreview ? (
                  <img
                    src={pendingAvatarPreview}
                    alt=""
                    width={56}
                    height={56}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--border-default)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <StudentListAvatar photo={displayPhoto} name={form.name || 'Student'} size={56} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      render={<label />}
                      aria-disabled={avatarUploading || submitting}
                    >
                      {avatarUploading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
                      {avatarUploading ? 'Uploading…' : displayPhoto || pendingAvatarFile ? 'Change photo' : 'Upload photo'}
                      <Input
                        type="file"
                        accept={studentAvatarAcceptAttr()}
                        hidden
                        disabled={avatarUploading || submitting}
                        onChange={handlePhotoSelected}
                      />
                    </Button>
                    {!isEdit && pendingAvatarFile ? (
                      <Button type="button" variant="ghost" size="sm" onClick={clearPendingPhoto} disabled={avatarUploading || submitting}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {isEdit
                      ? form.photo_url
                        ? 'Photo uploaded to S3 and linked to this student.'
                        : 'No photo yet — upload one for this student (stored in S3).'
                      : pendingAvatarFile
                        ? `${pendingAvatarFile.name} will upload to S3 when you save.`
                        : 'Optional — can also be uploaded later from the student profile (S3).'}
                  </p>
                </div>
              </div>
            </Field>
          </div>
        </FormSection>
        </TabsContent>

        <TabsContent value="academic" className="mt-2 flex flex-col gap-4 outline-none">
        <FormSection id="student-form-academic" title="Academic context">
          <div className="add-student-grid">
            <AcademicProgramPicker
              value={form.academic_program_code}
              error={errors.academic_program_code || errors.department}
              onChange={(code, mapped) => {
                if (!mapped) {
                  set('academic_program_code', '');
                  set('eligibility_group_code', '');
                  set('eligibility_group_name', '');
                  set('academic_program_display', '');
                  return;
                }
                setForm((f) => ({
                  ...f,
                  academic_program_code: mapped.academic_program_code,
                  degree_pursued: mapped.degree_pursued,
                  department: mapped.department,
                  branch: mapped.branch,
                  eligibility_group_code: mapped.eligibility_group_code,
                  eligibility_group_name: mapped.eligibility_group_name,
                  academic_program_display: mapped.academic_program_display,
                }));
                setErrors((e) => ({
                  ...e,
                  academic_program_code: '',
                  department: '',
                }));
              }}
            />
            <Field label="Batch *" error={errors.batch} fullWidth>
              <AdmissionBatchYearPicker
                value={form.batch}
                onChange={(year) => {
                  set('batch', year);
                  set('batch_year', year);
                }}
                error={errors.batch}
              />
              <p className="text-muted-foreground mt-1 mb-0 text-xs">
                Intake year (YYYY). Latest batch today: {getMaxAdmissionBatchYear()}. A new year is added each May when admissions open.
              </p>
            </Field>
            <Field label="Current academic year">
              <Input
                value={form.academic_year}
                onChange={(e) => set('academic_year', e.target.value)}
                placeholder="e.g. 2025-26"
              />
            </Field>
            <Field label="Semester" error={errors.semester}>
              <AdminFilterSelect
                className="w-full"
                value={form.semester}
                onValueChange={(v) => set('semester', v)}
                items={[
                  { label: 'Select…', value: 'all' },
                  ...SEMESTER_OPTIONS.map((s) => ({ label: s, value: s })),
                ]}
              />
            </Field>
            <Field label="Department" error={errors.department}>
              <Input
                aria-invalid={Boolean(errors.department)}
                value={form.department}
                readOnly={Boolean(form.academic_program_code)}
                onChange={(e) => set('department', e.target.value)}
                placeholder={form.academic_program_code ? 'Filled from academic program' : 'Select program above or enter manually'}
              />
            </Field>
            <Field label="Specialization / Branch">
              <Input
                maxLength={100}
                value={form.branch}
                readOnly={Boolean(form.academic_program_code)}
                onChange={(e) => set('branch', e.target.value)}
              />
            </Field>
            <Field label="Degree Pursued">
              <Input
                value={form.degree_pursued}
                readOnly={Boolean(form.academic_program_code)}
                onChange={(e) => set('degree_pursued', e.target.value)}
                placeholder="e.g. B.Tech"
              />
            </Field>
            <Field label="CGPA" error={errors.cgpa}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_CGPA}
                step="0.01"
                value={form.cgpa}
                onChange={(v) => set('cgpa', v)}
              />
            </Field>
            <Field label="Class X %" error={errors.tenth_percentage}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_PERCENT}
                context={{ label: 'Class X %' }}
                step="0.01"
                value={form.tenth_percentage}
                onChange={(v) => set('tenth_percentage', v)}
              />
            </Field>
            <Field label="Class XII %" error={errors.twelfth_percentage}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_PERCENT}
                context={{ label: 'Class XII %' }}
                step="0.01"
                value={form.twelfth_percentage}
                onChange={(v) => set('twelfth_percentage', v)}
              />
            </Field>
            <Field label="Diploma %" error={errors.diploma_percentage}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_PERCENT}
                context={{ label: 'Diploma %' }}
                step="0.01"
                value={form.diploma_percentage}
                onChange={(v) => set('diploma_percentage', v)}
              />
            </Field>
            <Field label="Active Backlogs" error={errors.backlogs_active}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_BACKLOGS_ACTIVE}
                value={form.backlogs_active}
                context={{ backlogsTotal: form.backlogs_history }}
                onChange={(v) => set('backlogs_active', v)}
              />
            </Field>
            <Field label="Total Backlogs (history)" error={errors.backlogs_history}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_BACKLOGS_TOTAL}
                value={form.backlogs_history}
                context={{ backlogsActive: form.backlogs_active }}
                onChange={(v) => set('backlogs_history', v)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Programme timeline">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.875rem' }}>
            Optional calendar years for eligibility. Admission year is usually the start year of the joining batch.
          </p>
          <div className="add-student-grid">
            <Field label="Admission year" error={errors.batch_year} hint="Calendar year (often batch start year)">
              <Input
                aria-invalid={Boolean(errors.batch_year)}
                inputMode="numeric"
                value={form.batch_year}
                onChange={(e) => set('batch_year', e.target.value)}
                placeholder="e.g. 2022"
              />
            </Field>
            <Field label="Graduation year" error={errors.graduation_year} hint="Expected pass-out year">
              <Input
                aria-invalid={Boolean(errors.graduation_year)}
                inputMode="numeric"
                value={form.graduation_year}
                onChange={(e) => set('graduation_year', e.target.value)}
                placeholder="e.g. 2026"
              />
            </Field>
          </div>
        </FormSection>
        </TabsContent>

        <TabsContent value="demographics" className="mt-2 flex flex-col gap-4 outline-none">
        <FormSection id="student-form-demographics" title="Demographics">
          <div className="add-student-grid">
            <Field label="Gender">
              <AdminFilterSelect
                className="w-full"
                value={form.gender}
                onValueChange={(v) => set('gender', v)}
                items={[
                  { label: 'Select…', value: 'all' },
                  ...GENDERS.map((g) => ({ label: g, value: g })),
                ]}
              />
            </Field>
            <Field label="Diversity Category">
              <AdminFilterSelect
                className="w-full"
                value={form.category}
                onValueChange={(v) => set('category', v)}
                emptyMapsToAll={false}
                items={CATEGORIES.map((c) => ({ label: c, value: c }))}
              />
            </Field>
            <Field label="Disability Status">
              <AdminFilterSelect
                className="w-full"
                value={form.disability_status}
                onValueChange={(v) => set('disability_status', v)}
                emptyMapsToAll={false}
                items={DISABILITY_OPTIONS.map((d) => ({ label: d, value: d }))}
              />
            </Field>
            <Field label="Date of Birth" error={errors.date_of_birth}>
              <ValidatedDateInput
                fieldId={FIELD_IDS.STUDENT_DOB}
                value={form.date_of_birth}
                onChange={(v) => set('date_of_birth', v)}
              />
            </Field>
          </div>
        </FormSection>
        </TabsContent>

        <TabsContent value="placement" className="mt-2 flex flex-col gap-4 outline-none">
        <FormSection id="student-form-placement" title="Placement status">
          <div className="add-student-grid">
            <Field label="Job / Placement Status" error={errors.placement_status}>
              <AdminFilterSelect
                className="w-full"
                value={form.placement_status}
                onValueChange={(v) => set('placement_status', v)}
                emptyMapsToAll={false}
                items={PLACEMENT_STATUSES.map((s) => ({ label: s.label, value: s.value }))}
              />
            </Field>
            <Field label="Internship Status" error={errors.internship_status}>
              <AdminFilterSelect
                className="w-full"
                value={form.internship_status}
                onValueChange={(v) => set('internship_status', v)}
                emptyMapsToAll={false}
                items={INTERNSHIP_STATUSES.map((s) => ({ label: s.label, value: s.value }))}
              />
            </Field>
            <Field label="Verification" fullWidth>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <Checkbox
                  checked={form.verified}
                  onCheckedChange={(v) => set('verified', !!v)}
                />
                Mark student as verified by college
              </label>
            </Field>
          </div>
        </FormSection>
        </TabsContent>

        <TabsContent value="profile" className="mt-2 flex flex-col gap-4 outline-none">
        <FormSection title="Skills">
          <TagPicker
            tags={form.skills}
            onChange={(val) => set('skills', val)}
            placeholder="Type a skill and press Enter…"
          />
        </FormSection>

        <FormSection id="student-form-profile" title="Profile & links">
          <Field label="Bio" fullWidth>
            <Textarea
              rows={3}
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </Field>
          <div className="add-student-grid" style={{ marginTop: '1rem' }}>
            <Field label="LinkedIn" error={errors.linkedin_url}>
              <Input
                aria-invalid={Boolean(errors.linkedin_url)}
                value={form.linkedin_url}
                onChange={(e) => set('linkedin_url', e.target.value)}
              />
            </Field>
            <Field label="GitHub" error={errors.github_url}>
              <Input
                aria-invalid={Boolean(errors.github_url)}
                value={form.github_url}
                onChange={(e) => set('github_url', e.target.value)}
              />
            </Field>
            <Field label="Portfolio" error={errors.portfolio_url}>
              <Input
                aria-invalid={Boolean(errors.portfolio_url)}
                value={form.portfolio_url}
                onChange={(e) => set('portfolio_url', e.target.value)}
              />
            </Field>
            <Field label="Resume URL" error={errors.resume_url}>
              <Input
                aria-invalid={Boolean(errors.resume_url)}
                value={form.resume_url}
                onChange={(e) => set('resume_url', e.target.value)}
              />
            </Field>
          </div>
        </FormSection>
        </TabsContent>

        <TabsContent value="preferences" className="mt-2 flex flex-col gap-4 outline-none">
        <FormSection id="student-form-preferences" title="Preferences">
          <div className="add-student-grid">
            <Field label="Expected Salary Min (₹/year)" error={errors.expected_salary_min}>
              <CurrencyAmountInput
                fieldId={FIELD_IDS.STUDENT_SALARY_MIN}
                value={form.expected_salary_min}
                onChange={(v) => set('expected_salary_min', v)}
                placeholder="100000"
              />
            </Field>
            <Field label="Expected Salary Max (₹/year)" error={errors.expected_salary_max}>
              <CurrencyAmountInput
                fieldId={FIELD_IDS.STUDENT_SALARY_MAX}
                context={{ salaryMin: form.expected_salary_min }}
                value={form.expected_salary_max}
                onChange={(v) => set('expected_salary_max', v)}
                placeholder="200000"
              />
            </Field>
            <Field label="Preferred Locations" fullWidth>
              <TagPicker
                tags={form.preferred_locations}
                onChange={(val) => set('preferred_locations', val)}
                placeholder="City names, press Enter…"
              />
            </Field>
            <Field label="Relocation" fullWidth>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <Checkbox
                  checked={form.willing_to_relocate}
                  onCheckedChange={(v) => set('willing_to_relocate', !!v)}
                />
                Willing to relocate
              </label>
            </Field>
          </div>
        </FormSection>
        </TabsContent>
        </Tabs>
      </div>

      <div className="flex shrink-0 justify-end gap-3 border-t bg-muted/30 px-6 py-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="min-w-32"
        >
          {submitting ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              {isEdit ? 'Saving…' : 'Adding…'}
            </>
          ) : isEdit ? (
            <>
              <Save data-icon="inline-start" />
              Save changes
            </>
          ) : (
            <>
              <Plus data-icon="inline-start" />
              Add Student
            </>
          )}
        </Button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .add-student-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        @media (min-width: 1024px) {
          .add-student-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .add-student-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </form>
  );
}
