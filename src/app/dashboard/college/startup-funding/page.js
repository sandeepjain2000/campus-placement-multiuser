'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import StartupFundingDesktop from './dt_StartupFunding';
import StartupFundingMobile from './mb_StartupFunding';

export default function CollegeStartupFundingPage() {
  return (
    <ResponsiveWrapper
      desktopView={<StartupFundingDesktop />}
      mobileView={<StartupFundingMobile />}
    />
  );
}
