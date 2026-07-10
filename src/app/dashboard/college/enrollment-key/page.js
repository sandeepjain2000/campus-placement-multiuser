'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import EnrollmentKeyDesktop from './dt_EnrollmentKey';
import EnrollmentKeyMobile from './mb_EnrollmentKey';

export default function CollegeEnrollmentKeyPage() {
  return (
    <ResponsiveWrapper
      desktopView={<EnrollmentKeyDesktop />}
      mobileView={<EnrollmentKeyMobile />}
    />
  );
}
