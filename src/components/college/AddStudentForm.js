'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Plus, Loader2, Save } from 'lucide-react';
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
import AdmissionBatchYearPicker from '@/components/college/AdmissionBatchYearPicker';
import { mapProgramToStudentFields } from '@/lib/academicTaxonomy/mapProgram';
import { getMaxAdmissionBatchYear } from '@/lib/admissionBatchYear';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';

export { ADD_STUDENT_DEPARTMENTS };

const settingsFetcher = (url) => fetch(url).then((r) => r.json());

function SectionLegend({ children }) {
  return (
    <legend
      style={{
        fontWeight: 700,
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '0.875rem',
      }}
    >
      {children}
    </legend>
  );
}

function Field({ label, error, hint, children, fullWidth = false }) {
  return (
    <div className="form-group" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <label className="form-label">{label}</label>
      {children}
      {error ? <p className="form-error">{error}</p> : null}
      {hint && !error ? (
        <p className="form-hint" style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      ) : null}
    </div>
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
    if (isEdit && initialValues) {
      setForm({ ...initialCollegeStudentForm(), ...initialValues });
    } else {
      setForm(initialCollegeStudentForm());
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [active, isEdit, initialValues]);

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
        setServerError(json.error || (isEdit ? 'Failed to update student.' : 'Failed to add student.'));
        return;
      }
      onSuccess(json);
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: bodyPadding }}>
        {serverError ? (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
              color: '#dc2626',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {serverError}
          </div>
        ) : null}

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <SectionLegend>Identity {isEdit ? '(locked)' : '(primary)'}</SectionLegend>
          {isEdit ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.875rem' }}>
              Name, roll number, and login email cannot be changed after creation.
            </p>
          ) : null}
          <div className="add-student-grid">
            <Field label="Full Name *" error={errors.name} fullWidth>
              <input
                ref={nameRef}
                className={`form-input${errors.name ? ' input-error' : ''}`}
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
              <input
                className={`form-input${errors.roll_number ? ' input-error' : ''}`}
                value={form.roll_number}
                onChange={(e) => set('roll_number', e.target.value)}
                disabled={isEdit}
                readOnly={isEdit}
              />
            </Field>
            <Field label="Login Email *" error={errors.email}>
              <input
                className={`form-input${errors.email ? ' input-error' : ''}`}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={isEdit}
                readOnly={isEdit}
              />
            </Field>
            <Field label="Communication Email" error={errors.communication_email}>
              <input
                className={`form-input${errors.communication_email ? ' input-error' : ''}`}
                type="email"
                value={form.communication_email}
                onChange={(e) => set('communication_email', e.target.value)}
                placeholder="Defaults to login email if blank"
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input
                className={`form-input${errors.phone ? ' input-error' : ''}`}
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 9876543210"
              />
            </Field>
            <Field label="Enrollment No.">
              <input
                className="form-input"
                value={form.enrollment_number}
                onChange={(e) => set('enrollment_number', e.target.value)}
              />
            </Field>
            <Field label="Photo URL" error={errors.photo_url} fullWidth>
              <input
                className={`form-input${errors.photo_url ? ' input-error' : ''}`}
                value={form.photo_url}
                onChange={(e) => set('photo_url', e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <SectionLegend>Academic context</SectionLegend>
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
              <p className="form-hint" style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Intake year (YYYY). Latest batch today: {getMaxAdmissionBatchYear()}. A new year is added each May when admissions open.
              </p>
            </Field>
            <Field label="Current academic year">
              <input
                className="form-input"
                value={form.academic_year}
                onChange={(e) => set('academic_year', e.target.value)}
                placeholder="e.g. 2025-26"
              />
            </Field>
            <Field label="Semester" error={errors.semester}>
              <select
                className={`form-select${errors.semester ? ' input-error' : ''}`}
                value={form.semester}
                onChange={(e) => set('semester', e.target.value)}
              >
                <option value="">Select…</option>
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Department" error={errors.department}>
              <input
                className={`form-input${errors.department ? ' input-error' : ''}`}
                value={form.department}
                readOnly={Boolean(form.academic_program_code)}
                onChange={(e) => set('department', e.target.value)}
                placeholder={form.academic_program_code ? 'Filled from academic program' : 'Select program above or enter manually'}
              />
            </Field>
            <Field label="Specialization / Branch">
              <input
                className="form-input"
                maxLength={100}
                value={form.branch}
                readOnly={Boolean(form.academic_program_code)}
                onChange={(e) => set('branch', e.target.value)}
              />
            </Field>
            <Field label="Degree Pursued">
              <input
                className="form-input"
                value={form.degree_pursued}
                readOnly={Boolean(form.academic_program_code)}
                onChange={(e) => set('degree_pursued', e.target.value)}
                placeholder="e.g. B.Tech"
              />
            </Field>
            <Field label="CGPA" error={errors.cgpa}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_CGPA}
                className={`form-input${errors.cgpa ? ' input-error' : ''}`}
                step="0.01"
                value={form.cgpa}
                onChange={(v) => set('cgpa', v)}
              />
            </Field>
            <Field label="Class X %" error={errors.tenth_percentage}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_PERCENT}
                context={{ label: 'Class X %' }}
                className={`form-input${errors.tenth_percentage ? ' input-error' : ''}`}
                step="0.01"
                value={form.tenth_percentage}
                onChange={(v) => set('tenth_percentage', v)}
              />
            </Field>
            <Field label="Class XII %" error={errors.twelfth_percentage}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_PERCENT}
                context={{ label: 'Class XII %' }}
                className={`form-input${errors.twelfth_percentage ? ' input-error' : ''}`}
                step="0.01"
                value={form.twelfth_percentage}
                onChange={(v) => set('twelfth_percentage', v)}
              />
            </Field>
            <Field label="Diploma %" error={errors.diploma_percentage}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_PERCENT}
                context={{ label: 'Diploma %' }}
                className={`form-input${errors.diploma_percentage ? ' input-error' : ''}`}
                step="0.01"
                value={form.diploma_percentage}
                onChange={(v) => set('diploma_percentage', v)}
              />
            </Field>
            <Field label="Active Backlogs" error={errors.backlogs_active}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_BACKLOGS_ACTIVE}
                className={`form-input${errors.backlogs_active ? ' input-error' : ''}`}
                value={form.backlogs_active}
                context={{ backlogsTotal: form.backlogs_history }}
                onChange={(v) => set('backlogs_active', v)}
              />
            </Field>
            <Field label="Total Backlogs (history)" error={errors.backlogs_history}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_BACKLOGS_TOTAL}
                className={`form-input${errors.backlogs_history ? ' input-error' : ''}`}
                value={form.backlogs_history}
                context={{ backlogsActive: form.backlogs_active }}
                onChange={(v) => set('backlogs_history', v)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <SectionLegend>Programme timeline</SectionLegend>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.875rem' }}>
            Optional calendar years for eligibility. Admission year is usually the start year of the joining batch.
          </p>
          <div className="add-student-grid">
            <Field label="Admission year" error={errors.batch_year} hint="Calendar year (often batch start year)">
              <input
                className={`form-input${errors.batch_year ? ' input-error' : ''}`}
                inputMode="numeric"
                value={form.batch_year}
                onChange={(e) => set('batch_year', e.target.value)}
                placeholder="e.g. 2022"
              />
            </Field>
            <Field label="Graduation year" error={errors.graduation_year} hint="Expected pass-out year">
              <input
                className={`form-input${errors.graduation_year ? ' input-error' : ''}`}
                inputMode="numeric"
                value={form.graduation_year}
                onChange={(e) => set('graduation_year', e.target.value)}
                placeholder="e.g. 2026"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <SectionLegend>Demographics</SectionLegend>
          <div className="add-student-grid">
            <Field label="Gender">
              <select className="form-select" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Diversity Category">
              <select className="form-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Disability Status">
              <select
                className="form-select"
                value={form.disability_status}
                onChange={(e) => set('disability_status', e.target.value)}
              >
                {DISABILITY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of Birth" error={errors.date_of_birth}>
              <ValidatedDateInput
                fieldId={FIELD_IDS.STUDENT_DOB}
                className={`form-input${errors.date_of_birth ? ' input-error' : ''}`}
                value={form.date_of_birth}
                onChange={(v) => set('date_of_birth', v)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <SectionLegend>Placement status</SectionLegend>
          <div className="add-student-grid">
            <Field label="Job / Placement Status" error={errors.placement_status}>
              <select
                className={`form-select${errors.placement_status ? ' input-error' : ''}`}
                value={form.placement_status}
                onChange={(e) => set('placement_status', e.target.value)}
              >
                {PLACEMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Internship Status" error={errors.internship_status}>
              <select
                className={`form-select${errors.internship_status ? ' input-error' : ''}`}
                value={form.internship_status}
                onChange={(e) => set('internship_status', e.target.value)}
              >
                {INTERNSHIP_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Verification" fullWidth>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => set('verified', e.target.checked)}
                />
                Mark student as verified by college
              </label>
            </Field>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <SectionLegend>Skills</SectionLegend>
          <TagPicker
            tags={form.skills}
            onChange={(val) => set('skills', val)}
            placeholder="Type a skill and press Enter…"
          />
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <SectionLegend>Profile & links</SectionLegend>
          <Field label="Bio" fullWidth>
            <textarea
              className="form-input"
              rows={3}
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </Field>
          <div className="add-student-grid" style={{ marginTop: '1rem' }}>
            <Field label="LinkedIn" error={errors.linkedin_url}>
              <input
                className={`form-input${errors.linkedin_url ? ' input-error' : ''}`}
                value={form.linkedin_url}
                onChange={(e) => set('linkedin_url', e.target.value)}
              />
            </Field>
            <Field label="GitHub" error={errors.github_url}>
              <input
                className={`form-input${errors.github_url ? ' input-error' : ''}`}
                value={form.github_url}
                onChange={(e) => set('github_url', e.target.value)}
              />
            </Field>
            <Field label="Portfolio" error={errors.portfolio_url}>
              <input
                className={`form-input${errors.portfolio_url ? ' input-error' : ''}`}
                value={form.portfolio_url}
                onChange={(e) => set('portfolio_url', e.target.value)}
              />
            </Field>
            <Field label="Resume URL" error={errors.resume_url}>
              <input
                className={`form-input${errors.resume_url ? ' input-error' : ''}`}
                value={form.resume_url}
                onChange={(e) => set('resume_url', e.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <SectionLegend>Preferences</SectionLegend>
          <div className="add-student-grid">
            <Field label="Expected Salary Min (₹/year)" error={errors.expected_salary_min}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_SALARY_MIN}
                className={`form-input${errors.expected_salary_min ? ' input-error' : ''}`}
                value={form.expected_salary_min}
                onChange={(v) => set('expected_salary_min', v)}
              />
            </Field>
            <Field label="Expected Salary Max (₹/year)" error={errors.expected_salary_max}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.STUDENT_SALARY_MAX}
                context={{ salaryMin: form.expected_salary_min }}
                className={`form-input${errors.expected_salary_max ? ' input-error' : ''}`}
                value={form.expected_salary_max}
                onChange={(v) => set('expected_salary_max', v)}
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
                <input
                  type="checkbox"
                  checked={form.willing_to_relocate}
                  onChange={(e) => set('willing_to_relocate', e.target.checked)}
                />
                Willing to relocate
              </label>
            </Field>
          </div>
        </fieldset>
      </div>

      <div
        style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
        }}
      >
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 130 }}
        >
          {submitting ? (
            <>
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              {isEdit ? 'Saving…' : 'Adding…'}
            </>
          ) : isEdit ? (
            <>
              <Save size={15} />
              Save changes
            </>
          ) : (
            <>
              <Plus size={15} />
              Add Student
            </>
          )}
        </button>
      </div>

      <style>{`
        .form-error { color: #dc2626; font-size: 0.75rem; margin: 0.25rem 0 0; }
        .input-error { border-color: #fca5a5 !important; }
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
