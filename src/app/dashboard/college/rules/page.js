'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import RulesDesktop from './dt_Rules';
import RulesMobile from './mb_Rules';

export default function CollegeRulesPage() {
  return (
    <ResponsiveWrapper
      desktopView={<RulesDesktop />}
      mobileView={<RulesMobile />}
    />
  );
}
