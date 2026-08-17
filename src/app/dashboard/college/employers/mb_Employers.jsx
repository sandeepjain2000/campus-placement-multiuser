'use client';

import MobileHeader from '@/components/mobile/MobileHeader';
import CollegeEmployersContent from './CollegeEmployersContent';

export default function MobileEmployers() {
  return (
    <>
      <MobileHeader title="Employers" />
      <div className="px-4 pb-20">
        <CollegeEmployersContent />
      </div>
    </>
  );
}
