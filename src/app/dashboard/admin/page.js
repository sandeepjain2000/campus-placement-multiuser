'use client';

import { useSession } from 'next-auth/react';
import DashboardFullScreenHub from '@/components/DashboardFullScreenHub';
import PageLoading from '@/components/PageLoading';

/** Super admin landing — full-width section menu (same pattern as student / college hubs). */
export default function AdminDashboardHubPage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return <PageLoading message="Loading your workspace…" variant="skeleton-dashboard" delayMs={0} />;
  }

  return <DashboardFullScreenHub role={session.user.role} session={session} />;
}
