'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import DesktopAcademicYears from './DesktopAcademicYears';
import MobileAcademicYears from './MobileAcademicYears';

export default function CollegeAcademicYearsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<DesktopAcademicYears />}
      mobileView={<MobileAcademicYears />}
    />
  );
}
