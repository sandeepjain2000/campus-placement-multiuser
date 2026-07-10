'use client';

/**
 * Use-case style diagram: actors around a central system + season storyline.
 */
export default function HelpUseCaseDiagram({ hub = 'PlacementHub', actors = [], seasonFlow = [], caption }) {
  return (
    <figure style={{ margin: '1.25rem 0 0' }}>
      <div
        style={{
          padding: '1.25rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {actors.map((actor) => (
            <div
              key={actor.id}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--primary-700)',
                  marginBottom: '0.5rem',
                }}
              >
                {actor.label}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {(actor.uses || []).map((u) => (
                  <li key={u} style={{ marginBottom: '0.2rem' }}>
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: '0.85rem 1rem',
            marginBottom: seasonFlow.length ? '1rem' : 0,
            background: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
          }}
        >
          {hub}
          <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
            Central platform (all actors sign in here)
          </div>
        </div>

        {seasonFlow.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-tertiary)',
                marginBottom: '0.5rem',
              }}
            >
              One season — end to end
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: '1.25rem',
                display: 'grid',
                gap: '0.35rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              {seasonFlow.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      {caption ? (
        <figcaption
          style={{
            marginTop: '0.65rem',
            fontSize: '0.85rem',
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
