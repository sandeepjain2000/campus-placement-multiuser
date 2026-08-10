'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  getDashboardMenu,
  NAV_SECTION_STORAGE_KEY,
  getDashboardNavItemKey,
} from '@/config/dashboardMenu';
import { isAlumniStudent } from '@/lib/studentAlumni';
import { ALUMNI_BROWSE_JOBS_PATH, ALUMNI_MY_JOBS_PATH } from '@/lib/alumniRoutes';
import { EMPLOYER_ALUMNI_JOBS_PATH } from '@/lib/employerAlumniRoutes';
import { getDevScreenId } from '@/config/devScreenIds';
import { readStoredActiveCampus, resolveEmployerActiveCampus } from '@/lib/employerActiveCampus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

function getHubPageTitle(session, role, menu) {
  if (role === 'super_admin') return 'Platform Administration';
  if (role === 'student') {
    const first = session?.user?.name?.split(' ')?.[0];
    return first ? `${first} — Home` : 'Student Home';
  }
  if (session?.user?.tenantName && (role === 'employer' || role === 'college_admin' || role === 'placement_committee')) {
    return `${session.user.tenantName} Home`;
  }
  return `${menu.title} Home`;
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
      { label: 'Marketplace', href: '/dashboard/employer/marketplace' },
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
      { label: 'My internships', href: '/dashboard/student/applications/internships' },
      { label: 'Mentor Connect', href: '/dashboard/student/mentorship-requests' },
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
      { label: 'Marketplace', href: '/dashboard/college/marketplace' },
      { label: 'Settings', href: '/dashboard/college/settings' },
      { label: 'Alerts', href: '/dashboard/alerts' },
    ];
  }
  if (role === 'placement_committee') {
    return [
      { label: 'Students', href: '/dashboard/college/students' },
      { label: 'Applications', href: '/dashboard/college/applications' },
      { label: 'Alerts', href: '/dashboard/alerts' },
      { label: 'Feedback', href: '/dashboard/feedback' },
    ];
  }
  if (role === 'super_admin') {
    return [
      { label: 'Onboard colleges & employers', href: '/dashboard/admin/pending-registrations' },
      { label: 'Colleges', href: '/dashboard/admin/colleges' },
      { label: 'Marketplace', href: '/dashboard/admin/marketplace' },
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
 * Role Home hub: category Cards + quick actions.
 * Renders inside `dashboard/layout.js` shell (sidebar/topbar) — do not duplicate brand/sign-out chrome here.
 * Menu data remains role-scoped via getDashboardMenu(role).
 */
export default function DashboardFullScreenHub({ role, session }) {
  const menu = getDashboardMenu(role, session?.user);
  const isAlumni = role === 'student' && isAlumniStudent(session?.user);
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
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-muted-foreground m-0 text-sm">
          Workspace menu could not be loaded. Please sign out and try again.
        </p>
      </div>
    );
  }

  const hubTitle = getHubPageTitle(session, role, menu);
  const visibleQuickActions = hubFilter ? hubFilter.quickActions : quickActions;
  const visibleSections = hubFilter ? hubFilter.sections : menu.sections;

  return (
    <div className="flex flex-col gap-4">
      {/*
        AdminCN chrome: title + description LEFT, search RIGHT.
        Do not use Tailwind `flex-col` + `sm:flex-row` here — globals.css still
        defines unconditional `.flex-col { flex-direction: column }`, which wins
        over `sm:flex-row` and leaves `sm:items-end` stacking this block on the right.
      */}
      <div className="ph-hub-page-header">
        <div className="ph-hub-page-header__title min-w-0 flex-1">
          <h1 className="dashboard-nav-hub-page-title text-foreground m-0 text-left text-2xl font-semibold tracking-tight">{hubTitle}</h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-left text-sm leading-snug">
            Open any destination below. The sidebar on inner pages shows only that category; use <strong>Home</strong>{' '}
            in the sidebar to return here.
          </p>
        </div>
        <InputGroup className="ph-hub-page-header__search w-full max-w-sm shrink-0">
          <InputGroupAddon align="inline-start">
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id="hub-search"
            type="search"
            placeholder="Search screens (e.g. drives, S-11)…"
            value={hubSearch}
            onChange={(e) => setHubSearch(e.target.value)}
            aria-label="Search dashboard destinations"
            title="Filter links by name, path, or screen tag (e.g. S-11)"
          />
        </InputGroup>
      </div>

      {role === 'employer' && employerNeedsPartnership && (
        <Alert>
          <AlertTitle>No campus partnership yet</AlertTitle>
          <AlertDescription>
            Request an <strong>approved</strong> campus tie-up to unlock campus-scoped recruiting views. You can still
            open internships and job postings below once a college approves your partnership.
          </AlertDescription>
          <div className="col-start-2 mt-3">
            <Button render={<Link href="/dashboard/employer/select-campus" />} size="sm" nativeButton={false}>
              Campus Partnerships →
            </Button>
          </div>
        </Alert>
      )}
      {role === 'employer' && employerHasCampus && (
        <Alert>
          <AlertTitle>Active campus: {employerCampus.name}</AlertTitle>
          <AlertDescription>
            Recruiting data and drives use this partnership.
            {employerApprovedCount > 1 ? ` ${employerApprovedCount} approved campuses — ` : ' '}
            <Link href="/dashboard/employer/select-campus" className="font-semibold underline-offset-4 hover:underline">
              {employerApprovedCount > 1 ? 'switch campus' : 'change campus'}
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {visibleQuickActions.length > 0 && (
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {visibleQuickActions.map((a) => (
            <Button
              key={`${a.label}-${a.href}`}
              variant="outline"
              size="sm"
              render={<Link href={a.href} />}
              nativeButton={false}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {hubFilter && hubFilter.sections.length === 0 && hubFilter.quickActions.length === 0 && (
        <p className="text-muted-foreground m-0 text-sm">
          No destinations match “{hubSearch.trim()}”. Try a shorter phrase or a screen tag like <code>S-11</code>.
        </p>
      )}

      <div className="ph-hub-card-grid dashboard-nav-hub-grid">
        {visibleSections.map((section) => (
          <Card key={section.id} size="sm" className="self-start">
            <CardHeader className="border-b">
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {section.items.map((item) => (
                  <li key={`${section.id}-${getDashboardNavItemKey(item)}`}>
                    {item.disabled ? (
                      <span className="text-muted-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm opacity-60">
                        <item.icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                        {item.label}
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto w-full justify-start gap-2 px-2 py-1.5 font-normal"
                        render={<Link href={item.href} />}
                        nativeButton={false}
                        onClick={() => syncNavSection(section.id)}
                      >
                        <item.icon aria-hidden="true" data-icon="inline-start" strokeWidth={1.75} />
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                        {hubSearch.trim() ? (
                          <span className="text-muted-foreground shrink-0 text-xs">
                            ({getDevScreenId(item.href) || '—'})
                          </span>
                        ) : null}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <style>{`
        /* Title LEFT / search RIGHT — avoid globals .flex-col vs sm:flex-row conflict */
        .ph-hub-page-header {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
        }
        @media (min-width: 640px) {
          .ph-hub-page-header {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
          }
          .ph-hub-page-header__search {
            margin-inline-start: auto;
          }
        }
      `}</style>
    </div>
  );
}
