'use client';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import Link from 'next/link';
import { signOut } from '@/lib/clientSignOut';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import { getInitials, getRoleDisplayName } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import SessionAdBanner from '@/components/SessionAdBanner';
import PageLoading from '@/components/PageLoading';
import {
  getDashboardMenu,
  ROLE_HOME_PATHS,
  getRoleProfilePath,
  getRoleProfileLabel,
  NAV_SECTION_STORAGE_KEY,
  findSectionIdByPath,
  isSidebarItemActive,
  isSidebarItemActiveInMenu,
  isRoleDashboardHome,
  getDashboardNavItemKey,
} from '@/config/dashboardMenu';
import NotificationDropdown from '@/components/NotificationDropdown';
import DevScreenTag from '@/components/DevScreenTag';
import ScreenSearchBar from '@/components/ScreenSearchBar';
import DocumentationHelpWidget from '@/components/DocumentationHelpWidget';
import { Menu, Mail, Home, PanelLeft, PanelLeftClose } from 'lucide-react';
import { getAcademicYearOptions, getCurrentAcademicYear } from '@/lib/academicYear';
import {
  ACTIVE_ACADEMIC_YEAR_KEY,
  writeActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import {
  readEmployerAcademicYearContext,
  writeEmployerAcademicYearContext,
} from '@/lib/employerAcademicYearContext';
import { resolveBrandLogoUrl } from '@/lib/resolveBrandLogoUrl';
import { DEFAULT_ENTITY_LOGO_URL } from '@/lib/clientAssetUrl';
import { isCollegeStaffRole } from '@/lib/collegeAccess';
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary';

const settingsFetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
  return json;
};

