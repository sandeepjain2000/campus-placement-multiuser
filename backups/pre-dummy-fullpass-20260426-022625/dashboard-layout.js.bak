'use client';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from '@/components/ThemeProvider';
import { getInitials, getRoleDisplayName } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import SessionAdBanner from '@/components/SessionAdBanner';
import {
  menuConfig,
  ROLE_HOME_PATHS,
  NAV_SECTION_STORAGE_KEY,
  findSectionIdByPath,
  isSidebarItemActive,
  isRoleDashboardHome,
} from '@/config/dashboardMenu';
import NotificationDropdown from '@/components/NotificationDropdown';
import DevScreenTag from '@/components/DevScreenTag';
import { Moon, Sun, Menu, Mail, Home } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [employerCampusLabel, setEmployerCampusLabel] = useState(null);

  useEffect(() => {
    if (session?.user?.role !== 'employer') return;
    const readCampus = () => {
      try {
        const raw = sessionStorage.getItem('activeCampus');
        setEmployerCampusLabel(raw ? JSON.parse(raw).name : null);
      } catch {
        setEmployerCampusLabel(null);
      }
    };
    readCampus();
    window.addEventListener('placementhub-active-campus', readCampus);
    return () => window.removeEventListener('placementhub-active-campus', readCampus);
  }, [session?.user?.role]);

  useEffect(() => {
    if (!session?.user?.role) return;
    const menu = menuConfig[session.user.role] || menuConfig.student;
    const id = findSectionIdByPath(menu, pathname);
    if (id) {
      try {
        sessionStorage.setItem(NAV_SECTION_STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    }
  }, [pathname, session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: 200, height: 24 }} />
      </div>
    );
  }

  if (!session) return null;

  const role = session.user.role;
  const menu = menuConfig[role] || menuConfig.student;
  const sectionId = findSectionIdByPath(menu, pathname);
  const activeSection = menu.sections.find((s) => s.id === sectionId) || menu.sections[0];
  const homePath = ROLE_HOME_PATHS[role] || ROLE_HOME_PATHS.student;
  const isHub = isRoleDashboardHome(pathname, role);
  if (isHub) {
    return <>{children}</>;
  }

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <Link href={homePath} className="sidebar-logo">
          <div className="sidebar-logo-icon">P</div>
          <span>PlacementHub</span>
        </Link>

        <nav className="sidebar-nav">
          <Link
            href={homePath}
            className={`sidebar-link ${pathname === homePath ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            aria-current={pathname === homePath ? 'page' : undefined}
          >
            <span className="sidebar-link-icon">
              <Home size={18} aria-hidden="true" />
            </span>
            <span>Home</span>
          </Link>
          <div className="sidebar-section-title">{activeSection.title}</div>
          {activeSection.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isSidebarItemActive(item.href, activeSection, pathname) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              aria-current={isSidebarItemActive(item.href, activeSection, pathname) ? 'page' : undefined}
            >
              <span className="sidebar-link-icon">
                <item.icon size={18} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
            {(role === 'employer' || role === 'college_admin') ? (
              <EntityLogo
                name={session.user.tenantName || session.user.name}
                size="sm"
                shape="rounded"
              />
            ) : (
              <div className="avatar avatar-md">
                {getInitials(session.user.name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {getRoleDisplayName(role)}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn btn-ghost btn-icon"
              style={{ display: 'none' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              id="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} aria-hidden="true" />
            </button>
            <style jsx>{`
              @media (max-width: 768px) {
                #mobile-menu-toggle { display: flex !important; }
              }
            `}</style>

            <div
              style={{
                marginLeft: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                minWidth: 0,
                flex: '1 1 auto',
              }}
            >
              <Link
                href={homePath}
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, flexShrink: 0 }}
                title="Full workspace menu"
              >
                <Home size={16} aria-hidden="true" /> Home
              </Link>
              <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, maxWidth: 'min(100%, 22rem)' }}>
                <div className="avatar avatar-sm" style={{ width: '32px', height: '32px', fontSize: '0.875rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <EntityLogo
                    name={role === 'super_admin' ? 'PlacementHub' : (session.user.tenantName || session.user.name)}
                    size="sm"
                    shape="rounded"
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {role === 'super_admin' ? 'PlacementHub SuperAdmin' : session.user.tenantName || session.user.name}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {role === 'employer' ? 'Corporate Partner' : role === 'student' ? 'Student Portal' : 'College Administration'}
                  </p>
                </div>
              </div>

              {role === 'college_admin' && (
                <>
                  <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Session:</span>
                    <select
                      className="form-input"
                      style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      defaultValue="2025-26"
                    >
                      <option>2024-25</option>
                      <option>2025-26</option>
                      <option>2026-27</option>
                    </select>
                  </div>
                </>
              )}

              {role === 'employer' && (
                <>
                  <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Campus:</span>
                    <Link
                      href="/dashboard/employer/select-campus"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.25rem 0.75rem', borderRadius: '4px',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        fontSize: '0.875rem', color: 'var(--text-primary)', textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {employerCampusLabel || 'Choose or request tie-up'}
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>▼</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="topbar-right" style={{ flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
            <DevScreenTag />
            {role === 'student' && (
              <Link
                href="/dashboard/student/reminders"
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                title="Reminders & email preview"
              >
                <Mail size={16} aria-hidden="true" /> Email
              </Link>
            )}
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            </button>

            <NotificationDropdown />

            <div className="dropdown" style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ color: 'var(--text-secondary)' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="page-content">
          {children}
        </main>
        <SessionAdBanner />
      </div>

      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
