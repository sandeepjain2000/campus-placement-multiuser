'use client';

import MobileHeader from '@/components/mobile/MobileHeader';
import CollegeAlumniJobsContent from './CollegeAlumniJobsContent';

/** @deprecated Prefer mb_Jobs — kept as alias to the shared AdminCN surface. */
export default function MobileJobs() {
  return (
    <>
      <MobileHeader title="Jobs" />
      <CollegeAlumniJobsContent />
    </>
  );
}
