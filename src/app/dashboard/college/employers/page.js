'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import DesktopEmployers from './DesktopEmployers';
import EmployersMobile from './mb_Employers';

export default function CollegeEmployersPage() {
  return (
    <ResponsiveWrapper 
      desktopView={<DesktopEmployers />}
      mobileView={<EmployersMobile />}
    />
  );
}
