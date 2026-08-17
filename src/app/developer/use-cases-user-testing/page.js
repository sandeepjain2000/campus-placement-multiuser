import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import UseCasesTable from '@/components/developer/UseCasesTable';
import { USE_CASE_FLOWS_USER_TESTING, LOGIN_PAGE_LINKS } from '@/content/developerNotes';
import DevScreenTag from '@/components/DevScreenTag';

export const metadata = {
  title: 'User testing use cases — Developer Notes',
  description: 'Email audit, platform settings, and admin QA flows for PlacementHub.',
};

export default function DeveloperUseCasesUserTestingPage() {
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
            <FlaskConical size={28} strokeWidth={1.5} />
          </div>
          <h1>User testing use cases</h1>
          <p className="dev-notes-lead">
            Eight flows for email delivery audit, communication routing, platform toggles, exports, and college
            internship approval — use after feature changes or before a demo recording.
          </p>
          <p className="dev-notes-meta">
            <Link href="/developer#use-cases">← Core use cases</Link>
            {' · '}
            <Link href="/developer/use-cases-more">More use cases</Link>
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
            <strong>Email audit CLI:</strong>{' '}
            <code>node scripts/query_mail_logs.js &lt;email-or-context&gt;</code>
            <br />
            <strong>Super admin logs UI:</strong> Dashboard → Email delivery logs
          </div>
        </div>

        <section className="dev-notes-section" style={{ paddingTop: 0 }}>
          <UseCasesTable
            flows={USE_CASE_FLOWS_USER_TESTING}
            intro="One row per flow; each column is the next verification step (max 7). Pair with YOPmail or your communication_email inbox when SMTP is live."
          />
        </section>
      </main>
    </div>
  );
}
