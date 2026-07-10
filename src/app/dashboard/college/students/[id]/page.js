'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import CollegeStudentProfilePage from '../CollegeStudentProfilePage';

export default function CollegeStudentProfileRoute() {
  return (
    <ResponsiveWrapper
      desktopView={<CollegeStudentProfilePage />}
      mobileView={<CollegeStudentProfilePage mobile />}
    />
  );
}
