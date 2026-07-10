'use client';

import { useEffect } from 'react';
import PageLoading from '@/components/PageLoading';

export default function DashboardPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace(`${window.location.origin}/auth/continue`);
    }
  }, []);

  return <PageLoading message="Opening your dashboard…" delayMs={0} />;
}
