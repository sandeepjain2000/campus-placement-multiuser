import Link from 'next/link';

/**
 * Blocks browse listings until profile + CV prerequisites are met.
 * @param {{
 *   canBrowseListings?: boolean;
 *   browseGateTitle?: string | null;
 *   browseGateMessage?: string | null;
 *   profileComplete?: boolean;
 *   hasResume?: boolean;
 *   profileMissingLabels?: string[];
 *   children: import('react').ReactNode;
 * }} props
 */
export default function StudentBrowsePrerequisitePanel({
  canBrowseListings = true,
  browseGateTitle,
  browseGateMessage,
  profileComplete = true,
  hasResume = true,
  profileMissingLabels = [],
  children,
}) {
  if (canBrowseListings) {
    return children;
  }

  return (
    <div className="animate-fadeIn">
      <div
        className="card"
        role="region"
        aria-labelledby="student-browse-gate-title"
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem 1.75rem',
          borderColor: 'var(--warning-500)',
          background: 'var(--warning-50, rgba(234, 179, 8, 0.08))',
        }}
      >
        <h2
          id="student-browse-gate-title"
          style={{
            margin: '0 0 0.75rem',
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {browseGateTitle || 'Complete your profile to continue'}
        </h2>
        <p className="text-sm text-secondary" style={{ margin: '0 0 1.25rem', lineHeight: 1.6, maxWidth: 640 }}>
          {browseGateMessage ||
            'Finish your profile and upload your CV before browsing jobs, internships, and placement drives.'}
        </p>

        <ul
          className="text-sm"
          style={{
            margin: '0 0 1.25rem',
            paddingLeft: '1.25rem',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
          }}
        >
          <li style={{ marginBottom: '0.35rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Academic profile:</strong>{' '}
            {profileComplete ? (
              <span style={{ color: 'var(--success-600, #059669)' }}>Complete</span>
            ) : (
              <span>
                Incomplete
                {profileMissingLabels.length ? ` — add ${profileMissingLabels.join(', ')}` : ''}
              </span>
            )}
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Primary CV / résumé:</strong>{' '}
            {hasResume ? (
              <span style={{ color: 'var(--success-600, #059669)' }}>Uploaded</span>
            ) : (
              <span>Not uploaded yet</span>
            )}
          </li>
        </ul>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {!profileComplete ? (
            <Link href="/dashboard/student/profile" className="btn btn-primary">
              Complete profile
            </Link>
          ) : null}
          {!hasResume ? (
            <Link href="/dashboard/student/profile" className="btn btn-secondary">
              Upload CV (Profile → Résumé / CV)
            </Link>
          ) : null}
          {!hasResume ? (
            <Link href="/dashboard/student/documents" className="btn btn-ghost">
              Documents
            </Link>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-tertiary" style={{ margin: 0, fontStyle: 'italic' }}>
        Listings are hidden until both requirements above are satisfied.
      </p>
    </div>
  );
}
