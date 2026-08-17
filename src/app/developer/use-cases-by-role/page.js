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
  getUseCaseAutoRunnerCommand,
  getUseCaseApiRunnerCommand,
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
                    {getUseCaseAutoRunnerCommand(row.runnerSlug)}
                  </code>
                </td>
                <td className="dev-notes-muted">
                  {row.apiRunner ? (
                    <code className="dev-notes-inline-code" style={{ fontSize: '0.75rem' }}>
                      {getUseCaseApiRunnerCommand(row.runnerSlug)}
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
    </div>
  );
}
