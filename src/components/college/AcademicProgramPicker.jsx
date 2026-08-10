'use client';

import useSWR from 'swr';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { mapProgramToStudentFields } from '@/lib/academicTaxonomy/mapProgram';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';

const fetcher = (url) => fetch(url).then((r) => r.json());

/**
 * @param {object} props
 * @param {string} props.value - academic program code
 * @param {(code: string, mapped: ReturnType<typeof mapProgramToStudentFields> | null) => void} props.onChange
 * @param {string} [props.error]
 */
export default function AcademicProgramPicker({ value, onChange, error }) {
  const { data, error: loadError, isLoading } = useSWR('/api/academic-taxonomy', fetcher);

  const programs = Array.isArray(data?.academicPrograms) ? data.academicPrograms : [];

  if (loadError || (!isLoading && !programs.length)) {
    return null;
  }

  const selected = programs.find((p) => p.code === value);

  return (
    <Field data-invalid={Boolean(error)} className="col-span-full">
      <FieldLabel htmlFor="academic-program">Academic program *</FieldLabel>
      <AdminFilterSelect
        id="academic-program"
        className="w-full"
        value={value || ''}
        disabled={isLoading}
        onValueChange={(code) => {
          const program = programs.find((p) => p.code === code) || null;
          onChange(code, mapProgramToStudentFields(program));
        }}
        items={[
          { label: isLoading ? 'Loading programs…' : 'Select academic program…', value: 'all' },
          ...programs.map((p) => ({ label: p.display_name, value: p.code })),
        ]}
      />
      {error ? <FieldError>{error}</FieldError> : null}
      {selected ? (
        <FieldDescription>
          Eligibility group: <strong>{selected.eligibility_group_name}</strong>
          {' · '}
          Degree: {selected.degree_name}
          {' · '}
          Discipline: {selected.discipline_name}
          {selected.specialization_name ? ` · Specialization: ${selected.specialization_name}` : ''}
        </FieldDescription>
      ) : (
        <FieldDescription>
          Pick a standard program (e.g. B.Tech CSE) — degree, branch, and placement group are filled automatically.
        </FieldDescription>
      )}
    </Field>
  );
}
