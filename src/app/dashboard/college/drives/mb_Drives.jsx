'use client';

import MobileHeader from '@/components/mobile/MobileHeader';
import CollegeDrivesContent from './CollegeDrivesContent';

export default function MobileDrives() {
  return (
    <>
      <MobileHeader title="Placement Drives" />
      <div className="px-4 pb-20">
        <CollegeDrivesContent />
      </div>
    </>
  );
}
