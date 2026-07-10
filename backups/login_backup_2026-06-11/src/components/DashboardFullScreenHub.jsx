'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Search } from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import DevScreenTag from '@/components/DevScreenTag';
import EntityLogo from '@/components/EntityLogo';
import { useResolvedBrandLogoUrl } from '@/hooks/useResolvedBrandLogoUrl';
import { getDashboardMenu, NAV_SECTION_STORAGE_KEY, ROLE_HOME_PATHS } from '@/config/dashboardMenu';
import { isAlumniStudent } from '@/lib/studentAlumni';
import { ALUMNI_BROWSE_JOBS_PATH, ALUMNI_MY_JOBS_PATH } from '@/lib/alumniRoutes';
import { EMPLOYER_ALUMNI_JOBS_PATH } from '@/lib/employerAlumniRoutes';
import { getDevScreenId } from '@/config/devScreenIds';
import { getRoleDisplayName } from '@/lib/utils';
import { DEFAULT_ENTITY_LOGO_URL } from '@/lib/clientAssetUrl';
import { readStoredActiveCampus, resolveEmployerActiveCampus } from '@/lib/employerActiveCampus';
// import OnboardingChecklist from '@/components/OnboardingChecklist';

function getHubPageTitle(session, role, menu) {
  if (role === 'super_admin') return 'Platform Administration';
  if (role === 'student') {
    const first = session?.user?.name?.split(' ')?.[0];
    return first ? `${first} — Dashboard` : 'Student Dashboard';
  }
  if (session?.user?.tenantName && (role === 'employer' || role === 'college_admin')) {
    return `${session.user.tenantName} Dashboard`;
  }
  return `${menu.title} Dashboard`;
}

function getQuickActions(role, employerHasCampus, isAlumni) {
  if (role === 'employer') {
    return [
      {
        label: employerHasCampus ? 'Change campus' : 'Campus Partnerships',
        href: '/dashboard/employer/select-campus',
      },
      { label: 'Alumni job postings', href: EMPLOYER_ALUMNI_JOBS_PATH },
      { label: 'Placement drives', href: '/dashboard/employer/drives' },
      { label: 'Applications', href: '/dashboard/employer/applications' },
      { label: 'Alerts', href: '/dashboard/alerts' },
      { label: 'Feedback', href: '/dashboard/feedback' },
    ];
  }
  if (role === 'student') {
    if (isAlumni) {
      return [
        { label: 'Browse alumni jobs', href: ALUMNI_BROWSE_JOBS_PATH },
        { label: 'My alumni jobs', href: ALUMNI_MY_JOBS_PATH },
        { label: 'Alerts', href: '/dashboard/alerts' },
        { label: 'My profile', href: '/dashboard/student/profile' },
      ];
    }
    return [
      { label: 'Browse drives', href: '/dashboard/student/drives' },
      { label: 'Internships', href: '/dashboard/student/applications/internships' },
      { label: 'Projects', href: '/dashboard/student/applications/projects' },
      { label: 'Calendar', href: '/dashboard/student/calendar' },
      { label: 'Alerts', href: '/dashboard/alerts' },
      { label: 'My profile', href: '/dashboard/student/profile' },
    ];
  }
  if (role === 'college_admin') {
    return [
      { label: 'Students', href: '/dashboard/college/students' },
      { label: 'Placement drives', href: '/dashboard/college/drives' },
      { label: 'Employers', href: '/dashboard/college/employers' },
      { label: 'Employer Partnership Requests', href: '/dashboard/college/employers/requests' },
      { label: 'Settings', href: '/dashboard/college/settings' },
      { label: 'Alerts', href: '/dashboard/alerts' },
    ];
  }
  if (role === 'super_admin') {
    return [
      { label: 'Onboard colleges & employers', href: '/dashboard/admin/pending-registrations' },
      { label: 'Colleges', href: '/dashboard/admin/colleges' },
      { label: 'Users', href: '/dashboard/admin/users' },
      { label: 'Employers', href: '/dashboard/admin/employers' },
      { label: 'Feedback inbox', href: '/dashboard/admin/feedback' },
      { label: 'Platform overview', href: '/dashboard/admin/overview' },
    ];
  }
  return [];
}

function syncNavSection(sectionId) {
  try {
    sessionStorage.setItem(NAV_SECTION_STORAGE_KEY, sectionId);
  } catch {
    /* ignore */
  }
}

