'use client';

import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import DevScreenTag from '@/components/DevScreenTag';
import {
  ALL_USE_CASES,
  USE_CASE_CATALOG_BY_ROLE,
  USE_CASE_ROLE_LABELS,
  useCaseAutoRunnerCommand,
  useCaseApiRunnerCommand,
} from '@/content/developerNotes';

function RoleSection({ role, cases }) {
  if (!cases?.length) return null;
  return (
    <section className="dev-notes-section">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
        {USE_CASE_ROLE_LABELS[role] || role}
        <span className="dev-notes-muted" style={{ fontWeight: 500, fontSize: '0.875rem', marginLeft: '0.5rem' }}>
          ({cases.length})
        </span>
      </h2>
      <div className="dev-notes-table-wrap">
        <table className="dev-notes-table">
          <thead>
            <tr>
              <th scope="col">Use case</th>
              <th scope="col">UC</th>
              <th scope="col">Slug</th>
              <th scope="col">Auto runner</th>
              <th scope="col">API smoke</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((row) => (
              <tr key={`${role}-${row.runnerSlug}`}>
                <td style={{ fontWeight: 600 }}>{row.name}</td>
                <td className="dev-notes-muted">{row.ucId || '—'}</td>
                <td>
                  <code className="dev-notes-inline-code">{row.runnerSlug}</code>
                </td>
                <td>
                  <code className="dev-notes-inline-code" style={{ fontSize: '0.75rem', whiteSpace: 'normal' }}>
                    {useCaseAutoRunnerCommand(row.runnerSlug)}
                  </code>
                </td>
                <td className="dev-notes-muted">
                  {row.apiRunner ? (
                    <code className="dev-notes-inline-code" style={{ fontSize: '0.75rem' }}>
                      {useCaseApiRunnerCommand(row.runnerSlug)}
                    </code>
                  ) : (
                    'Guided only'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function UseCasesByRolePage() {
  return (
    <div className="dev-notes-page">
      <div style={{ position: 'fixed', top: '0.65rem', right: '0.75rem', zIndex: 100000 }}>
        <DevScreenTag />
      </div>
      <header className="dev-notes-header">
        <div className="dev-notes-header-inner">
          <Link href="/developer#use-cases" className="dev-notes-back">
            <ArrowLeft size={16} aria-hidden /> Developer Notes
          </Link>
          <ThemeToggleButton />
        </div>
      </header>

      <main className="dev-notes-main">
        <div className="dev-notes-hero">
          <div className="dev-notes-hero-icon" aria-hidden>
            <Users size={28} strokeWidth={1.5} />
          </div>
          <h1>All use cases by role</h1>
          <p className="dev-notes-lead">
            {ALL_USE_CASES.length} happy-path flows across student, employer, college admin, and super admin.
            Each has a guided runner; API smoke runners exist where marked.
          </p>
          <p className="dev-notes-meta">
            <code className="dev-notes-inline-code">npm run qa:uc:list</code>
            {' · '}
            <code className="dev-notes-inline-code">npm run qa:uc -- &lt;slug&gt;</code>
          </p>
        </div>

        {Object.keys(USE_CASE_CATALOG_BY_ROLE).map((role) => (
          <RoleSection key={role} role={role} cases={USE_CASE_CATALOG_BY_ROLE[role]} />
        ))}
      </main>

      <style jsx global>{`
        .dev-notes-page { min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); }
        .dev-notes-header { position: sticky; top: 0; z-index: 40; border-bottom: 1px solid var(--border-default); background: var(--bg-primary); }
        .dev-notes-header-inner { max-width: 72rem; margin: 0 auto; padding: 0.85rem 1.25rem; display: flex; align-items: center; justify-content: space-between; }
        .dev-notes-back { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); text-decoration: none; }
        .dev-notes-back:hover { color: var(--primary-600); }
        .dev-notes-main { max-width: 72rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
        .dev-notes-hero { margin-bottom: 2rem; }
        .dev-notes-hero-icon { width: 3rem; height: 3rem; border-radius: var(--radius-lg); background: var(--bg-secondary); border: 1px solid var(--border-default); display: flex; align-items: center; justify-content: center; color: var(--primary-600); margin-bottom: 1rem; }
        .dev-notes-hero h1 { font-size: 1.75rem; font-weight: 800; margin: 0 0 0.25rem; }
        .dev-notes-lead { font-size: 1rem; line-height: 1.6; color: var(--text-secondary); margin: 0 0 0.75rem; }
        .dev-notes-meta { font-size: 0.8125rem; color: var(--text-tertiary); margin: 0; }
        .dev-notes-section { margin-bottom: 2.5rem; }
        .dev-notes-table-wrap { overflow-x: auto; border: 1px solid var(--border-default); border-radius: var(--radius-lg); }
        .dev-notes-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .dev-notes-table th, .dev-notes-table td { padding: 0.65rem 0.85rem; text-align: left; border-bottom: 1px solid var(--border-default); vertical-align: top; }
        .dev-notes-table th { background: var(--bg-secondary); font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-tertiary); }
        .dev-notes-table tr:last-child td { border-bottom: none; }
        .dev-notes-muted { color: var(--text-secondary); }
        .dev-notes-inline-code { font-family: ui-monospace, monospace; font-size: 0.8125rem; background: var(--bg-secondary); padding: 0.1rem 0.35rem; border-radius: 4px; }
      `}</style>
    </div>
  );
}
