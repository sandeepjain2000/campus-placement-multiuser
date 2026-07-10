'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Sun, Moon, Search, Bell } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import EntityLogo from '@/components/EntityLogo';
import { menuConfig, NAV_SECTION_STORAGE_KEY, ROLE_HOME_PATHS } from '@/config/dashboardMenu';
import { getDevScreenId } from '@/config/devScreenIds';
import { getNotificationIconTitle } from '@/lib/appVersion';
import { getRoleDisplayName } from '@/lib/utils';
import DevScreenTag from '@/components/DevScreenTag';

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

function getQuickActions(role, employerHasCampus) {
  if (role === 'employer') {
    return [
      {
        label: employerHasCampus ? 'Change campus' : 'Campus Partnerships',
        href: '/dashboard/employer/select-campus',
      },
      { label: 'Job postings', href: '/dashboard/employer/jobs' },
      { label: 'Placement drives', href: '/dashboard/employer/drives' },
      { label: 'Applications', href: '/dashboard/employer/applications' },
      { label: 'Alerts', href: '/dashboard/alerts' },
      { label: 'Feedback', href: '/dashboard/feedback' },
    ];
  }
  if (role === 'student') {
    return [
      { label: 'Browse drives', href: '/dashboard/student/drives' },
      { label: 'Internships', href: '/dashboard/student/internships' },
      { label: 'Projects', href: '/dashboard/student/projects' },
      { label: 'My applications', href: '/dashboard/student/applications' },
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
      { label: 'Colleges', href: '/dashboard/admin/colleges' },
      { label: 'Users', href: '/dashboard/admin/users' },
      { label: 'Employers', href: '/dashboard/admin/employers' },
      { label: 'Feedback inbox', href: '/dashboard/admin/feedback' },
      { label: 'Dashboard', href: '/dashboard/admin/overview' },
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
  const { theme, toggleTheme } = useTheme();
  const menu = menuConfig[role] || menuConfig.student;
  const homePath = ROLE_HOME_PATHS[role] || ROLE_HOME_PATHS.student;
  const [employerHasCampus, setEmployerHasCampus] = useState(() => {
    if (typeof window === 'undefined' || role !== 'employer') return true;
    return Boolean(sessionStorage.getItem('activeCampus'));
  });
  const [hubSearch, setHubSearch] = useState('');

  useEffect(() => {
    if (role !== 'employer') {
      setEmployerHasCampus(true);
      return;
    }
    const check = () => setEmployerHasCampus(Boolean(sessionStorage.getItem('activeCampus')));
    check();
    const onCampusPicked = () => check();
    window.addEventListener('placementhub-active-campus', onCampusPicked);
    window.addEventListener('focus', check);
    return () => {
      window.removeEventListener('placementhub-active-campus', onCampusPicked);
      window.removeEventListener('focus', check);
    };
  }, [role]);

  const quickActions = getQuickActions(role, employerHasCampus);
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
  const notificationTitle = getNotificationIconTitle();

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
          <div className="avatar avatar-sm" style={{ width: 32, height: 32, overflow: 'hidden' }}>
            <EntityLogo name={logoName} size="sm" shape="rounded" />
          </div>
          <div style={{ fontSize: '0.8125rem', textAlign: 'right', minWidth: 0, maxWidth: '9rem' }}>
            <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session?.user?.name}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{getRoleDisplayName(role)}</div>
          </div>
          <Link
            href="/dashboard/alerts"
            className="btn btn-ghost btn-icon notification-bell"
            title={notificationTitle}
            aria-label={notificationTitle}
          >
            <Bell size={18} aria-hidden="true" />
            <span className="notification-dot" aria-hidden />
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign out
          </button>
        </div>
      </header>

      <div className="dashboard-nav-hub-body">
        {role === 'employer' && !employerHasCampus && (
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
            <strong>No active campus</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Choose an <strong>approved</strong> campus to unlock recruiting data and posting. You can open any link
              below; pages that need a campus will prompt you.
            </p>
            <Link href="/dashboard/employer/select-campus" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
              Campus Partnerships →
            </Link>
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
    </div>
  );
}
