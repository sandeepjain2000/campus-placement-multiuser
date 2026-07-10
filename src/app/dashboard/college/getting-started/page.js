'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import GettingStartedDesktop from './dt_GettingStarted';
import GettingStartedMobile from './mb_GettingStarted';

export default function CollegeGettingStartedPage() {
  return (
    <ResponsiveWrapper
      desktopView={<GettingStartedDesktop />}
      mobileView={<GettingStartedMobile />}
    />
  );
}
