'use client';

import ReferralCard from '@/components/ip/ReferralCard';
import PageHeader from '@/components/ip/PageHeader';

export default function CandidateReferralPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Refer &amp; earn"
        description="Share your link — every successful signup earns you points."
      />
      <ReferralCard role="candidate" />
    </div>
  );
}
