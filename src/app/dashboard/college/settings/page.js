'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import SettingsDesktop from './dt_Settings';
import SettingsMobile from './mb_Settings';

export default function CollegeSettingsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<SettingsDesktop />}
      mobileView={<SettingsMobile />}
    />
  );
}
