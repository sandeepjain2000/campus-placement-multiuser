/** Two-line cell: system ID on line 1, batch year on line 2. */
export function systemIdBatchLines(systemId, roll, batch, joiningAcademicYear) {
  const idLine = String(systemId || roll || '').trim();
  const batchLine = String(batch || joiningAcademicYear || '').trim();
  return {
    systemIdLine: idLine || '—',
    batchLine: batchLine || '—',
  };
}

export function StudentSystemIdBatchHeader() {
  return (
    <th>
      <div style={{ lineHeight: 1.3 }}>
        <div>System ID</div>
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          Batch
        </div>
      </div>
    </th>
  );
}

export default function StudentSystemIdBatchCell({
  systemId,
  roll,
  batch,
  joiningAcademicYear,
  compact = false,
}) {
  const { systemIdLine, batchLine } = systemIdBatchLines(systemId, roll, batch, joiningAcademicYear);
  return (
    <div style={{ lineHeight: 1.35, minWidth: 0 }}>
      <div
        style={{
          fontSize: compact ? '0.75rem' : '0.8rem',
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 700,
          color: 'var(--primary-700)',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {systemIdLine}
      </div>
      <div
        style={{
          fontSize: compact ? '0.7rem' : '0.75rem',
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--text-tertiary)',
          marginTop: '0.12rem',
        }}
      >
        {batchLine}
      </div>
    </div>
  );
}
