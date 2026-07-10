'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import GuestEngagementsDesktop from './dt_GuestEngagements';
import GuestEngagementsMobile from './mb_GuestEngagements';

export default function CollegeGuestEngagementsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<GuestEngagementsDesktop />}
      mobileView={<GuestEngagementsMobile />}
    />
  );
}
