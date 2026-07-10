import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { renderDeveloperMarkdown } from '@/lib/renderDeveloperMarkdown';
import ThemeToggleButton from '@/components/ThemeToggleButton';

const SCHEMA_PATH = path.join(process.cwd(), 'docs', 'help', 'developer', 'database-schema.md');

export const metadata = {
  title: 'Database schema — Developer Notes',
  description: 'PlacementHub database tables, foreign keys, and domain relationships.',
};

function loadSchemaMarkdown() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    return `# Database schema\n\nSchema file not found. From the app folder run:\n\n\`\`\`bash\nnpm run db:generate-docs\n\`\`\`\n`;
  }
  return fs.readFileSync(SCHEMA_PATH, 'utf8');
}

export default function DeveloperDatabaseSchemaPage() {
  const html = renderDeveloperMarkdown(loadSchemaMarkdown());

  return (
    <div className="dev-notes-page">
      <header className="dev-notes-header">
        <div className="dev-notes-header-inner">
          <Link href="/developer" className="dev-notes-back">
            <ArrowLeft size={16} aria-hidden /> Developer Notes
          </Link>
          <ThemeToggleButton />
        </div>
      </header>

      <main className="dev-notes-main">
        <div className="dev-notes-hero">
          <div className="dev-notes-hero-icon" aria-hidden>
            <Database size={28} strokeWidth={1.5} />
          </div>
          <h1>Database schema &amp; relationships</h1>
          <p className="dev-notes-lead">
            Domain overview plus per-table columns and foreign keys from the live database.
          </p>
          <p className="dev-notes-meta">
            Repo file: <code>docs/help/developer/database-schema.md</code> · Refresh:{' '}
            <code>npm run db:generate-docs</code>
          </p>
        </div>

        <article className="dev-md-article" dangerouslySetInnerHTML={{ __html: html }} />
      </main>

      <style jsx global>{`
        .dev-md-article {
          max-width: 52rem;
          margin: 0 auto;
          padding: 0 1.25rem 3rem;
          line-height: 1.6;
        }
        .dev-md-h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 2rem 0 1rem;
          letter-spacing: -0.02em;
        }
        .dev-md-h2 {
          font-size: 1.35rem;
          font-weight: 700;
          margin: 2rem 0 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border-default);
        }
        .dev-md-h3 {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 1.25rem 0 0.5rem;
        }
        .dev-md-h4 {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 1rem 0 0.35rem;
        }
        .dev-md-p {
          margin: 0.5rem 0;
          color: var(--text-secondary);
        }
        .dev-md-ul {
          margin: 0.5rem 0 1rem;
          padding-left: 1.25rem;
          color: var(--text-secondary);
        }
        .dev-md-ul li {
          margin: 0.25rem 0;
        }
        .dev-md-quote {
          margin: 1rem 0;
          padding: 0.75rem 1rem;
          border-left: 3px solid var(--primary-400, #60a5fa);
          background: var(--surface-subtle, #f9fafb);
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .dev-md-pre {
          margin: 0.75rem 0 1rem;
          padding: 0.85rem 1rem;
          border-radius: 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          overflow-x: auto;
          font-size: 0.85rem;
        }
        .dev-md-pre code,
        .dev-md-article code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.88em;
        }
        .dev-md-article :not(pre) > code {
          padding: 0.1em 0.35em;
          border-radius: 0.25rem;
          background: var(--bg-secondary);
        }
        .dev-md-table-wrap {
          overflow-x: auto;
          margin: 0.75rem 0 1.25rem;
        }
        .dev-md-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .dev-md-table th,
        .dev-md-table td {
          border: 1px solid var(--border-default);
          padding: 0.45rem 0.6rem;
          text-align: left;
          vertical-align: top;
        }
        .dev-md-table th {
          background: var(--bg-secondary);
          font-weight: 600;
        }
        .dev-md-hr {
          border: none;
          border-top: 1px solid var(--border-default);
          margin: 2rem 0;
        }
        .dev-md-article a {
          color: var(--primary-700, #1d4ed8);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
