'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import ReportsDesktop from './dt_Reports';
import ReportsMobile from './mb_Reports';

export default function CollegeReportsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<ReportsDesktop />}
      mobileView={<ReportsMobile />}
    />
  );
}
