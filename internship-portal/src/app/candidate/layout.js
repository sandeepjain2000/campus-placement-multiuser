'use client';

import PortalShell from '@/components/ip/PortalShell';

const NAV = [
  { href: '/candidate', label: 'Dashboard' },
  { href: '/candidate/profile', label: 'Profile' },
  { href: '/candidate/internships', label: 'Browse internships' },
  { href: '/candidate/applications', label: 'My applications' },
  { href: '/candidate/messages', label: 'Messages' },
  { href: '/candidate/offers', label: 'Offers' },
  { href: '/candidate/referral', label: 'Refer & earn' },
  { href: '/candidate/notifications', label: 'Notifications' },
  { href: '/ideas', label: 'Feature ideas' },
];

export default function CandidateLayout({ children }) {
  return (
    <PortalShell role="candidate" nav={NAV} title="Internship Portal · Candidate">
      {children}
    </PortalShell>
  );
}
