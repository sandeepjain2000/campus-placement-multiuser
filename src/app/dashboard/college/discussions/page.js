'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import DiscussionsDesktop from './dt_Discussions';
import DiscussionsMobile from './mb_Discussions';

export default function CollegeDiscussionsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<DiscussionsDesktop />}
      mobileView={<DiscussionsMobile />}
    />
  );
}
