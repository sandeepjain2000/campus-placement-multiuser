'use client';

import { Menu, Bell } from 'lucide-react';
import { useState } from 'react';
import MobileHamburgerMenu from './MobileHamburgerMenu';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function MobileHeader({ title = 'PlacementHub' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      <header className="mobile-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-default)',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Button type="button" variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="-ml-2">
            <Menu aria-hidden="true" />
          </Button>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</span>
        </div>
        
        <Button render={<Link href="/dashboard/alerts" />} variant="ghost" size="icon" aria-label="Notifications" className="-mr-2">
          <Bell aria-hidden="true" />
        </Button>
      </header>

      <MobileHamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} session={session} />
    </>
  );
}
