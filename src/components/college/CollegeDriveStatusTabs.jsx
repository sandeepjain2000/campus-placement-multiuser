'use client';

import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';
import { COLLEGE_DRIVE_STATUS_TABS } from '@/lib/collegeDriveStatusTabs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Status tabs for college Placement Drives (replaces an “All” default dump).
 */
export default function CollegeDriveStatusTabs({ activeTab, onTabChange, counts = {} }) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList aria-label="Drive status" className="h-auto max-w-full flex-wrap justify-start">
        {COLLEGE_DRIVE_STATUS_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {formatFilterBadgeLabelParen(tab.label, counts[tab.id] ?? 0)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
