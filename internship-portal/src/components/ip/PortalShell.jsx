'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Home, LogOut, Menu, PanelLeft, PanelLeftClose, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn, getInitials } from '@/lib/utils';
import ProfileReminderBanner from '@/components/ip/ProfileReminderBanner';

const ROLE_HOME = {
  candidate: '/candidate',
  employer: '/employer',
  superadmin: '/superadmin',
};

const ROLE_SUBTITLE = {
  candidate: 'Candidate workspace',
  employer: 'Employer workspace',
  superadmin: 'SuperAdmin workspace',
};

/**
 * Shared authenticated app shell — CPMU AdminCN dashboard chrome
 * (bg-sidebar, collapse, mobile drawer, sticky topbar).
 * Keeps PortalShell nav API for role layouts.
 */
export default function PortalShell({
  role,
  nav,
  title,
  loginHref = '/',
  children,
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const homePath = ROLE_HOME[role] || '/';

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem('ip_sidebar_collapsed') === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ip_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace(loginHref);
    if (status === 'authenticated' && session?.user?.role && session.user.role !== role) {
      router.replace(loginHref);
    }
  }, [status, session, role, router, loginHref]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-pulse rounded-lg bg-primary/20" />
          <p className="text-sm">Signing you in…</p>
        </div>
      </div>
    );
  }
  if (session?.user?.role !== role) return null;

  const displayName = session.user.name || session.user.email || 'User';
  const notificationsHref = nav.find((n) => /notif/i.test(n.label) || /notifications/.test(n.href))?.href;

  function isActive(href) {
    if (href === homePath) return pathname === href;
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <div className="dashboard-layout flex min-h-svh w-full bg-background text-foreground">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm',
          'transition-[width,transform] duration-200 ease-linear',
          sidebarCollapsed ? 'w-12' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'max-md:w-72',
        )}
        data-state={sidebarCollapsed ? 'collapsed' : 'expanded'}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-2 px-2',
            sidebarCollapsed && 'md:flex-col md:h-auto md:py-2 md:gap-1',
          )}
        >
          <Link
            href={homePath}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-1.5 outline-none',
              'hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              sidebarCollapsed && 'md:flex-none md:justify-center md:px-0',
            )}
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-xs">
              IP
            </div>
            <div className={cn('min-w-0 flex-1', sidebarCollapsed && 'md:hidden')}>
              <div className="truncate text-sm font-semibold">Internship Portal</div>
              <div className="truncate text-xs text-sidebar-foreground/60">{ROLE_SUBTITLE[role] || title}</div>
            </div>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 max-md:hidden"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {sidebarCollapsed ? <PanelLeft aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </Button>
        </div>
        <Separator />

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          <Link
            href={homePath}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium outline-none transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              pathname === homePath && 'bg-primary/10 text-sidebar-accent-foreground',
              sidebarCollapsed && 'md:justify-center md:px-0',
            )}
            onClick={() => setMobileOpen(false)}
            aria-current={pathname === homePath ? 'page' : undefined}
            title="Home"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <Home aria-hidden="true" className="size-4" />
            </span>
            <span className={cn('min-w-0 flex-1 truncate', sidebarCollapsed && 'md:hidden')}>Home</span>
          </Link>

          <div
            className={cn(
              'px-2 pb-1 pt-4 text-[0.6875rem] font-medium uppercase tracking-wider text-sidebar-foreground/50',
              sidebarCollapsed && 'md:sr-only',
            )}
          >
            Menu
          </div>

          {nav
            .filter((item) => item.href !== homePath)
            .map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-foreground outline-none transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    active && 'bg-primary/10 text-sidebar-accent-foreground',
                    sidebarCollapsed && 'md:justify-center md:px-0',
                  )}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                >
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      active ? 'bg-primary' : 'bg-sidebar-foreground/30',
                      sidebarCollapsed && 'md:size-2',
                    )}
                  />
                  <span className={cn('min-w-0 flex-1 truncate text-left', sidebarCollapsed && 'md:hidden')}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
        </nav>

        <Separator />
        <div className="shrink-0 p-2">
          <div
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-md p-2',
              sidebarCollapsed && 'md:justify-center md:px-0',
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(displayName)}
            </div>
            <div className={cn('min-w-0 flex-1', sidebarCollapsed && 'md:hidden')}>
              <div className="truncate text-sm font-semibold">{displayName}</div>
              <div className="truncate text-xs text-sidebar-foreground/60">{session.user.email}</div>
            </div>
            <ChevronRight
              aria-hidden="true"
              className={cn('size-4 shrink-0 text-sidebar-foreground/50', sidebarCollapsed && 'md:hidden')}
            />
          </div>
        </div>
      </aside>

      <div
        className={cn(
          'flex min-h-svh min-w-0 flex-1 flex-col bg-background transition-[margin] duration-200 ease-linear',
          sidebarCollapsed ? 'md:ml-12' : 'md:ml-64',
        )}
      >
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle navigation menu"
              >
                <Menu aria-hidden="true" />
              </Button>
              {sidebarCollapsed ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <PanelLeft data-icon="inline-start" aria-hidden="true" />
                  Expand menu
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hidden md:inline-flex"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose aria-hidden="true" />
                </Button>
              )}
              <Separator orientation="vertical" className="mx-1 hidden h-5! data-vertical:self-center sm:block" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold leading-tight sm:text-base">{title}</h2>
                <p className="truncate text-xs text-muted-foreground">{ROLE_SUBTITLE[role]}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {notificationsHref ? (
                <Button variant="outline" size="sm" render={<Link href={notificationsHref} />} nativeButton={false}>
                  Notifications
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: loginHref })}
              >
                <LogOut data-icon="inline-start" className="size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
          {(role === 'candidate' || role === 'employer') ? <ProfileReminderBanner /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
