'use client';

import useSWR from 'swr';
import { mapProgramToStudentFields } from '@/lib/academicTaxonomy/mapProgram';

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
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label">Academic program *</label>
      <select
        className={`form-select${error ? ' input-error' : ''}`}
        value={value || ''}
        disabled={isLoading}
        onChange={(e) => {
          const code = e.target.value;
          const program = programs.find((p) => p.code === code) || null;
          onChange(code, mapProgramToStudentFields(program));
        }}
      >
        <option value="">{isLoading ? 'Loading programs…' : 'Select academic program…'}</option>
        {programs.map((p) => (
          <option key={p.code} value={p.code}>
            {p.display_name}
          </option>
        ))}
      </select>
      {error ? <p className="form-error">{error}</p> : null}
      {selected ? (
        <p className="text-xs text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>
          Eligibility group: <strong>{selected.eligibility_group_name}</strong>
          {' · '}
          Degree: {selected.degree_name}
          {' · '}
          Discipline: {selected.discipline_name}
          {selected.specialization_name ? ` · Specialization: ${selected.specialization_name}` : ''}
        </p>
      ) : (
        <p className="text-xs text-tertiary" style={{ margin: '0.35rem 0 0' }}>
          Pick a standard program (e.g. B.Tech CSE) — degree, branch, and placement group are filled automatically.
        </p>
      )}
    </div>
  );
}
