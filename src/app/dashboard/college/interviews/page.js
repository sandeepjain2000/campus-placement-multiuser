'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import InterviewsDesktop from './dt_Interviews';
import InterviewsMobile from './mb_Interviews';

export default function CollegeInterviewsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<InterviewsDesktop />}
      mobileView={<InterviewsMobile />}
    />
  );
}
