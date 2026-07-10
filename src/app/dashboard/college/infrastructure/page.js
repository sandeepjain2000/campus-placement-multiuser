'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import InfrastructureDesktop from './dt_Infrastructure';
import InfrastructureMobile from './mb_Infrastructure';

export default function CollegeInfrastructurePage() {
  return (
    <ResponsiveWrapper
      desktopView={<InfrastructureDesktop />}
      mobileView={<InfrastructureMobile />}
    />
  );
}
