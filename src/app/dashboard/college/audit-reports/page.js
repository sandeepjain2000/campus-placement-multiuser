'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import AuditReportsDesktop from './dt_AuditReports';
import AuditReportsMobile from './mb_AuditReports';

export default function CollegeAuditReportsPage() {
  return (
    <ResponsiveWrapper
      desktopView={<AuditReportsDesktop />}
      mobileView={<AuditReportsMobile />}
    />
  );
}
