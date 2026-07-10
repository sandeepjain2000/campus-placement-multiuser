'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import EventsDesktop from './dt_Events';
import EventsMobile from './mb_Events';

export default function CollegeEventsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<EventsDesktop />}
      mobileView={<EventsMobile />}
    />
  );
}
