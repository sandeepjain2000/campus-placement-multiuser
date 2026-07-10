'use client';

import { useSession } from 'next-auth/react';
import DashboardFullScreenHub from '@/components/DashboardFullScreenHub';
import PageLoading from '@/components/PageLoading';

export default function StudentDashboardHubPage() {
  const { data: session } = useSession();

  if (!session?.user?.role) {
    return <PageLoading message="Loading your workspace…" variant="skeleton-dashboard" delayMs={0} />;
  }

  return <DashboardFullScreenHub role={session.user.role} session={session} />;
}
