/** Two-line cell: degree on line 1, specialisation (branch) on line 2. */
export function degreeSpecializationLines(degree, specialization) {
  const degreeLine = String(degree || '').trim();
  const specRaw = String(specialization || '').trim();
  let specializationLine = '';
  if (specRaw) {
    if (!degreeLine) specializationLine = specRaw;
    else if (specRaw.toLowerCase() !== degreeLine.toLowerCase()) specializationLine = specRaw;
  }
  return {
    degreeLine: degreeLine || '—',
    specializationLine: specializationLine || '—',
  };
}

export function StudentDegreeSpecializationHeader() {
  return (
    <th>
      <div style={{ lineHeight: 1.3 }}>
        <div>Degree</div>
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          Specialisation
        </div>
      </div>
    </th>
  );
}

export default function StudentDegreeSpecializationCell({
  degree,
  specialization,
  compact = false,
}) {
  const { degreeLine, specializationLine } = degreeSpecializationLines(degree, specialization);
  return (
    <div style={{ lineHeight: 1.35, minWidth: 0 }}>
      <div
        style={{
          fontSize: compact ? '0.8rem' : '0.85rem',
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}
      >
        {degreeLine}
      </div>
      <div
        style={{
          fontSize: compact ? '0.7rem' : '0.75rem',
          color: 'var(--text-tertiary)',
          marginTop: '0.12rem',
        }}
      >
        {specializationLine}
      </div>
    </div>
  );
}
