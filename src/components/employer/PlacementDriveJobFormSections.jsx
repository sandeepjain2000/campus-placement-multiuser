'use client';

import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import CurrencyAmountInput from '@/components/form/CurrencyAmountInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { PLACEMENT_DRIVE_JOB_TYPE_LABELS } from '@/lib/placementDriveJobFields';
import EligibilityGroupPicker from '@/components/employer/EligibilityGroupPicker';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export const adminInputClass =
  'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

export const adminNativeSelectClass =
  'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

function DriveFieldError({ message }) {
  return message ? <FieldError data-drive-field-error>{message}</FieldError> : null;
}

/**
 * Shared job/role/eligibility/compensation fields for placement drive request & edit forms.
 * @param {{ form: Record<string, string>; setForm: (fn: (p: Record<string, string>) => Record<string, string>) => void; errors?: Record<string, string>; onFieldEdit?: (key: string) => void; driveDetails: import('react').ReactNode; activeTab: string; onTabChange: (tab: string) => void }} props
 */
export default function PlacementDriveJobFormSections({
  form,
  setForm,
  errors = {},
  onFieldEdit,
  driveDetails,
  activeTab,
  onTabChange,
}) {
  const setField = (key, value) => {
    onFieldEdit?.(key);
    setForm((p) => ({ ...p, [key]: value }));
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full gap-4">
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        {[
          { id: 'drive', title: 'Drive details', sub: 'Campus, schedule, venue' },
          { id: 'role', title: 'Role', sub: 'Openings and description' },
          { id: 'eligibility', title: 'Eligibility', sub: 'Academic criteria' },
          { id: 'compensation', title: 'Compensation', sub: 'CTC and breakup' },
        ].map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex h-auto flex-col items-start gap-0.5 px-3 py-2 data-active:shadow-none"
          >
            <span className="text-sm font-medium">{tab.title}</span>
            <span className="text-muted-foreground text-xs font-normal">{tab.sub}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="drive" className="mt-2 outline-none">
        {driveDetails}
      </TabsContent>

      <TabsContent value="role" className="mt-2 outline-none">
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field className="gap-2" id="drive-field-jobType" data-invalid={errors.jobType ? true : undefined}>
            <FieldLabel htmlFor="drive-job-type">Role type</FieldLabel>
            <AdminFilterSelect
              id="drive-job-type"
              className={adminNativeSelectClass}
              value={form.jobType}
              onValueChange={(v) => setField('jobType', v)}
              emptyMapsToAll={false}
              items={Object.entries(PLACEMENT_DRIVE_JOB_TYPE_LABELS).map(([value, label]) => ({ label, value }))}
            />
            <DriveFieldError message={errors.jobType} />
          </Field>
          <Field className="gap-2" id="drive-field-vacancies" data-invalid={errors.vacancies ? true : undefined}>
            <FieldLabel htmlFor="drive-vacancies">Openings</FieldLabel>
            <ValidatedNumberInput
              id="drive-vacancies"
              fieldId={FIELD_IDS.EMPLOYER_VACANCIES}
              value={form.vacancies}
              onChange={(v) => setField('vacancies', v)}
              placeholder="10"
              className={`${adminInputClass}${errors.vacancies ? ' border-destructive ring-destructive/20' : ''}`}
            />
            {errors.vacancies ? (
              <DriveFieldError message={errors.vacancies} />
            ) : (
              <FieldDescription>Optional. Defaults to 100 if left blank.</FieldDescription>
            )}
          </Field>
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="drive-skills">Skills (comma-separated)</FieldLabel>
            <Input
              id="drive-skills"
              value={form.skillsRequired}
              onChange={(e) => setField('skillsRequired', e.target.value)}
              placeholder="React, Python, SQL, System design"
            />
          </Field>
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="drive-locations">Work locations</FieldLabel>
            <Input
              id="drive-locations"
              value={form.locations}
              onChange={(e) => setField('locations', e.target.value)}
              placeholder="Bangalore, Hyderabad — or leave blank"
            />
            <FieldDescription>Where hired students will work (separate from drive venue).</FieldDescription>
          </Field>
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="drive-job-description">Job description</FieldLabel>
            <Textarea
              id="drive-job-description"
              rows={6}
              value={form.jobDescription}
              onChange={(e) => setField('jobDescription', e.target.value)}
              placeholder="Describe the role, responsibilities, tech stack, and what you expect from candidates…"
            />
            <FieldDescription>
              Shown to students and the placement office once the drive is approved.
            </FieldDescription>
          </Field>
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="drive-additional-info">Additional information for students</FieldLabel>
            <Textarea
              id="drive-additional-info"
              rows={3}
              value={form.additionalInfo}
              onChange={(e) => setField('additionalInfo', e.target.value)}
              placeholder="PPO hint, bond terms summary, or other details students should know"
            />
          </Field>
        </FieldGroup>
      </TabsContent>

      <TabsContent value="eligibility" className="mt-2 outline-none">
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field className="gap-2" id="drive-field-minCgpa" data-invalid={errors.minCgpa ? true : undefined}>
            <FieldLabel htmlFor="drive-min-cgpa">Minimum CGPA</FieldLabel>
            <ValidatedNumberInput
              id="drive-min-cgpa"
              fieldId={FIELD_IDS.EMPLOYER_MIN_CGPA}
              step="0.1"
              value={form.minCgpa}
              onChange={(v) => setField('minCgpa', v)}
              className={`${adminInputClass}${errors.minCgpa ? ' border-destructive ring-destructive/20' : ''}`}
            />
            <DriveFieldError message={errors.minCgpa} />
          </Field>
          <Field className="gap-2" id="drive-field-maxBacklogs" data-invalid={errors.maxBacklogs ? true : undefined}>
            <FieldLabel htmlFor="drive-max-backlogs">Max active backlogs</FieldLabel>
            <ValidatedNumberInput
              id="drive-max-backlogs"
              fieldId={FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS}
              value={form.maxBacklogs}
              onChange={(v) => setField('maxBacklogs', v)}
              className={`${adminInputClass}${errors.maxBacklogs ? ' border-destructive ring-destructive/20' : ''}`}
            />
            <DriveFieldError message={errors.maxBacklogs} />
          </Field>
          <Field className="gap-2" id="drive-field-batchYear" data-invalid={errors.batchYear ? true : undefined}>
            <FieldLabel htmlFor="drive-batch-year">Batch year</FieldLabel>
            <Input
              id="drive-batch-year"
              type="number"
              min="2000"
              max="2100"
              step="1"
              placeholder="e.g. 2026"
              value={form.batchYear}
              aria-invalid={errors.batchYear ? true : undefined}
              onChange={(e) => setField('batchYear', e.target.value)}
            />
            <DriveFieldError message={errors.batchYear} />
          </Field>
          <Field className="gap-2" id="drive-field-minTenthPct" data-invalid={errors.minTenthPct ? true : undefined}>
            <FieldLabel htmlFor="drive-min-tenth">Min 10th %</FieldLabel>
            <Input
              id="drive-min-tenth"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="60"
              value={form.minTenthPct}
              aria-invalid={errors.minTenthPct ? true : undefined}
              onChange={(e) => setField('minTenthPct', e.target.value)}
            />
            <DriveFieldError message={errors.minTenthPct} />
          </Field>
          <Field className="gap-2" id="drive-field-minTwelfthPct" data-invalid={errors.minTwelfthPct ? true : undefined}>
            <FieldLabel htmlFor="drive-min-twelfth">Min 12th %</FieldLabel>
            <Input
              id="drive-min-twelfth"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="60"
              value={form.minTwelfthPct}
              aria-invalid={errors.minTwelfthPct ? true : undefined}
              onChange={(e) => setField('minTwelfthPct', e.target.value)}
            />
            <DriveFieldError message={errors.minTwelfthPct} />
          </Field>
          <Field className="gap-2" id="drive-field-applicationDeadline" data-invalid={errors.applicationDeadline ? true : undefined}>
            <FieldLabel htmlFor="drive-application-deadline">Application deadline</FieldLabel>
            <ValidatedDateInput
              id="drive-application-deadline"
              fieldId={FIELD_IDS.EMPLOYER_DRIVE_DATE}
              value={form.applicationDeadline ? form.applicationDeadline.slice(0, 10) : ''}
              onChange={(v) => setField('applicationDeadline', v ? `${v}T23:59:59` : '')}
              className={`${adminInputClass}${errors.applicationDeadline ? ' border-destructive ring-destructive/20' : ''}`}
            />
            {errors.applicationDeadline ? (
              <DriveFieldError message={errors.applicationDeadline} />
            ) : (
              <FieldDescription>Optional. Students cannot apply after this date.</FieldDescription>
            )}
          </Field>
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel>Eligible branches / groups</FieldLabel>
            <EligibilityGroupPicker
              value={form.eligibleBranches}
              onChange={(v) => setField('eligibleBranches', v)}
            />
          </Field>
        </FieldGroup>
      </TabsContent>

      <TabsContent value="compensation" className="mt-2 outline-none">
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field className="gap-2" id="drive-field-salaryMin" data-invalid={errors.salaryMin ? true : undefined}>
            <FieldLabel htmlFor="drive-salary-min">Min CTC (annual INR)</FieldLabel>
            <CurrencyAmountInput
              id="drive-salary-min"
              fieldId={FIELD_IDS.EMPLOYER_SALARY_MIN}
              value={form.salaryMin}
              onChange={(v) => setField('salaryMin', v)}
              placeholder="800000"
              className={`${adminInputClass}${errors.salaryMin ? ' border-destructive ring-destructive/20' : ''}`}
            />
            <DriveFieldError message={errors.salaryMin} />
          </Field>
          <Field className="gap-2" id="drive-field-salaryMax" data-invalid={errors.salaryMax ? true : undefined}>
            <FieldLabel htmlFor="drive-salary-max">Max CTC (annual INR)</FieldLabel>
            <CurrencyAmountInput
              id="drive-salary-max"
              fieldId={FIELD_IDS.EMPLOYER_SALARY_MAX}
              context={{ salaryMin: form.salaryMin }}
              value={form.salaryMax}
              onChange={(v) => setField('salaryMax', v)}
              placeholder="1500000"
              className={`${adminInputClass}${errors.salaryMax ? ' border-destructive ring-destructive/20' : ''}`}
            />
            <DriveFieldError message={errors.salaryMax} />
          </Field>
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="drive-package-ctc">Offered CTC (internal record, optional)</FieldLabel>
            <CurrencyAmountInput
              id="drive-package-ctc"
              fieldId={FIELD_IDS.EMPLOYER_SALARY_MIN}
              value={form.packageCtc}
              onChange={(v) => setField('packageCtc', v)}
              placeholder="1200000"
              className={adminInputClass}
            />
          </Field>
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="drive-ctc-breakup">CTC breakup details (internal)</FieldLabel>
            <Textarea
              id="drive-ctc-breakup"
              rows={3}
              value={form.ctcBreakup}
              onChange={(e) => setField('ctcBreakup', e.target.value)}
              placeholder="Fixed + variable split, joining bonus, RSUs — not shown on the college dashboard"
            />
            <FieldDescription>Internal only. This breakup is not shown on the college dashboard.</FieldDescription>
          </Field>
        </FieldGroup>
      </TabsContent>
    </Tabs>
  );
}
