'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import ClarificationsDesktop from './dt_Clarifications';
import ClarificationsMobile from './mb_Clarifications';

export default function CollegeClarificationsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<ClarificationsDesktop />}
      mobileView={<ClarificationsMobile />}
    />
  );
}
