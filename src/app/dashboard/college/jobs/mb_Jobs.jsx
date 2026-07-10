'use client';

import CollegeAlumniJobsContent from './CollegeAlumniJobsContent';
import MobileHeader from '@/components/mobile/MobileHeader';

export default function mb_Jobs() {
  return (
    <>
      <MobileHeader title="Alumni Jobs" />
      <CollegeAlumniJobsContent />
    </>
  );
}
