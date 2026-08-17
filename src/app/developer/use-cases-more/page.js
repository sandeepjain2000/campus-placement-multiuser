import Link from 'next/link';
import { ArrowLeft, ListChecks } from 'lucide-react';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import UseCasesTable from '@/components/developer/UseCasesTable';
import { USE_CASE_FLOWS_MORE, LOGIN_PAGE_LINKS } from '@/content/developerNotes';
import DevScreenTag from '@/components/DevScreenTag';

export const metadata = {
  title: 'More use cases — Developer Notes',
  description: 'Additional PlacementHub end-to-end use cases for QA and onboarding (10 flows).',
};

export default function DeveloperUseCasesMorePage() {
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
            <ListChecks size={28} strokeWidth={1.5} />
          </div>
          <h1>More use cases</h1>
          <p className="dev-notes-lead">
            Ten additional end-to-end flows — offers, online assessment updates, clarifications, interviews,
            full-time jobs, registration, password reset, bulk import, sponsorship receipts, and interview notify.
          </p>
          <p className="dev-notes-meta">
            <Link href="/developer#use-cases">← Back to first 5 use cases</Link>
            {' · '}
            <Link href="/developer/use-cases-user-testing">User testing use cases</Link>
          </p>
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            <strong>QA login:</strong>{' '}
            <Link href={LOGIN_PAGE_LINKS.oldWithDemoAccounts} style={{ fontWeight: 700 }}>
              Old Login Page (Demo accounts dropdown)
            </Link>
            {' · '}
            <Link href={LOGIN_PAGE_LINKS.newSignIn} style={{ fontWeight: 700 }}>New Sign In Page</Link>
            <span className="dev-notes-muted"> — no demo picker</span>
          </div>
        </div>

        <section className="dev-notes-section" style={{ paddingTop: 0 }}>
          <UseCasesTable
            flows={USE_CASE_FLOWS_MORE}
            intro="One row per use case; each column is the next step in the flow (max 7 steps)."
          />
        </section>
      </main>
    </div>
  );
}
