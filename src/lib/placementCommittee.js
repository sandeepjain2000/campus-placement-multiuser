'use client';

import { useSession } from 'next-auth/react';
import { isPlacementCommitteeRole } from '@/lib/collegeAccess';

/** Client-safe: placement committee has read-only college student access. */
export function isPlacementCommitteeUser(session) {
  return isPlacementCommitteeRole(session?.user?.role);
}

/** True when the signed-in user is placement committee (read-only college staff). */
export function usePlacementCommitteeReadOnly() {
  const { data: session } = useSession();
  return isPlacementCommitteeRole(session?.user?.role);
}
