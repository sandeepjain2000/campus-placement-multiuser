'use client';

import ReferralCard from '@/components/ip/ReferralCard';
import PageHeader from '@/components/ip/PageHeader';

export default function EmployerReferralPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Refer &amp; earn"
        description="Share your link — every successful signup earns points that convert into free posting credits."
      />
      <ReferralCard role="employer" />
    </div>
  );
}
