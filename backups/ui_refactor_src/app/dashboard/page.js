'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getDashboardPath } from '@/lib/utils';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role) {
      router.replace(getDashboardPath(session.user.role));
    }
  }, [session, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div className="skeleton" style={{ width: 200, height: 24 }} />
    </div>
  );
}
