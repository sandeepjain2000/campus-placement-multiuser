import {
  LayoutDashboard, User, Bell, Target, FileEdit, Award, FileText,
  Building2, GraduationCap, FolderDot, Briefcase, ClipboardList, Send, Gem, MessageSquare,
  Building, Calendar, Settings, TrendingUp, Users, HelpCircle, ListChecks, Inbox,
  CalendarDays, PartyPopper, SlidersHorizontal, Handshake, KeyRound, Mic, Download, Map, FileUp,
} from 'lucide-react';

/** Exact path for each role’s dashboard home (landing + section switcher). */
export const ROLE_HOME_PATHS = {
  student: '/dashboard/student',
  employer: '/dashboard/employer',
  college_admin: '/dashboard/college',
  super_admin: '/dashboard/admin',
};

export function isRoleDashboardHome(pathname, role) {
  const home = ROLE_HOME_PATHS[role];
  return Boolean(home && pathname === home);
}

/** Persists which menu section is shown in the sidebar for this role. */
export const NAV_SECTION_STORAGE_KEY = 'placementhub_nav_section';

/**
 * Section whose menu item best matches the current path (longest href prefix wins).
 */
export function findSectionIdByPath(menu, pathname) {
  let bestLen = -1;
  let bestId = menu.sections[0]?.id ?? null;
  for (const section of menu.sections) {
    for (const item of section.items) {
      const h = item.href;
      if (pathname === h || pathname.startsWith(`${h}/`)) {
        if (h.length > bestLen) {
          bestLen = h.length;
          bestId = section.id;
        }
      }
    }
  }
  return bestId;
}

/** Active nav item href within a section (longest prefix match). */
export function getActiveItemHrefForSection(section, pathname) {
  let best = null;
  let bestLen = -1;
  for (const item of section.items) {
    const h = item.href;
    if (pathname === h || pathname.startsWith(`${h}/`)) {
      if (h.length > bestLen) {
        bestLen = h.length;
        best = h;
      }
    }
  }
  return best;
}

export function isSidebarItemActive(itemHref, section, pathname) {
  return getActiveItemHrefForSection(section, pathname) === itemHref;
}