/**
 * Full-screen dashboard hub (mega-menu): category columns with all links, quick actions, branded header.
 * Matches the multi-column hub layout (see globals .dashboard-nav-hub-*).
 */
export default function DashboardFullScreenHub({ role, session }) {
  const menu = getDashboardMenu(role, session?.user);
  const isAlumni = role === 'student' && isAlumniStudent(session?.user);
  const homePath = ROLE_HOME_PATHS[role] || ROLE_HOME_PATHS.student;
  const brandLogoUrl = useResolvedBrandLogoUrl();
  const [employerCampus, setEmployerCampus] = useState(null);
  const [employerCampusLoading, setEmployerCampusLoading] = useState(role === 'employer');
  const [employerApprovedCount, setEmployerApprovedCount] = useState(0);
  const [hubSearch, setHubSearch] = useState('');

  useEffect(() => {
    if (role !== 'employer') {
      setEmployerCampusLoading(false);
      return;
    }
    let mounted = true;

    const syncFromStorage = () => {
      const stored = readStoredActiveCampus();
      if (stored?.id) setEmployerCampus(stored);
    };

    const resolve = async () => {
      setEmployerCampusLoading(true);
      syncFromStorage();
      try {
        const { active, approvedCount } = await resolveEmployerActiveCampus();
        if (!mounted) return;
        setEmployerCampus(active);
        setEmployerApprovedCount(approvedCount);
      } finally {
        if (mounted) setEmployerCampusLoading(false);
      }
    };

    resolve();
    const onCampusPicked = () => {
      syncFromStorage();
      setEmployerApprovedCount((n) => Math.max(n, 1));
    };
    window.addEventListener('placementhub-active-campus', onCampusPicked);
    window.addEventListener('focus', syncFromStorage);
    return () => {
      mounted = false;
      window.removeEventListener('placementhub-active-campus', onCampusPicked);
      window.removeEventListener('focus', syncFromStorage);
    };
  }, [role]);

  const employerHasCampus = Boolean(employerCampus?.id);
  const employerNeedsPartnership = !employerCampusLoading && !employerHasCampus && employerApprovedCount === 0;

  const quickActions = getQuickActions(role, employerHasCampus, isAlumni);
  const hubFilter = useMemo(() => {
    const sections = menu?.sections;
    if (!Array.isArray(sections) || sections.length === 0) return null;
    const q = hubSearch.trim().toLowerCase();
    if (!q) return null;
    const match = (s) => String(s ?? '').toLowerCase().includes(q);
    const qa = quickActions.filter(
      (a) => match(a.label) || match(a.href) || match(getDevScreenId(a.href)),
    );
    const nextSections = sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            match(item.label) ||
            match(item.href) ||
            match(section.title) ||
            match(getDevScreenId(item.href)),
        ),
      }))
      .filter((section) => section.items.length > 0);
    return { quickActions: qa, sections: nextSections };
  }, [hubSearch, menu, quickActions]);

  if (!menu?.sections?.length) {
    return (
      <div style={{ padding: '2rem', minHeight: '50vh' }}>
        <p>Workspace menu could not be loaded. Please sign out and try again.</p>
      </div>
    );
  }

  const hubTitle = getHubPageTitle(session, role, menu);

  const logoName =
    role === 'super_admin' ? 'PlacementHub' : session?.user?.tenantName || session?.user?.name || 'PlacementHub';
  return (
    <div className="dashboard-nav-hub">
      <header className="dashboard-nav-hub-topbar">
        <div className="dashboard-nav-hub-topbar-left">
          <Link href={homePath} className="dashboard-nav-hub-brand">
            <div className="sidebar-logo-icon">P</div>
            <div>
              <div className="dashboard-nav-hub-brand-title">PlacementHub</div>
              <div className="dashboard-nav-hub-brand-sub">Connecting your placement community</div>
            </div>
          </Link>
        </div>
        <div className="dashboard-nav-hub-topbar-center">
          <h1 className="dashboard-nav-hub-page-title">{hubTitle}</h1>
        </div>
        <div className="dashboard-nav-hub-topbar-right" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <DevScreenTag />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '0.65rem',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="hub-search"
              type="search"
              className="dashboard-nav-hub-search form-input"
              placeholder="Search screens (e.g. drives, S-11)…"
              value={hubSearch}
              onChange={(e) => setHubSearch(e.target.value)}
              aria-label="Search dashboard destinations"
              title="Filter links by name, path, or screen tag (e.g. S-11)"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <EntityLogo
              name={logoName}
              logoUrl={brandLogoUrl}
              placeholderUrl={
                role === 'employer' || role === 'college_admin' ? DEFAULT_ENTITY_LOGO_URL : null
              }
              size="sm"
              shape="rounded"
            />
          </div>
          <div style={{ fontSize: '0.8125rem', textAlign: 'right', minWidth: 0, maxWidth: '9rem' }}>
            <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session?.user?.name}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{getRoleDisplayName(role)}</div>
          </div>
          <NotificationDropdown />
          <ThemeToggleButton />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => signOut({ callbackUrl: '/login?force=1' })}>
            Sign out
          </button>
        </div>
      </header>

      <div className="dashboard-nav-hub-body">
        {/* OnboardingChecklist moved to dedicated menu item */}
        {role === 'employer' && employerNeedsPartnership && (
          <div
            className="wireframe-banner"
            style={{
              marginBottom: '1rem',
              display: 'block',
              background: 'rgba(99, 102, 241, 0.08)',
              borderStyle: 'solid',
              borderColor: 'var(--primary-200)',
            }}
            role="status"
          >
            <strong>No campus partnership yet</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Request an <strong>approved</strong> campus tie-up to unlock campus-scoped recruiting views. You can still
              open internships and job postings below once a college approves your partnership.
            </p>
            <Link href="/dashboard/employer/select-campus" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
              Campus Partnerships →
            </Link>
          </div>
        )}
        {role === 'employer' && employerHasCampus && (
          <div
            className="wireframe-banner"
            style={{
              marginBottom: '1rem',
              display: 'block',
              background: 'var(--bg-secondary)',
              borderStyle: 'solid',
              borderColor: 'var(--border-default)',
            }}
            role="status"
          >
            <strong>Active campus: {employerCampus.name}</strong>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Recruiting data and drives use this partnership.
              {employerApprovedCount > 1 ? ` ${employerApprovedCount} approved campuses — ` : ' '}
              <Link href="/dashboard/employer/select-campus" style={{ fontWeight: 600 }}>
                {employerApprovedCount > 1 ? 'switch campus' : 'change campus'}
              </Link>
              .
            </p>
          </div>
        )}

        <p className="dashboard-nav-hub-intro">
          Open any destination below. The sidebar on inner pages shows only that category; use <strong>Home</strong> in
          the top bar to return here.
        </p>

        {(hubFilter ? hubFilter.quickActions : quickActions).length > 0 && (
          <div className="dashboard-nav-hub-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(hubFilter ? hubFilter.quickActions : quickActions).map((a) => (
              <Link key={`${a.label}-${a.href}`} href={a.href} className="dashboard-nav-hub-quick">
                {a.label}
              </Link>
            ))}
          </div>
        )}

        {hubFilter && hubFilter.sections.length === 0 && hubFilter.quickActions.length === 0 && (
          <p className="text-secondary" style={{ marginTop: '0.75rem' }}>
            No destinations match “{hubSearch.trim()}”. Try a shorter phrase or a screen tag like <code>S-11</code>.
          </p>
        )}

        <div className="dashboard-nav-hub-grid">
          {(hubFilter ? hubFilter.sections : menu.sections).map((section) => (
            <div key={section.id} className="dashboard-nav-hub-column">
              <h2 className="dashboard-nav-hub-category-title">{section.title}</h2>
              <ul className="dashboard-nav-hub-list">
                {section.items.map((item) => (
                  <li key={`${section.id}-${item.href}`}>
                    <Link
                      href={item.href}
                      className="dashboard-nav-hub-link"
                      onClick={() => syncNavSection(section.id)}
                    >
                      <span className="dashboard-nav-hub-link-icon" aria-hidden="true">
                        <item.icon size={16} strokeWidth={1.75} />
                      </span>
                      {item.label}
                      {hubSearch.trim() ? (
                        <span className="text-xs text-tertiary" style={{ marginLeft: '0.35rem' }}>
                          ({getDevScreenId(item.href) || '—'})
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .dashboard-nav-hub-actions {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
