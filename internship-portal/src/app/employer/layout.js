'use client';

import PortalShell from '@/components/ip/PortalShell';

const NAV = [
  { href: '/employer', label: 'Dashboard' },
  { href: '/employer/profile', label: 'Profile & docs' },
  { href: '/employer/internships', label: 'Postings' },
  { href: '/employer/candidates', label: 'Search candidates' },
  { href: '/employer/messages', label: 'Messages' },
  { href: '/employer/offers', label: 'Offers' },
  { href: '/employer/analytics', label: 'Analytics' },
  { href: '/employer/referral', label: 'Refer & earn' },
  { href: '/employer/viral', label: 'Viral board' },
  { href: '/employer/notifications', label: 'Notifications' },
  { href: '/ideas', label: 'Feature ideas' },
];

export default function EmployerLayout({ children }) {
  return (
    <PortalShell role="employer" nav={NAV} title="Internship Portal · Employer" accent="text-emerald-700">
      {children}
    </PortalShell>
  );
}