export default function DashboardLayout({ children }) {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const collapsed =
        localStorage.getItem('placementhub_sidebar_collapsed') === '1' ||
        localStorage.getItem('placementhub_sidebar_hidden') === '1';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(collapsed);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('placementhub_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);
  const [employerCampusLabel, setEmployerCampusLabel] = useState(null);
  const [employerActiveCampus, setEmployerActiveCampus] = useState(null);
  const [employerAcademicYearOverride, setEmployerAcademicYearOverride] = useState(null);
  const [academicYearOverride, setAcademicYearOverride] = useState(null);
  const { data: collegeSettings, isLoading: collegeSettingsLoading } = useSWR(
    session?.user?.role === 'college_admin' ? '/api/college/settings' : null,
    settingsFetcher,
  );
  const { data: employerProfileData, isLoading: employerProfileLoading } = useSWR(
    session?.user?.role === 'employer' ? '/api/employer/profile' : null,
    settingsFetcher,
  );
  const { data: academicYearsBundle } = useSWR(
    isCollegeStaffRole(session?.user?.role) ? '/api/college/academic-years' : null,
    settingsFetcher,
  );
  const { data: employerAcademicYearsBundle } = useSWR(
    session?.user?.role === 'employer' && employerActiveCampus?.id
      ? `/api/employer/academic-years?campusId=${encodeURIComponent(employerActiveCampus.id)}`
      : null,
    settingsFetcher,
  );
  const fallbackAcademicYearOptions = getAcademicYearOptions(getCurrentAcademicYear(), 3);
  const academicYearOptions = useMemo(() => {
    if (!isCollegeStaffRole(session?.user?.role)) return fallbackAcademicYearOptions;
    const fromTenant = Array.isArray(academicYearsBundle?.years)
      ? academicYearsBundle.years.map((y) => y.label).filter(Boolean)
      : [];
    if (fromTenant.length) return fromTenant;
    const fromServer = Array.isArray(collegeSettings?.academicYearsWithData)
      ? collegeSettings.academicYearsWithData.filter((v) => typeof v === 'string' && v.trim())
      : [];
    return fromServer.length ? fromServer : fallbackAcademicYearOptions;
  }, [
    academicYearsBundle?.years,
    collegeSettings?.academicYearsWithData,
    fallbackAcademicYearOptions,
    session?.user?.role,
  ]);

  const systemDefaultAcademicYear = useMemo(() => {
    const fromTenantCalendar = academicYearsBundle?.current?.label?.trim();
    if (fromTenantCalendar) return fromTenantCalendar;
    return getCurrentAcademicYear();
  }, [academicYearsBundle?.current?.label]);

  const employerAcademicYearOptions = useMemo(() => {
    const fromTenant = Array.isArray(employerAcademicYearsBundle?.years)
      ? employerAcademicYearsBundle.years.map((y) => y.label).filter(Boolean)
      : [];
    return fromTenant.length ? fromTenant : fallbackAcademicYearOptions;
  }, [employerAcademicYearsBundle?.years, fallbackAcademicYearOptions]);

  const employerDefaultAcademicYear = useMemo(() => {
    const fromTenantCalendar = employerAcademicYearsBundle?.current?.label?.trim();
    if (fromTenantCalendar) return fromTenantCalendar;
    return getCurrentAcademicYear();
  }, [employerAcademicYearsBundle?.current?.label]);

  const employerAcademicYear = useMemo(() => {
    if (employerAcademicYearOverride != null && employerAcademicYearOverride !== '') {
      return employerAcademicYearOverride;
    }
    if (typeof window !== 'undefined' && employerActiveCampus?.id) {
      try {
        const stored = readEmployerAcademicYearContext(employerActiveCampus.id);
        if (stored?.label && employerAcademicYearOptions.includes(stored.label)) {
          return stored.label;
        }
      } catch {
        /* ignore */
      }
    }
    return employerDefaultAcademicYear;
  }, [
    employerAcademicYearOverride,
    employerActiveCampus?.id,
    employerAcademicYearOptions,
    employerDefaultAcademicYear,
  ]);

  useEffect(() => {
    if (session?.user?.role !== 'employer' || !employerActiveCampus?.id) return;
    const match = employerAcademicYearsBundle?.years?.find((y) => y.label === employerAcademicYear);
    writeEmployerAcademicYearContext(employerActiveCampus.id, {
      id: match?.id || null,
      label: employerAcademicYear,
    });
  }, [
    session?.user?.role,
    employerActiveCampus?.id,
    employerAcademicYear,
    employerAcademicYearsBundle?.years,
  ]);

  useEffect(() => {
    if (session?.user?.role !== 'employer' || !employerActiveCampus?.id) return;
    setEmployerAcademicYearOverride(null);
  }, [employerActiveCampus?.id, session?.user?.role]);

  const academicYear = useMemo(() => {
    if (academicYearOverride != null && academicYearOverride !== '') return academicYearOverride;
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('activeAcademicYear')?.trim();
        if (saved && academicYearOptions.includes(saved)) return saved;
      } catch {
        /* ignore */
      }
    }
    return systemDefaultAcademicYear;
  }, [academicYearOverride, academicYearOptions, systemDefaultAcademicYear]);

  useEffect(() => {
    if (session?.user?.role !== 'college_admin' || !session?.user?.id) return;
    const storageKey = 'placementhub_college_admin_id';
    try {
      const prev = sessionStorage.getItem(storageKey);
      if (prev && prev !== session.user.id) {
        sessionStorage.removeItem(ACTIVE_ACADEMIC_YEAR_KEY);
        sessionStorage.removeItem('activeAcademicYear');
        setAcademicYearOverride(null);
      }
      sessionStorage.setItem(storageKey, session.user.id);
    } catch {
      /* ignore */
    }
  }, [session?.user?.id, session?.user?.role]);

  useEffect(() => {
    try {
      sessionStorage.setItem('activeAcademicYear', academicYear);
      const match = academicYearsBundle?.years?.find((y) => y.label === academicYear);
      writeActiveAcademicYearContext({
        id: match?.id || null,
        label: academicYear,
      });
    } catch {
      /* ignore */
    }
  }, [academicYear, academicYearsBundle?.years]);

  useEffect(() => {
    if (session?.user?.role !== 'employer') return;
    const readCampus = () => {
      try {
        const raw = sessionStorage.getItem('activeCampus');
        if (!raw) {
          setEmployerActiveCampus(null);
          setEmployerCampusLabel(null);
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed?.id) {
          setEmployerActiveCampus(parsed);
          setEmployerCampusLabel(parsed.name || null);
        } else {
          setEmployerActiveCampus(null);
          setEmployerCampusLabel(null);
        }
      } catch {
        setEmployerActiveCampus(null);
        setEmployerCampusLabel(null);
      }
    };
    readCampus();
    window.addEventListener('placementhub-active-campus', readCampus);
    return () => window.removeEventListener('placementhub-active-campus', readCampus);
  }, [session?.user?.role]);

  useEffect(() => {
    if (!session?.user?.role) return;
    const menu = getDashboardMenu(session.user.role, session.user);
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

  const role = session?.user?.role;
  const brandProfileLoaded =
    role === 'employer'
      ? !employerProfileLoading
      : role === 'college_admin'
        ? !collegeSettingsLoading
        : true;
  const resolvedBrandLogoUrl = useMemo(
    () =>
      session?.user
        ? resolveBrandLogoUrl({
            role,
            employerProfile: employerProfileData?.profile,
            collegeSettings,
            sessionUser: session.user,
            profileLoaded: brandProfileLoaded,
          })
        : null,
    [session?.user, role, employerProfileData?.profile, collegeSettings, brandProfileLoaded],
  );

  useEffect(() => {
    if (!session?.user || !brandProfileLoaded || !resolvedBrandLogoUrl) return;
    if (role !== 'employer' && role !== 'college_admin') return;
    if (session.user.brandLogoUrl === resolvedBrandLogoUrl) return;
    updateSession({ brandLogoUrl: resolvedBrandLogoUrl });
  }, [session?.user, brandProfileLoaded, resolvedBrandLogoUrl, role, updateSession]);

  if (status === 'loading') {
    return <PageLoading message="Signing you in…" delayMs={0} />;
  }

  if (!session) return null;

  const menu = getDashboardMenu(role, session.user);
  const sectionId = findSectionIdByPath(menu, pathname);
  const activeSection = menu.sections.find((s) => s.id === sectionId) || menu.sections[0];
  const homePath = ROLE_HOME_PATHS[role] || ROLE_HOME_PATHS.student;
  const employerDisplayName =
    role === 'employer'
      ? (employerProfileData?.profile?.company_name && String(employerProfileData.profile.company_name).trim()) ||
        session.user.tenantName ||
        session.user.name
      : null;
  const isHub = isRoleDashboardHome(pathname, role);
  /** Super admin: show every workspace link in the sidebar (not only the current section). */
  const showFullSidebarNav = role === 'super_admin';

  const studentVerifyBanner =
    role === 'student' && session.user.studentPlacementVerified === false ? (
      <div
        className="card banner-verify-pending"
        style={{
          margin: isHub ? '1rem auto 0' : '0 0 1rem',
          maxWidth: isHub ? '56rem' : undefined,
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
        }}
      >
        Your college has not verified your student profile yet. You can use the portal, but some placement steps may stay blocked until an administrator
        approves you from the <strong>Students</strong> screen.
      </div>
    ) : null;

  const committeeReadOnlyBanner =
    role === 'placement_committee' ? (
      <div
        className="card"
        style={{
          margin: isHub ? '1rem auto 0' : '0 0 1rem',
          maxWidth: isHub ? '56rem' : undefined,
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          borderColor: 'var(--border-default)',
          background: 'var(--bg-secondary)',
        }}
      >
        <strong>Read-only placement committee view.</strong> You can browse students and applications for your college. Adding or editing records requires a college administrator.
      </div>
    ) : null;

  if (isHub) {
    return (
      <>
        {studentVerifyBanner}
        {committeeReadOnlyBanner}
        {children}
      </>
    );
  }

  const renderSidebarNavItem = (item, activeFn) => {
    const key = getDashboardNavItemKey(item);
    const icon = (
      <span className="sidebar-link-icon">
        <item.icon size={18} aria-hidden="true" />
      </span>
    );
    const label = <span className="sidebar-link-label">{item.label}</span>;

    if (item.disabled) {
      return (
        <span
          key={key}
          className="sidebar-link sidebar-link--disabled"
          title={item.label}
          aria-disabled="true"
        >
          {icon}
          {label}
        </span>
      );
    }

    const active = activeFn(item.href);
    return (
      <Link
        key={key}
        href={item.href}
        className={`sidebar-link ${active ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? 'page' : undefined}
        title={item.label}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
        aria-expanded={!sidebarCollapsed}
      >
        <div className="sidebar-toolbar">
          <Link href={homePath} className="sidebar-logo">
            <div className="sidebar-logo-icon">P</div>
            <span className="sidebar-logo-label">PlacementHub</span>
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-icon sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {sidebarCollapsed ? <PanelLeft size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link
            href={homePath}
            className={`sidebar-link ${pathname === homePath ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            aria-current={pathname === homePath ? 'page' : undefined}
            title="Home"
          >
            <span className="sidebar-link-icon">
              <Home size={18} aria-hidden="true" />
            </span>
            <span className="sidebar-link-label">Home</span>
          </Link>
          {showFullSidebarNav ? (
            menu.sections.map((section) => (
              <div key={section.id}>
                <div className="sidebar-section-title">{section.title}</div>
                {section.items.map((item) =>
                  renderSidebarNavItem(item, (href) => isSidebarItemActiveInMenu(href, menu, pathname)),
                )}
              </div>
            ))
          ) : (
            <>
              <div className="sidebar-section-title">{activeSection.title}</div>
              {activeSection.items.map((item) =>
                renderSidebarNavItem(item, (href) => isSidebarItemActive(href, activeSection, pathname)),
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <Link
            href={getRoleProfilePath(role)}
            className="dashboard-identity-link"
            onClick={() => setMobileOpen(false)}
            aria-label={`${getRoleProfileLabel(role)} — ${session.user.name}`}
            title={getRoleProfileLabel(role)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
              {(role === 'employer' || role === 'college_admin') ? (
                <EntityLogo
                  name={
                    role === 'employer'
                      ? employerDisplayName || session.user.name
                      : (collegeSettings?.institution?.collegeName || session.user.tenantName || session.user.name)
                  }
                  logoUrl={resolvedBrandLogoUrl}
                  placeholderUrl={DEFAULT_ENTITY_LOGO_URL}
                  size="sm"
                  shape="rounded"
                />
              ) : (
                <div className="avatar avatar-md">
                  {getInitials(session.user.name)}
                </div>
              )}
              <div className="sidebar-footer-meta" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.user.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {getRoleDisplayName(role)}
                </div>
              </div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="btn btn-ghost btn-icon dashboard-mobile-menu-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} aria-hidden="true" />
            </button>

            <div
              style={{
                marginLeft: '0.5rem',
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
              <div className="topbar-divider-mobile-hide" style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, maxWidth: 'min(100%, 22rem)' }}>
                <EntityLogo
                  name={
                    role === 'super_admin'
                      ? 'PlacementHub'
                      : role === 'employer'
                        ? employerDisplayName || session.user.name
                        : (collegeSettings?.institution?.collegeName || '').trim() ||
                          session.user.tenantName ||
                          session.user.name
                  }
                  logoUrl={resolvedBrandLogoUrl}
                  placeholderUrl={
                    role === 'employer' || role === 'college_admin' ? DEFAULT_ENTITY_LOGO_URL : null
                  }
                  size="sm"
                  shape="rounded"
                />
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {role === 'super_admin'
                      ? 'PlacementHub SuperAdmin'
                      : role === 'employer'
                        ? employerDisplayName
                        : (collegeSettings?.institution?.collegeName || '').trim() ||
                          session.user.tenantName ||
                          session.user.name}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {role === 'employer' ? 'Corporate Partner' : role === 'student' ? 'Student Portal' : 'College Administration'}
                  </p>
                </div>
              </div>

              {role === 'employer' && (
                <>
                  <div className="topbar-divider-mobile-hide" style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', flexShrink: 0 }}>Campus:</span>
                    <Link
                      href="/dashboard/employer/select-campus"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        maxWidth: '14rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title="View campus partnerships (all approved campuses are in scope)"
                    >
                      All campuses
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>▼</span>
                    </Link>
                  </div>
                  <div className="topbar-divider-mobile-hide" style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />
                  <div className="topbar-academic-year-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', flexShrink: 0 }}>Academic Year:</span>
                    <select
                      className="form-input"
                      aria-label="Academic Year"
                      style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem', maxWidth: '9rem', opacity: 0.65 }}
                      value={employerAcademicYear}
                      disabled
                      title="Not used for employer login — data includes all campuses and seasons"
                    >
                      {employerAcademicYearOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {(role === 'college_admin' || role === 'placement_committee') && (
                <>
                  <div className="topbar-divider-mobile-hide" style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />
                  <div className="topbar-academic-year-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Academic Year:</span>
                    <select
                      className="form-input"
                      aria-label="Academic Year"
                      style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem', opacity: 0.65, cursor: 'not-allowed' }}
                      value={academicYear}
                      disabled
                      title="Academic year switching is not active yet — display only"
                    >
                      <option value={academicYear}>{academicYear}</option>
                    </select>
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
            <ThemeToggleButton />

            <NotificationDropdown />

            <div className="dropdown" style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => signOut({ callbackUrl: '/login?force=1' })}
                style={{ color: 'var(--text-secondary)' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="page-content">
          {studentVerifyBanner}
          {committeeReadOnlyBanner}
          <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
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
