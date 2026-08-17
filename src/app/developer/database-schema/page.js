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
    </div>
  );
}
