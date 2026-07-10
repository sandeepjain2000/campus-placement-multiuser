import { useCaseRunnerCommand, useCaseRunnerBat, useCaseAutoRunnerCommand, ALL_USE_CASES } from '@/content/developerNotes';

const STEP_COUNT = 7;

/**
 * @param {{ flows: { name: string, runnerSlug?: string, steps: string[] }[], intro?: string, showRunner?: boolean }} props
 */
export default function UseCasesTable({ flows, intro, showRunner = true }) {
  return (
    <>
      {intro ? (
        <p className="dev-notes-detail" style={{ marginTop: 0 }}>
          {intro}
        </p>
      ) : null}
      {showRunner ? (
        <div
          style={{
            marginTop: 0,
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            background: 'var(--info-50)',
            border: '1px solid rgba(14, 165, 233, 0.28)',
            borderLeft: '4px solid var(--info-500)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Runners</strong> — each row includes voice + headless commands.
          Voice:{' '}
          <code className="dev-notes-inline-code">npm run test:guided:voice -- &lt;slug&gt;</code>
          {' · '}
          Headless: <code className="dev-notes-inline-code">npm run qa:uc -- &lt;slug&gt;</code>
          {' · '}
          All {ALL_USE_CASES.length} slugs: <code className="dev-notes-inline-code">npm run qa:uc:list</code>
        </div>
      ) : null}
      <div className="dev-notes-table-wrap dev-notes-table-wrap--wide">
        <table className="dev-notes-table dev-notes-table--use-cases">
          <thead>
            <tr>
              <th scope="col">Use case</th>
              {showRunner ? <th scope="col">Voice runner</th> : null}
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <th key={i} scope="col">
                  Step {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flows.map((row) => (
              <tr key={row.name}>
                <th scope="row">
                  <div>{row.name}</div>
                  {showRunner && row.runnerSlug ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <code
                        className="dev-notes-inline-code"
                        style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.7rem', whiteSpace: 'normal', wordBreak: 'break-word' }}
                      >
                        {useCaseAutoRunnerCommand(row.runnerSlug)}
                      </code>
                      <code
                        className="dev-notes-inline-code"
                        style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.7rem', whiteSpace: 'normal', wordBreak: 'break-word' }}
                      >
                        {useCaseRunnerCommand(row.runnerSlug)}
                      </code>
                      <code
                        className="dev-notes-inline-code"
                        style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-tertiary)', whiteSpace: 'normal', wordBreak: 'break-word' }}
                      >
                        {useCaseRunnerBat(row.runnerSlug)}
                      </code>
                    </div>
                  ) : null}
                </th>
                {showRunner ? (
                  <td className="dev-notes-muted dev-notes-runner-col">
                    {row.runnerSlug ? (
                      <>
                        <span className="dev-notes-runner-slug">{row.runnerSlug}</span>
                        <code className="dev-notes-inline-code" style={{ display: 'block', marginBottom: '0.35rem' }}>
                          {useCaseRunnerCommand(row.runnerSlug)}
                        </code>
                        <code className="dev-notes-inline-code" style={{ display: 'block', color: 'var(--text-tertiary)' }}>
                          {useCaseRunnerBat(row.runnerSlug)}
                        </code>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}
                {Array.from({ length: STEP_COUNT }, (_, i) => (
                  <td key={i} className={row.steps[i] ? '' : 'dev-notes-muted'}>
                    {row.steps[i] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
