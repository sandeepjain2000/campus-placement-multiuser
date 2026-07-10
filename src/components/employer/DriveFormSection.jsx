'use client';

export const driveFormGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '0.75rem',
  width: '100%',
};

export const driveFormFullRow = { gridColumn: '1 / -1', marginBottom: 0 };

/** Date and other short inputs — avoids stretching when alone on a grid row. */
export const driveFormCompactField = { marginBottom: 0, maxWidth: '16rem', width: '100%' };

/**
 * @param {{ title: string; description?: string; children: import('react').ReactNode; first?: boolean }} props
 */
export function DriveFormSection({ title, description, children, first = false }) {
  return (
    <section
      style={{
        width: '100%',
        paddingTop: first ? 0 : '1.25rem',
        borderTop: first ? 'none' : '1px solid var(--border-default)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>
            {description}
          </p>
        ) : null}
      </div>
      <div style={driveFormGridStyle}>{children}</div>
    </section>
  );
}

/**
 * @param {{ title: string; description?: string; children: import('react').ReactNode; first?: boolean }} props
 */
export function DriveDetailsSection({ title, description, children, first = false }) {
  return (
    <section
      style={{
        paddingTop: first ? 0 : '1rem',
        marginTop: first ? 0 : '1rem',
        borderTop: first ? 'none' : '1px solid var(--border-default)',
      }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <div className="text-xs font-semibold text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </div>
        {description ? (
          <p className="text-xs text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.45 }}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
