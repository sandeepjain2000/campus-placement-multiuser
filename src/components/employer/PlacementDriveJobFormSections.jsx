'use client';

import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import CurrencyAmountInput from '@/components/form/CurrencyAmountInput';
import { DriveFormSection, driveFormCompactField, driveFormFullRow } from '@/components/employer/DriveFormSection';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { PLACEMENT_DRIVE_JOB_TYPE_LABELS } from '@/lib/placementDriveJobFields';
import EligibilityGroupPicker from '@/components/employer/EligibilityGroupPicker';

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="form-error" data-drive-field-error>
      {message}
    </p>
  );
}

function inputClass(hasError) {
  return hasError ? 'form-input input-error' : 'form-input';
}

function selectClass(hasError) {
  return hasError ? 'form-select input-error' : 'form-select';
}

/**
 * Shared job/role/eligibility/compensation fields for placement drive request & edit forms.
 * @param {{ form: Record<string, string>; setForm: (fn: (p: Record<string, string>) => Record<string, string>) => void; errors?: Record<string, string>; onFieldEdit?: (key: string) => void }} props
 */
export default function PlacementDriveJobFormSections({ form, setForm, errors = {}, onFieldEdit }) {
  const setField = (key, value) => {
    onFieldEdit?.(key);
    setForm((p) => ({ ...p, [key]: value }));
  };

  return (
    <>
      <DriveFormSection
        title="Role & openings"
        description="Campus role type, headcount, and skills — formerly captured on a linked job posting."
      >
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-jobType">
          <label className="form-label">Role type</label>
          <select
            className={selectClass(errors.jobType)}
            value={form.jobType}
            onChange={(e) => setField('jobType', e.target.value)}
          >
            {Object.entries(PLACEMENT_DRIVE_JOB_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <FieldError message={errors.jobType} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-vacancies">
          <label className="form-label">Openings</label>
          <ValidatedNumberInput
            fieldId={FIELD_IDS.EMPLOYER_VACANCIES}
            value={form.vacancies}
            onChange={(v) => setField('vacancies', v)}
            placeholder="10"
            className={inputClass(errors.vacancies)}
          />
          {errors.vacancies ? <FieldError message={errors.vacancies} /> : (
            <span className="form-hint">Optional. Defaults to 100 if left blank.</span>
          )}
        </div>
        <div className="form-group" style={driveFormFullRow}>
          <label className="form-label">Skills (comma-separated)</label>
          <input
            className="form-input"
            value={form.skillsRequired}
            onChange={(e) => setField('skillsRequired', e.target.value)}
            placeholder="React, Python, SQL, System design"
          />
        </div>
        <div className="form-group" style={driveFormFullRow}>
          <label className="form-label">Work locations</label>
          <input
            className="form-input"
            value={form.locations}
            onChange={(e) => setField('locations', e.target.value)}
            placeholder="Bangalore, Hyderabad — or leave blank"
          />
          <span className="form-hint">Where hired students will work (separate from drive venue).</span>
        </div>
      </DriveFormSection>

      <DriveFormSection
        title="Job description"
        description="Role summary, responsibilities, and expectations. Shown to students and the placement office once approved."
      >
        <div className="form-group" style={driveFormFullRow}>
          <label className="form-label">Job description</label>
          <textarea
            className="form-textarea"
            rows={6}
            value={form.jobDescription}
            onChange={(e) => setField('jobDescription', e.target.value)}
            placeholder="Describe the role, responsibilities, tech stack, and what you expect from candidates…"
          />
        </div>
        <div className="form-group" style={driveFormFullRow}>
          <label className="form-label">Additional information for students</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={form.additionalInfo}
            onChange={(e) => setField('additionalInfo', e.target.value)}
            placeholder="PPO hint, bond terms summary, or other details students should know"
          />
        </div>
      </DriveFormSection>

      <DriveFormSection
        title="Eligibility"
        description="Criteria for student registration. Enforced when students apply."
      >
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-minCgpa">
          <label className="form-label">Minimum CGPA</label>
          <ValidatedNumberInput
            fieldId={FIELD_IDS.EMPLOYER_MIN_CGPA}
            step="0.1"
            value={form.minCgpa}
            onChange={(v) => setField('minCgpa', v)}
            className={inputClass(errors.minCgpa)}
          />
          <FieldError message={errors.minCgpa} />
        </div>
        <div className="form-group" style={{ ...driveFormFullRow, marginBottom: 0 }}>
          <label className="form-label">Eligible branches / groups</label>
          <EligibilityGroupPicker
            value={form.eligibleBranches}
            onChange={(v) => setField('eligibleBranches', v)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-maxBacklogs">
          <label className="form-label">Max active backlogs</label>
          <ValidatedNumberInput
            fieldId={FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS}
            value={form.maxBacklogs}
            onChange={(v) => setField('maxBacklogs', v)}
            className={inputClass(errors.maxBacklogs)}
          />
          <FieldError message={errors.maxBacklogs} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-batchYear">
          <label className="form-label">Batch year</label>
          <input
            className={inputClass(errors.batchYear)}
            type="number"
            min="2000"
            max="2100"
            step="1"
            placeholder="e.g. 2026"
            value={form.batchYear}
            onChange={(e) => setField('batchYear', e.target.value)}
          />
          <FieldError message={errors.batchYear} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-minTenthPct">
          <label className="form-label">Min 10th %</label>
          <input
            className={inputClass(errors.minTenthPct)}
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="60"
            value={form.minTenthPct}
            onChange={(e) => setField('minTenthPct', e.target.value)}
          />
          <FieldError message={errors.minTenthPct} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-minTwelfthPct">
          <label className="form-label">Min 12th %</label>
          <input
            className={inputClass(errors.minTwelfthPct)}
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="60"
            value={form.minTwelfthPct}
            onChange={(e) => setField('minTwelfthPct', e.target.value)}
          />
          <FieldError message={errors.minTwelfthPct} />
        </div>
        <div className="form-group" style={driveFormCompactField} id="drive-field-applicationDeadline">
          <label className="form-label">Application deadline</label>
          <ValidatedDateInput
            fieldId={FIELD_IDS.EMPLOYER_DRIVE_DATE}
            value={form.applicationDeadline ? form.applicationDeadline.slice(0, 10) : ''}
            onChange={(v) => setField('applicationDeadline', v ? `${v}T23:59:59` : '')}
            className={inputClass(errors.applicationDeadline)}
          />
          {errors.applicationDeadline ? (
            <FieldError message={errors.applicationDeadline} />
          ) : (
            <span className="form-hint">Optional. Students cannot apply after this date.</span>
          )}
        </div>
      </DriveFormSection>

      <DriveFormSection
        title="Compensation"
        description="CTC band is shown to students. Internal breakup is for your records only."
      >
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-salaryMin">
          <label className="form-label">Min CTC (annual INR)</label>
          <CurrencyAmountInput
            fieldId={FIELD_IDS.EMPLOYER_SALARY_MIN}
            value={form.salaryMin}
            onChange={(v) => setField('salaryMin', v)}
            placeholder="800000"
            className={inputClass(errors.salaryMin)}
          />
          <FieldError message={errors.salaryMin} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} id="drive-field-salaryMax">
          <label className="form-label">Max CTC (annual INR)</label>
          <CurrencyAmountInput
            fieldId={FIELD_IDS.EMPLOYER_SALARY_MAX}
            context={{ salaryMin: form.salaryMin }}
            value={form.salaryMax}
            onChange={(v) => setField('salaryMax', v)}
            placeholder="1500000"
            className={inputClass(errors.salaryMax)}
          />
          <FieldError message={errors.salaryMax} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Offered CTC (internal record, optional)</label>
          <CurrencyAmountInput
            fieldId={FIELD_IDS.EMPLOYER_SALARY_MIN}
            value={form.packageCtc}
            onChange={(v) => setField('packageCtc', v)}
            placeholder="1200000"
          />
        </div>
        <div className="form-group" style={driveFormFullRow}>
          <label className="form-label">CTC breakup details (internal)</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={form.ctcBreakup}
            onChange={(e) => setField('ctcBreakup', e.target.value)}
            placeholder="Fixed + variable split, joining bonus, RSUs — not shown on the college dashboard"
          />
        </div>
      </DriveFormSection>
    </>
  );
}
