'use client';

import HelpDocumentationView from '@/components/help/HelpDocumentationView';

/** Public help guide (no sign-in required). Same content as /dashboard/help. */
export default function PublicHelpPage() {
  return (
    <HelpDocumentationView
      backHref="/login"
      backLabel="Back to sign in"
      showSignInLink
    />
  );
}
