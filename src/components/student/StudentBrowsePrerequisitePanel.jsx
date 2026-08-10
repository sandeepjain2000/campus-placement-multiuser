import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';

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
    <div className="animate-fadeIn flex flex-col gap-3">
      <Alert
        role="region"
        aria-labelledby="student-browse-gate-title"
        className="border-amber-500/40 bg-amber-500/5"
      >
        <AlertTitle id="student-browse-gate-title" className="text-base">
          {browseGateTitle || 'Complete your profile to continue'}
        </AlertTitle>
        <AlertDescription className="flex max-w-2xl flex-col gap-4">
          <p>
            {browseGateMessage ||
              'Finish your profile and upload your CV before browsing jobs, internships, and placement drives.'}
          </p>

          <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Academic profile:</strong>{' '}
            {profileComplete ? (
              <StatusBadge tone="green">Complete</StatusBadge>
            ) : (
              <span>
                Incomplete
                {profileMissingLabels.length ? ` — add ${profileMissingLabels.join(', ')}` : ''}
              </span>
            )}
          </li>
          <li>
            <strong>Primary CV / résumé:</strong>{' '}
            {hasResume ? (
              <StatusBadge tone="green">Uploaded</StatusBadge>
            ) : (
              <span>Not uploaded yet</span>
            )}
          </li>
          </ul>

        <div className="flex flex-wrap gap-2">
          {!profileComplete ? (
            <Button render={<Link href="/dashboard/student/profile" />}>
              Complete profile
            </Button>
          ) : null}
          {!hasResume ? (
            <Button render={<Link href="/dashboard/student/profile" />} variant="secondary">
              Upload CV (Profile → Résumé / CV)
            </Button>
          ) : null}
          {!hasResume ? (
            <Button render={<Link href="/dashboard/student/documents" />} variant="ghost">
              Documents
            </Button>
          ) : null}
        </div>
        </AlertDescription>
      </Alert>

      <p className="text-sm italic text-muted-foreground">
        Listings are hidden until both requirements above are satisfied.
      </p>
    </div>
  );
}
