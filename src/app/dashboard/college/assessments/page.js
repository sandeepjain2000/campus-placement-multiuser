'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CollegeAssessmentsCompatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/college/hiring-assessment');
  }, [router]);

  return (
    <div className="card" style={{ margin: '2rem' }}>
      Redirecting to Hiring Assessment...
    </div>
  );
}
