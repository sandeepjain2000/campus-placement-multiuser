'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import CalendarDesktop from './dt_Calendar';
import CalendarMobile from './mb_Calendar';

export default function CollegeCalendarPage() {
  return (
    <ResponsiveWrapper
      desktopView={<CalendarDesktop />}
      mobileView={<CalendarMobile />}
    />
  );
}
