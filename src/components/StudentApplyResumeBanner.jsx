import Link from 'next/link';

/**
 * Shown when the student cannot apply (placement locked or missing CV).
 * @param {{ canApply?: boolean, applyBlockedReason?: string | null, placementLocked?: boolean }} props
 */
export default function StudentApplyResumeBanner({ canApply, applyBlockedReason, placementLocked }) {
  if (canApply !== false) return null;

  if (placementLocked) {
    return (
      <div
        className="card"
        role="status"
        style={{
          marginBottom: '1.5rem',
          borderColor: 'var(--success-500)',
          background: 'var(--success-50, rgba(5, 150, 105, 0.08))',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9375rem' }}>
          <strong>Placement complete.</strong>{' '}
          {applyBlockedReason || 'You have accepted a placement offer and cannot apply to new jobs or drives.'}{' '}
          <Link href="/dashboard/student/offers" style={{ color: 'var(--text-link)', fontWeight: 600 }}>
            My Offers
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className="card"
      role="status"
      style={{
        marginBottom: '1.5rem',
        borderColor: 'var(--warning-500)',
        background: 'var(--warning-50, rgba(234, 179, 8, 0.08))',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.9375rem' }}>
        <strong>CV required.</strong>{' '}
        {applyBlockedReason ||
          'You cannot apply to drives, jobs, internships, or projects until your primary CV is uploaded.'}{' '}
        <Link href="/dashboard/student/profile" style={{ color: 'var(--text-link)', fontWeight: 600 }}>
          Profile → Résumé / CV
        </Link>
        {' · '}
        <Link href="/dashboard/student/documents" style={{ color: 'var(--text-link)', fontWeight: 600 }}>
          Documents
        </Link>
      </p>
    </div>
  );
}
