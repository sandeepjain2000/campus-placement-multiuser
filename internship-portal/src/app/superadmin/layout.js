'use client';

import { usePathname } from 'next/navigation';
import PortalShell from '@/components/ip/PortalShell';

const NAV = [
  { href: '/superadmin', label: 'Dashboard' },
  { href: '/superadmin/approvals', label: 'Employer approvals' },
  { href: '/superadmin/requests', label: 'Manual requests' },
  { href: '/superadmin/documents', label: 'Documents' },
  { href: '/superadmin/postings', label: 'Postings' },
  { href: '/superadmin/promotions', label: 'LinkedIn promos' },
  { href: '/superadmin/viral', label: 'Viral shares' },
  { href: '/superadmin/login-report', label: 'Login report' },
  { href: '/superadmin/messages', label: 'Messages' },
  { href: '/superadmin/feature-ideas', label: 'Feature ideas' },
];

export default function SuperAdminLayout({ children }) {
  const pathname = usePathname();
  if (pathname === '/superadmin/login') return children;
  return (
    <PortalShell
      role="superadmin"
      nav={NAV}
      title="Internship Portal · SuperAdmin"
      accent="text-red-800"
      loginHref="/superadmin/login"
    >
      {children}
    </PortalShell>
  );
}
