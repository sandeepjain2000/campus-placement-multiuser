'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import MessageTemplatesDesktop from './dt_MessageTemplates';
import MessageTemplatesMobile from './mb_MessageTemplates';

export default function CollegeMessageTemplatesPage() {
  return (
    <ResponsiveWrapper
      desktopView={<MessageTemplatesDesktop />}
      mobileView={<MessageTemplatesMobile />}
    />
  );
}
