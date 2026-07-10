'use client';

import { useSession } from 'next-auth/react';
import DashboardFullScreenHub from '@/components/DashboardFullScreenHub';

export default function AdminDashboardHubPage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', background: 'var(--bg-primary)' }}>
        <div className="skeleton skeleton-heading" />
        <div className="grid grid-4" style={{ marginTop: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return <DashboardFullScreenHub role={session.user.role} session={session} />;
}
