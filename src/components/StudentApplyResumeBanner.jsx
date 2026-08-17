import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Shown when the student cannot apply (placement locked or missing CV).
 * @param {{ canApply?: boolean, applyBlockedReason?: string | null, placementLocked?: boolean }} props
 */
export default function StudentApplyResumeBanner({ canApply, applyBlockedReason, placementLocked }) {
  if (canApply !== false) return null;

  if (placementLocked) {
    return (
      <Alert className="mb-6" role="status">
        <AlertTitle>Placement Complete</AlertTitle>
        <AlertDescription>
          {applyBlockedReason || 'You have accepted a placement offer and cannot apply to new jobs or drives.'}{' '}
          <Link href="/dashboard/student/offers">
            My Offers
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-6" role="status">
      <AlertTitle>CV Required</AlertTitle>
      <AlertDescription>
        {applyBlockedReason ||
          'You cannot apply to drives, jobs, internships, or projects until your primary CV is uploaded.'}{' '}
        <Link href="/dashboard/student/profile">
          Profile → Résumé / CV
        </Link>
        {' · '}
        <Link href="/dashboard/student/documents">
          Documents
        </Link>
      </AlertDescription>
    </Alert>
  );
}
