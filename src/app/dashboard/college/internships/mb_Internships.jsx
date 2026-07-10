'use client';

import MobileHeader from '@/components/mobile/MobileHeader';
import CollegeInternshipsContent from './CollegeInternshipsContent';

export default function mb_Internships() {
  return (
    <>
      <MobileHeader title="Internships & Programs" />
      <div style={{ padding: '0 1rem 5rem' }}>
        <CollegeInternshipsContent />
      </div>
    </>
  );
}
