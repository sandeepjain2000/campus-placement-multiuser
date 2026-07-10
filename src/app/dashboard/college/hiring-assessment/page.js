'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import HiringAssessmentDesktop from './dt_HiringAssessment';
import HiringAssessmentMobile from './mb_HiringAssessment';

export default function CollegeHiringAssessmentPage() {
  return (
    <ResponsiveWrapper
      desktopView={<HiringAssessmentDesktop />}
      mobileView={<HiringAssessmentMobile />}
    />
  );
}
