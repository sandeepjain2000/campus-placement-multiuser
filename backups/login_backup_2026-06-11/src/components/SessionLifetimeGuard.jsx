'use client';

import { useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { markBrowserSessionActive, SESSION_BROWSER_MARKER_KEY } from '@/lib/sessionPolicy';
import { usePathname } from 'next/navigation';

/**
 * Stale persistent cookies: sessionStorage is empty but NextAuth still has a session → sign out.
 * Legitimate sign-in sets the marker on the login page before navigation.
 */
export default function SessionLifetimeGuard({ children }) {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return;
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      try {
        sessionStorage.removeItem(SESSION_BROWSER_MARKER_KEY);
      } catch {
        /* ignore */
      }
      return;
    }

    if (status !== 'authenticated') return;

    let marker = null;
    try {
      marker = sessionStorage.getItem(SESSION_BROWSER_MARKER_KEY);
    } catch {
      /* ignore */
    }

    if (marker === '1') return;

    const timer = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(SESSION_BROWSER_MARKER_KEY) === '1') return;
      } catch {
        /* ignore */
      }
      console.warn('SessionLifetimeGuard: sessionStorage marker missing. Stale session detected. Signing out...');
      void signOut({ callbackUrl: '/login?error=stale' });
    }, 750);

    return () => window.clearTimeout(timer);
  }, [status, pathname]);

  useEffect(() => {
    if (pathname === '/login') return;
    if (status === 'authenticated') {
      markBrowserSessionActive();
    }
  }, [status, pathname]);

  return children;
}
