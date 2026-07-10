'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import DtCollegeApplications from './dt_Applications';
import ApplicationsMobile from './mb_Applications';

export default function CollegeApplicationsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<DtCollegeApplications />}
      mobileView={<ApplicationsMobile />}
    />
  );
}
