'use client';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import Link from 'next/link';
import { signOut } from '@/lib/clientSignOut';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import { cn, getInitials, getRoleDisplayName } from '@/lib/utils';
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
import { Menu, Mail, Home, PanelLeft, PanelLeftClose, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isCollegeStaffRole } from '@/lib/collegeAccess';
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary';
import AdminFilterSelect from '@/components/AdminFilterSelect';

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
      <Alert className={cn('mb-4', isHub && 'mx-auto mt-4 max-w-4xl')}>
        <AlertTitle>Profile verification pending</AlertTitle>
        <AlertDescription>
          Your college has not marked your profile as <strong>Verified</strong> yet. You can still apply and use the
          portal — this badge is informational for employers and does not block hiring. After you edit your profile or
          upload a CV, college or placement committee staff need to re-verify you from the <strong>Students</strong>{' '}
          screen.
        </AlertDescription>
      </Alert>
    ) : null;

  const committeeReadOnlyBanner =
    role === 'placement_committee' ? (
      <Alert className={cn('mb-4', isHub && 'mx-auto mt-4 max-w-4xl')}>
        <AlertTitle>Read-only placement committee view</AlertTitle>
        <AlertDescription>
          You can browse students and applications for your college. Adding or editing records requires a college
          administrator.
        </AlertDescription>
      </Alert>
    ) : null;

  const renderSidebarNavItem = (item, activeFn) => {
    const key = getDashboardNavItemKey(item);
    const icon = (
      <span className="flex size-5 shrink-0 items-center justify-center">
        <item.icon aria-hidden="true" />
      </span>
    );
    const label = (
      <span className={cn('min-w-0 flex-1 truncate text-left', sidebarCollapsed && 'md:hidden')}>{item.label}</span>
    );

    if (item.disabled) {
      return (
        <span
          key={key}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/50 opacity-60"
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
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <div className="dashboard-layout flex min-h-svh w-full bg-background text-foreground">
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
        <div className="flex h-16 shrink-0 items-center gap-2 px-2">
          <Link
            href={homePath}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-1.5 outline-none',
              'hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              sidebarCollapsed && 'md:justify-center',
            )}
            onClick={() => {
              try {
                window.dispatchEvent(new Event('placementhub-clear-search'));
              } catch {
                /* ignore */
              }
              setMobileOpen(false);
            }}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-xs">
              P
            </div>
            <div className={cn('min-w-0 flex-1', sidebarCollapsed && 'md:hidden')}>
              <div className="truncate text-sm font-semibold">PlacementHub</div>
              <div className="truncate text-xs text-sidebar-foreground/60">Career workspace</div>
            </div>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn('shrink-0 max-md:hidden', sidebarCollapsed && 'md:hidden')}
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
              <Home aria-hidden="true" />
            </span>
            <span className={cn('min-w-0 flex-1 truncate', sidebarCollapsed && 'md:hidden')}>Home</span>
          </Link>
          {showFullSidebarNav ? (
            menu.sections.map((section) => (
              <div className="flex flex-col gap-1" key={section.id}>
                <div
                  className={cn(
                    'px-2 pb-1 pt-4 text-[0.6875rem] font-medium uppercase tracking-wider text-sidebar-foreground/50',
                    sidebarCollapsed && 'md:sr-only',
                  )}
                >
                  {section.title}
                </div>
                {section.items.map((item) =>
                  renderSidebarNavItem(item, (href) => isSidebarItemActiveInMenu(href, menu, pathname)),
                )}
              </div>
            ))
          ) : (
            <>
              <div
                className={cn(
                  'px-2 pb-1 pt-4 text-[0.6875rem] font-medium uppercase tracking-wider text-sidebar-foreground/50',
                  sidebarCollapsed && 'md:sr-only',
                )}
              >
                {activeSection.title}
              </div>
              {activeSection.items.map((item) =>
                renderSidebarNavItem(item, (href) => isSidebarItemActive(href, activeSection, pathname)),
              )}
            </>
          )}
        </nav>

        <Separator />
        <div className="shrink-0 p-2">
          <Link
            href={getRoleProfilePath(role)}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-md p-2 outline-none transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              sidebarCollapsed && 'md:justify-center md:px-0',
            )}
            onClick={(e) => {
              setMobileOpen(false);
              const dest = getRoleProfilePath(role);
              if (!dest) {
                e.preventDefault();
                return;
              }
              // Use client navigation explicitly so the footer identity card always works
              e.preventDefault();
              if (pathname === dest) {
                router.refresh();
              } else {
                router.push(dest);
              }
            }}
            aria-label={`${getRoleProfileLabel(role)} — ${session.user.name}`}
            title={getRoleProfileLabel(role)}
          >
            {role === 'employer' || role === 'college_admin' ? (
              <EntityLogo
                name={
                  role === 'employer'
                    ? employerDisplayName || session.user.name
                    : collegeSettings?.institution?.collegeName || session.user.tenantName || session.user.name
                }
                logoUrl={resolvedBrandLogoUrl}
                placeholderUrl={DEFAULT_ENTITY_LOGO_URL}
                size="sm"
                shape="rounded"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(session.user.name)}
              </div>
            )}
            <div className={cn('min-w-0 flex-1', sidebarCollapsed && 'md:hidden')}>
              <div className="truncate text-sm font-semibold">{session.user.name}</div>
              <div className="truncate text-xs text-sidebar-foreground/60">
                {getRoleDisplayName(role, { isAlumni: Boolean(session.user?.isAlumni) })}
              </div>
            </div>
            <ChevronRight
              aria-hidden="true"
              className={cn('shrink-0 text-sidebar-foreground/50', sidebarCollapsed && 'md:hidden')}
            />
          </Link>
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
          <div className="topbar-left flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="dashboard-mobile-menu-toggle md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="dashboard-mobile-landing-link"
              render={<Link href="/" />}
              nativeButton={false}
              title="Back to landing page"
              aria-label="Back to landing page"
            >
              <ArrowLeft data-icon="inline-start" />
              Landing
            </Button>
            {sidebarCollapsed && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="hidden md:inline-flex"
                onClick={() => setSidebarCollapsed(false)}
                title="Expand menu"
                aria-label="Expand menu"
              >
                <PanelLeft aria-hidden="true" />
              </Button>
            )}
            <Separator orientation="vertical" className="mx-1 hidden h-5! data-vertical:self-center sm:block" />
            <div className="flex min-w-0 items-center gap-2.5">
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
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold leading-tight sm:text-base">
                    {role === 'super_admin'
                      ? 'PlacementHub SuperAdmin'
                      : role === 'employer'
                        ? employerDisplayName
                        : (collegeSettings?.institution?.collegeName || '').trim() ||
                          session.user.tenantName ||
                          session.user.name}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {role === 'employer'
                      ? 'Corporate Partner'
                      : role === 'student'
                        ? session.user?.isAlumni
                          ? 'Alumni Portal'
                          : 'Student Portal'
                        : 'College Administration'}
                  </p>
                </div>
            </div>

              {role === 'employer' && (
                <div className="ml-2 hidden min-w-0 items-center gap-2 xl:flex">
                  <Separator orientation="vertical" className="mr-1 h-5! data-vertical:self-center" />
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Campus
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-w-56"
                    render={<Link href="/dashboard/employer/select-campus" />}
                    nativeButton={false}
                    title="View campus partnerships (all approved campuses are in scope)"
                  >
                    <span className="truncate">
                      All campuses
                    </span>
                  </Button>
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Academic year
                  </span>
                    <AdminFilterSelect
                      className="h-8 max-w-36 text-muted-foreground"
                      aria-label="Academic Year"
                      value={employerAcademicYear}
                      disabled
                      emptyMapsToAll={false}
                      onValueChange={() => {}}
                      items={employerAcademicYearOptions.map((opt) => ({ label: opt, value: opt }))}
                    />
                </div>
              )}

              {(role === 'college_admin' || role === 'placement_committee') && (
                <div className="ml-2 hidden items-center gap-2 xl:flex">
                  <Separator orientation="vertical" className="mr-1 h-5! data-vertical:self-center" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Academic year</span>
                    <AdminFilterSelect
                      className="h-8 text-muted-foreground"
                      aria-label="Academic Year"
                      value={academicYear}
                      disabled
                      emptyMapsToAll={false}
                      onValueChange={() => {}}
                      items={[{ label: academicYear, value: academicYear }]}
                    />
                </div>
              )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <ScreenSearchBar />
            <DevScreenTag />
            {role === 'student' && (
              <Button
                variant="ghost"
                size="sm"
                className="topbar-label-hide-mobile font-semibold"
                render={<Link href="/dashboard/student/reminders" />}
                nativeButton={false}
                title="Reminders & email preview"
                aria-label="Email reminders"
              >
                <Mail data-icon="inline-start" /> Email
              </Button>
            )}
            <ThemeToggleButton className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-medium outline-none transition-all hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />

            <NotificationDropdown />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="topbar-label-hide-mobile text-muted-foreground"
                onClick={() => signOut({ callbackUrl: '/login?force=1' })}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut data-icon="inline-start" />
                Sign Out
              </Button>
          </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 bg-background px-4 py-6 sm:px-6">
          {!isHub && studentVerifyBanner}
          {!isHub && committeeReadOnlyBanner}
          <DashboardErrorBoundary>
            {isHub && studentVerifyBanner}
            {isHub && committeeReadOnlyBanner}
            {children}
          </DashboardErrorBoundary>
        </main>
        <SessionAdBanner />
        <DocumentationHelpWidget />
        <footer className="border-t bg-background">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-1 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span>© {new Date().getFullYear()} PlacementHub</span>
            <span>{getRoleDisplayName(role, { isAlumni: Boolean(session.user?.isAlumni) })} workspace</span>
          </div>
        </footer>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
    </div>
  );
}