export const menuConfig = {
  student: {
    title: 'Student',
    sections: [
      {
        id: 'student-overview',
        title: 'Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard/student/overview', icon: LayoutDashboard },
          { label: 'My Profile', href: '/dashboard/student/profile', icon: User },
          { label: 'My data export', href: '/dashboard/my-exports', icon: Download },
          { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
        ],
      },
      {
        id: 'student-placements',
        title: 'Placements',
        items: [
          { label: 'Browse Drives', href: '/dashboard/student/drives', icon: Target },
          { label: 'Internships', href: '/dashboard/student/internships', icon: GraduationCap },
          { label: 'Projects', href: '/dashboard/student/projects', icon: FolderDot },
          { label: 'Placement calendar', href: '/dashboard/student/calendar', icon: CalendarDays },
          { label: 'My Applications', href: '/dashboard/student/applications', icon: FileEdit },
          { label: 'My Interviews', href: '/dashboard/student/interviews', icon: Calendar },
          { label: 'My Offers', href: '/dashboard/student/offers', icon: Award },
        ],
      },
      {
        id: 'student-communication',
        title: 'Communication',
        items: [
          { label: 'Clarifications', href: '/dashboard/student/clarifications', icon: HelpCircle },
          { label: 'Discussions', href: '/dashboard/student/discussions', icon: MessageSquare },
        ],
      },
      {
        id: 'student-profile',
        title: 'Profile',
        items: [
          { label: 'Documents', href: '/dashboard/student/documents', icon: FileText },
          { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        ],
      },
    ],
  },
  employer: {
    title: 'Employer',
    sections: [
      {
        id: 'employer-core',
        title: '🧭 Core / Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard/employer/overview', icon: LayoutDashboard },
          {
            label: 'Campus Partnerships',
            href: '/dashboard/employer/select-campus',
            icon: Handshake,
          },
          { label: 'My data export', href: '/dashboard/my-exports', icon: Download },
          { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
          { label: 'Events Calendar', href: '/dashboard/employer/calendar', icon: CalendarDays },
        ],
      },
      {
        id: 'employer-organization',
        title: '🏢 Organization Management',
        items: [
          { label: 'Company Profile', href: '/dashboard/employer/profile', icon: Building2 },
          { label: 'Sponsorships', href: '/dashboard/employer/sponsorships', icon: Gem },
          { label: 'Campus guest needs', href: '/dashboard/employer/campus-guest-needs', icon: Mic },
        ],
      },
      {
        id: 'employer-programs',
        title: '🎓 Student Programs',
        items: [
          { label: 'Internships', href: '/dashboard/employer/internships', icon: GraduationCap },
          { label: 'Projects', href: '/dashboard/employer/projects', icon: FolderDot },
        ],
      },
      {
        id: 'employer-recruitment',
        title: '👥 Recruitment & Selection',
        items: [
          { label: 'Job Postings', href: '/dashboard/employer/jobs', icon: Briefcase },
          { label: 'Placement Drives', href: '/dashboard/employer/drives', icon: Target },
          { label: 'Hiring Assessment', href: '/dashboard/employer/hiring-assessment', icon: ListChecks },
          { label: 'Interview Scheduling', href: '/dashboard/employer/interviews', icon: Calendar },
        ],
      },
      {
        id: 'employer-pipeline',
        title: '📥 Candidate Pipeline',
        items: [
          { label: 'Assessment map', href: '/dashboard/employer/assessment-summary', icon: Map },
          { label: 'Applications', href: '/dashboard/employer/applications', icon: ClipboardList },
          { label: 'Assessment uploads', href: '/dashboard/employer/assessment-uploads', icon: FileText },
          { label: 'Offers', href: '/dashboard/employer/offers', icon: Send },
          { label: 'Upload offers (CSV)', href: '/dashboard/employer/offers-upload', icon: FileUp },
        ],
      },
      {
        id: 'employer-communication',
        title: '💬 Communication & Support',
        items: [
          { label: 'Clarifications & Discussions', href: '/dashboard/employer/discussions', icon: HelpCircle },
          { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        ],
      },
    ],
  },
  college_admin: {
    title: 'College Admin',
    sections: [
      {
        id: 'college-overview',
        title: '🧭 Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard/college/overview', icon: LayoutDashboard },
          { label: 'My data export', href: '/dashboard/my-exports', icon: Download },
          { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
        ],
      },
      {
        id: 'college-company',
        title: '🏢 Company & Opportunities',
        items: [
          { label: 'Employers', href: '/dashboard/college/employers', icon: Building2 },
          { label: 'Employer Partnership Requests', href: '/dashboard/college/employers/requests', icon: Inbox },
          { label: 'Placement Drives', href: '/dashboard/college/drives', icon: Target },
          { label: 'Internships', href: '/dashboard/college/internships', icon: GraduationCap },
          { label: 'Internship Results', href: '/dashboard/college/internship-results', icon: CalendarDays },
          { label: 'Sponsorships', href: '/dashboard/college/sponsorships', icon: Gem },
        ],
      },
      {
        id: 'college-students-apps',
        title: '👨‍🎓 Students & Applications',
        items: [
          { label: 'Students', href: '/dashboard/college/students', icon: Users },
          { label: 'Enrollment key', href: '/dashboard/college/enrollment-key', icon: KeyRound },
          { label: 'Applications', href: '/dashboard/college/applications', icon: ClipboardList },
          { label: 'Offers', href: '/dashboard/college/offers', icon: Send },
          { label: 'Upload offers (CSV)', href: '/dashboard/college/offers-upload', icon: FileUp },
        ],
      },
      {
        id: 'college-evaluation',
        title: '🧪 Evaluation & Selection',
        items: [
          { label: 'Hiring Assessment', href: '/dashboard/college/hiring-assessment', icon: ListChecks },
          { label: 'Interview Scheduling', href: '/dashboard/college/interviews', icon: Calendar },
        ],
      },
      {
        id: 'college-communication',
        title: '💬 Communication',
        items: [
          { label: 'Clarifications (publish)', href: '/dashboard/college/clarifications', icon: HelpCircle },
          { label: 'Discussions', href: '/dashboard/college/discussions', icon: MessageSquare },
        ],
      },
      {
        id: 'college-engagement',
        title: '📣 Engagement',
        items: [
          { label: 'Calendar', href: '/dashboard/college/calendar', icon: CalendarDays },
          { label: 'Events', href: '/dashboard/college/events', icon: PartyPopper },
          { label: 'Guest faculty & lectures', href: '/dashboard/college/guest-engagements', icon: Mic },
        ],
      },
      {
        id: 'college-administration',
        title: '⚙️ Administration',
        items: [
          { label: 'Placement Rules', href: '/dashboard/college/rules', icon: SlidersHorizontal },
          { label: 'Infrastructure', href: '/dashboard/college/infrastructure', icon: Building },
          { label: 'Settings', href: '/dashboard/college/settings', icon: Settings },
        ],
      },
      {
        id: 'college-insights',
        title: '📊 Insights',
        items: [
          { label: 'Reports', href: '/dashboard/college/reports', icon: TrendingUp },
          { label: 'Audit reports', href: '/dashboard/college/audit-reports', icon: FileText },
          { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        ],
      },
    ],
  },
  super_admin: {
    title: 'Super Admin',
    sections: [
      {
        id: 'admin-overview',
        title: 'Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard/admin/overview', icon: LayoutDashboard },
          { label: 'My data export', href: '/dashboard/my-exports', icon: Download },
        ],
      },
      {
        id: 'admin-platform',
        title: 'Platform',
        items: [
          { label: 'Colleges', href: '/dashboard/admin/colleges', icon: Building },
          { label: 'Pending registrations', href: '/dashboard/admin/pending-registrations', icon: Inbox },
          { label: 'Employers', href: '/dashboard/admin/employers', icon: Building2 },
          { label: 'Users', href: '/dashboard/admin/users', icon: Users },
          { label: 'Feedback inbox', href: '/dashboard/admin/feedback', icon: Inbox },
          { label: 'Audit reports', href: '/dashboard/admin/audit-reports', icon: FileText },
          { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
        ],
      },
    ],
  },
};
