'use client';

import { useSession } from 'next-auth/react';
import DashboardFullScreenHub from '@/components/DashboardFullScreenHub';
import PageLoading from '@/components/PageLoading';

export default function EmployerDashboardHubPage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return <PageLoading message="Loading your workspace…" variant="skeleton-dashboard" delayMs={0} />;
  }

  return <DashboardFullScreenHub role={session.user.role} session={session} />;
}
