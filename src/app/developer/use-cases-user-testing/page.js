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

      <style jsx global>{`
        .dev-notes-page {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .dev-notes-header {
          position: sticky;
          top: 0;
          z-index: 40;
          border-bottom: 1px solid var(--border-default);
          background: var(--bg-primary);
        }
        .dev-notes-header-inner {
          max-width: 72rem;
          margin: 0 auto;
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .dev-notes-back {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-decoration: none;
        }
        .dev-notes-back:hover {
          color: var(--primary-600);
        }
        .dev-notes-main {
          max-width: 72rem;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
        }
        .dev-notes-hero {
          margin-bottom: 1.25rem;
        }
        .dev-notes-hero-icon {
          width: 3rem;
          height: 3rem;
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-600);
          margin-bottom: 1rem;
        }
        .dev-notes-hero h1 {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 0.25rem;
        }
        .dev-notes-lead {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0 0 0.75rem;
        }
        .dev-notes-meta {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          margin: 0;
        }
        .dev-notes-meta a {
          color: var(--primary-700, #1d4ed8);
          font-weight: 600;
        }
        .dev-notes-section {
          margin-bottom: 2rem;
        }
        .dev-notes-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
        }
        .dev-notes-table-wrap--wide {
          margin-top: 0.5rem;
        }
        .dev-notes-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .dev-notes-table th,
        .dev-notes-table td {
          padding: 0.65rem 0.85rem;
          text-align: left;
          border-bottom: 1px solid var(--border-default);
          vertical-align: top;
        }
        .dev-notes-table th {
          background: var(--bg-secondary);
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-tertiary);
        }
        .dev-notes-table tr:last-child td,
        .dev-notes-table tr:last-child th[scope='row'] {
          border-bottom: none;
        }
        .dev-notes-table--use-cases th[scope='row'] {
          min-width: 11rem;
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: none;
          letter-spacing: normal;
          color: var(--text-primary);
          background: var(--bg-primary);
        }
        .dev-notes-table--use-cases td {
          min-width: 9.5rem;
          font-size: 0.8125rem;
          line-height: 1.45;
        }
        .dev-notes-muted {
          color: var(--text-secondary);
        }
        .dev-notes-detail {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0.35rem 0 1rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
