'use client';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
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
import ScreenSearchBar from '@/components/ScreenSearchBar';
import DocumentationHelpWidget from '@/components/DocumentationHelpWidget';
import { Moon, Sun, Menu, Mail, Home, PanelLeft, PanelLeftClose } from 'lucide-react';
import { getAcademicYearOptions, getCurrentAcademicYear } from '@/lib/academicYear';

const settingsFetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
  return json;
};

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    try {
      setSidebarHidden(localStorage.getItem('placementhub_sidebar_hidden') === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('placementhub_sidebar_hidden', sidebarHidden ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarHidden]);
  const [employerCampusLabel, setEmployerCampusLabel] = useState(null);
  const [academicYearOverride, setAcademicYearOverride] = useState(null);
  const academicYearOptions = getAcademicYearOptions(getCurrentAcademicYear(), 3);

  const { data: collegeSettings } = useSWR(
    session?.user?.role === 'college_admin' ? '/api/college/settings' : null,
    settingsFetcher,
  );

  const academicYear = useMemo(() => {
    if (academicYearOverride != null && academicYearOverride !== '') return academicYearOverride;
    if (session?.user?.role === 'college_admin') {
      const server = collegeSettings?.placementSeasonLabel?.trim();
      if (server) return server;
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('activeAcademicYear');
        if (saved) return saved;
      } catch {
        /* ignore */
      }
    }
    return getCurrentAcademicYear();
  }, [academicYearOverride, collegeSettings?.placementSeasonLabel, session?.user?.role]);

  useEffect(() => {
    try {
      sessionStorage.setItem('activeAcademicYear', academicYear);
      window.dispatchEvent(new Event('placementhub-academic-year'));
    } catch {
      /* ignore */
    }
  }, [academicYear]);

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

  const studentVerifyBanner =
    role === 'student' && session.user.studentPlacementVerified === false ? (
      <div
        className="card"
        style={{
          margin: isHub ? '1rem auto 0' : '0 0 1rem',
          maxWidth: isHub ? '56rem' : undefined,
          padding: '0.75rem 1rem',
          background: 'var(--amber-50, #fffbeb)',
          border: '1px solid var(--amber-200, #fde68a)',
          color: 'var(--amber-950, #451a03)',
          fontSize: '0.875rem',
        }}
      >
        Your college has not verified your student profile yet. You can use the portal, but some placement steps may stay blocked until an administrator
        approves you from the <strong>Students</strong> screen.
      </div>
    ) : null;

  if (isHub) {
    return (
      <>
        {studentVerifyBanner}
        {children}
      </>
    );
  }

  return (
    <div className={`dashboard-layout ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
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
                logoUrl={session.user.brandLogoUrl || null}
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
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              style={{ display: 'none' }}
              id="sidebar-toggle-desktop"
              onClick={() => setSidebarHidden((v) => !v)}
              title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
              aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarHidden ? <PanelLeft size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
            </button>
            <style jsx>{`
              @media (max-width: 768px) {
                #mobile-menu-toggle { display: flex !important; }
                #sidebar-toggle-desktop { display: none !important; }
              }
              @media (min-width: 769px) {
                #sidebar-toggle-desktop { display: inline-flex !important; align-items: center; justify-content: center; }
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
                    logoUrl={role === 'super_admin' ? session.user.avatar || null : session.user.brandLogoUrl || null}
                    size="sm"
                    shape="rounded"
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {role === 'super_admin'
                      ? 'PlacementHub SuperAdmin'
                      : (collegeSettings?.institution?.collegeName || '').trim() ||
                        session.user.tenantName ||
                        session.user.name}
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
                      value={academicYear}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setAcademicYearOverride(v);
                        try {
                          sessionStorage.setItem('activeAcademicYear', v);
                          window.dispatchEvent(new Event('placementhub-academic-year'));
                          const res = await fetch('/api/college/settings/placement-season', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ placementSeasonLabel: v }),
                          });
                          if (res.ok) await swrMutate('/api/college/settings');
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      {academicYearOptions.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
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
            <ScreenSearchBar />
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
          {studentVerifyBanner}
          {children}
        </main>
        <SessionAdBanner />
        <DocumentationHelpWidget />
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
