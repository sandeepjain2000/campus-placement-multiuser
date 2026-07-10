'use client';

import { Menu, Bell } from 'lucide-react';
import { useState } from 'react';
import MobileHamburgerMenu from './MobileHamburgerMenu';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

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
          <button onClick={() => setMenuOpen(true)} className="btn btn-ghost btn-icon" aria-label="Open menu" style={{ marginLeft: '-0.5rem' }}>
            <Menu size={24} />
          </button>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</span>
        </div>
        
        <Link href="/dashboard/alerts" className="btn btn-ghost btn-icon" aria-label="Notifications" style={{ marginRight: '-0.5rem' }}>
          <Bell size={22} />
        </Link>
      </header>

      <MobileHamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} session={session} />
    </>
  );
}
