import Link from 'next/link';

/**
 * Canonical “where is everything?” page for employer assessment confusion.
 * Single source of truth for round data: Assessment uploads (CSV + View/edit).
 * Hiring Assessment is a read-only campus view + summary + export of that same data.
 */
export default function EmployerAssessmentSummaryPage() {
  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🗺️ Assessment &amp; hiring — where to look</h1>
          <p className="text-secondary text-sm" style={{ maxWidth: 720 }}>
            <strong>All round results are entered on Assessment uploads</strong> (CSV, then <strong>View / edit</strong>).{' '}
            <strong>Hiring Assessment</strong> shows the same rows per campus — summary and export only; it does not save edits.
          </p>
        </div>
      </div>

      <div className="directive-panel" role="region" aria-label="Summary">
        <p className="directive-panel__title">Quick answer</p>
        <ul className="directive-steps" style={{ listStyle: 'disc' }}>
          <li>
            <strong>Add or change round_1…round_5, remarks, or rows?</strong>{' '}
            →{' '}
            <Link href="/dashboard/employer/assessment-uploads" style={{ fontWeight: 600 }}>
              Assessment uploads
            </Link>
            : upload CSV and use <strong>View / edit</strong> on the batch you need.
          </li>
          <li>
            <strong>Read-only campus roll-up, counts, and CSV export?</strong>{' '}
            →{' '}
            <Link href="/dashboard/employer/hiring-assessment" style={{ fontWeight: 600 }}>
              Hiring Assessment
            </Link>
            — pick a campus; no editing there.
          </li>
          <li>
            <strong>Who applied / pipeline stage?</strong> →{' '}
            <Link href="/dashboard/employer/applications" style={{ fontWeight: 600 }}>
              Applications
            </Link>{' '}
            and{' '}
            <Link href="/dashboard/employer/overview" style={{ fontWeight: 600 }}>
              Overview
            </Link>{' '}
            (per campus).
          </li>
        </ul>
      </div>

      <div className="grid grid-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            A · Assessment uploads (source of truth)
          </h3>
          <p className="text-sm text-secondary" style={{ lineHeight: 1.55, marginBottom: '1rem' }}>
            Upload CSV against a <strong>drive or job</strong>. Accepted rows are stored per upload. Your <strong>full per-student grid</strong> (rolls, five
            rounds, remarks) is in <strong>View / edit</strong> for that file. Export upload metadata from the same page.
          </p>
          <Link href="/dashboard/employer/assessment-uploads" className="btn btn-primary">
            Open Assessment uploads
          </Link>
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            B · Hiring Assessment (read-only)
          </h3>
          <p className="text-sm text-secondary" style={{ lineHeight: 1.55, marginBottom: '1rem' }}>
            Same data as your uploads, filtered by campus: <strong>summary cards</strong>, detail table, and <strong>export</strong>. Use it for reporting —{' '}
            return to Assessment uploads for any change.
          </p>
          <Link href="/dashboard/employer/hiring-assessment" className="btn btn-secondary">
            Open Hiring Assessment
          </Link>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
          Related
        </h3>
        <ul className="text-sm text-secondary" style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
          <li>
            <Link href="/dashboard/employer/interviews">Interview scheduling</Link> — calendar slots, not round marks.
          </li>
          <li>
            <Link href="/dashboard/employer/drives">Placement drives</Link> — tie uploads to a drive when you use the CSV flow.
          </li>
        </ul>
      </div>
    </div>
  );
}
