'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import DtCollegeOffers from './dt_Offers';
import MbCollegeOffers from './mb_Offers';

export default function CollegeOffersPage() {
  return (
    <ResponsiveWrapper
      desktopView={<DtCollegeOffers />}
      mobileView={<MbCollegeOffers />}
    />
  );
}
