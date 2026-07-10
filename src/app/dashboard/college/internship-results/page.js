'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import InternshipResultsDesktop from './dt_InternshipResults';
import InternshipResultsMobile from './mb_InternshipResults';

export default function CollegeInternshipResultsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<InternshipResultsDesktop />}
      mobileView={<InternshipResultsMobile />}
    />
  );
}
