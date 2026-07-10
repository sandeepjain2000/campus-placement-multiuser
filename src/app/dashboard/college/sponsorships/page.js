'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import SponsorshipsDesktop from './dt_Sponsorships';
import SponsorshipsMobile from './mb_Sponsorships';

export default function CollegeSponsorshipsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<SponsorshipsDesktop />}
      mobileView={<SponsorshipsMobile />}
    />
  );
}
