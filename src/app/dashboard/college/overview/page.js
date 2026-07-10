'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import OverviewDesktop from './dt_Overview';
import OverviewMobile from './mb_Overview';

export default function CollegeOverviewPage() {
  return (
    <ResponsiveWrapper
      desktopView={<OverviewDesktop />}
      mobileView={<OverviewMobile />}
    />
  );
}
