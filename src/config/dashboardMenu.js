import {
  ALUMNI_BROWSE_JOBS_PATH,
  ALUMNI_GETTING_STARTED_PATH,
  ALUMNI_MY_JOBS_PATH,
  LEGACY_STUDENT_APPLICATIONS_JOBS_PATH,
  LEGACY_STUDENT_JOBS_PATH,
} from '@/lib/alumniRoutes';
import {
  EMPLOYER_ALUMNI_JOBS_PATH,
} from '@/lib/employerAlumniRoutes';
import {
  LayoutDashboard, User, Bell, Target, FileEdit, Award, FileText,
  Building2, GraduationCap, FolderDot, Briefcase, ClipboardList, Send, Gem, MessageSquare,
  Building, Calendar, Settings, TrendingUp, Users, HelpCircle, ListChecks, Inbox,
  CalendarDays, PartyPopper, SlidersHorizontal, Handshake, KeyRound, Mic, Download, Map, Rocket,
  CalendarRange, Table2,
  UserPlus,
  Mail,
  Archive,
  Trophy,
  Lock,
  UserX,
  AlertTriangle,
  Megaphone,
  MessageSquareText,
  UserRoundSearch,
  UserCog,
  HandHeart,
  ScrollText,
  ClipboardCheck,
  Video,
} from 'lucide-react';

/** Exact path for each role’s dashboard home (landing + section switcher). */
export const ROLE_HOME_PATHS = {
  student: '/dashboard/student',
  employer: '/dashboard/employer',
  college_admin: '/dashboard/college',
  placement_committee: '/dashboard/college',
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

/** Longest-prefix active href across every section (for full admin sidebar). */
export function getActiveItemHrefForMenu(menu, pathname) {
  let best = null;
  let bestLen = -1;
  for (const section of menu?.sections || []) {
    for (const item of section.items) {
      const h = item.href;
      if (pathname === h || pathname.startsWith(`${h}/`)) {
        if (h.length > bestLen) {
          bestLen = h.length;
          best = h;
        }
      }
    }
  }
  return best;
}

export function isSidebarItemActiveInMenu(itemHref, menu, pathname) {
  return getActiveItemHrefForMenu(menu, pathname) === itemHref;
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
          { label: 'Getting Started', href: '/dashboard/student/getting-started', icon: Rocket },
          { label: 'My Data Export', href: '/dashboard/my-exports', icon: Download },
        ],
      },
      {
        id: 'student-opportunities',
        title: 'Opportunities',
        items: [
          { label: 'Browse Drives', href: '/dashboard/student/drives', icon: Target },
          { label: 'Browse Internships', href: '/dashboard/student/internships', icon: GraduationCap },
          { label: 'Browse Projects', href: '/dashboard/student/projects', icon: FolderDot },
          { label: 'Browse Hackathons', href: '/dashboard/student/hackathons', icon: Trophy },
        ],
      },
      {
        id: 'student-applications',
        title: 'My Applications',
        items: [
          { label: 'My Drives', href: '/dashboard/student/applications/drives', icon: Target },
          { label: 'My Internships', href: '/dashboard/student/applications/internships', icon: GraduationCap },
          { label: 'My Projects', href: '/dashboard/student/applications/projects', icon: FolderDot },
          { label: 'My Hackathons', href: '/dashboard/student/applications/hackathons', icon: Award },
          { label: 'My Interviews', href: '/dashboard/student/interviews', icon: Calendar },
          { label: 'My Offers', href: '/dashboard/student/offers', icon: Handshake },
          {
            label: 'Pending / Not Processed Applications',
            href: '/dashboard/student/internships/not-processed',
            icon: Lock,
          },
        ],
      },
      {
        id: 'student-internship-outcomes',
        title: 'Internship Outcomes',
        items: [
          {
            label: 'Internship Progress Reviews',
            href: '/dashboard/student/internship-feedback',
            icon: MessageSquareText,
          },
          { label: 'PPO', href: '/dashboard/student/internship-ppo', icon: Award },
          {
            id: 'future-final-evaluation',
            label: 'Final Evaluation (Future)',
            href: '#future-final-evaluation',
            icon: ClipboardCheck,
            disabled: true,
          },
          {
            id: 'future-completion-certificate',
            label: 'Completion Certificate (Future)',
            href: '#future-completion-certificate',
            icon: ScrollText,
            disabled: true,
          },
        ],
      },
      {
        id: 'student-career-services',
        title: 'Career Services',
        items: [
          { label: 'Mentor Connect', href: '/dashboard/student/mentorship-requests', icon: HandHeart },
          {
            id: 'future-career-counselling',
            label: 'Career Counselling (Future)',
            href: '#future-career-counselling',
            icon: UserRoundSearch,
            disabled: true,
          },
          {
            id: 'future-resume-review',
            label: 'Resume Review (Future)',
            href: '#future-resume-review',
            icon: FileEdit,
            disabled: true,
          },
          {
            id: 'future-mock-interviews',
            label: 'Mock Interviews (Future)',
            href: '#future-mock-interviews',
            icon: Video,
            disabled: true,
          },
          { label: 'Clarifications', href: '/dashboard/student/clarifications', icon: HelpCircle },
        ],
      },
      {
        id: 'student-communication',
        title: 'Communication',
        items: [
          { label: 'Notifications / Alerts', href: '/dashboard/alerts', icon: Bell },
          {
            id: 'future-announcements',
            label: 'Announcements (Future)',
            href: '#future-announcements',
            icon: Megaphone,
            disabled: true,
          },
          {
            id: 'future-messages',
            label: 'Messages (Future)',
            href: '#future-messages',
            icon: Mail,
            disabled: true,
          },
          { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        ],
      },
      {
        id: 'student-profile',
        title: 'Profile & Documents',
        items: [
          { label: 'My Profile', href: '/dashboard/student/profile', icon: User },
          { label: 'My CVs', href: '/dashboard/student/my-cvs', icon: FileEdit },
          { label: 'Documents', href: '/dashboard/student/documents', icon: FileText },
          {
            id: 'future-certificates',
            label: 'Certificates (Future)',
            href: '#future-certificates',
            icon: ScrollText,
            disabled: true,
          },
        ],
      },
    ],
  },
  employer: {
    title: 'Employer',
    sections: [
      {
        id: 'employer-core',
        title: 'Core / Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard/employer/overview', icon: LayoutDashboard },
          { label: 'Getting Started', href: '/dashboard/employer/getting-started', icon: Rocket },
          {
            label: 'Campus Partnerships',
            href: '/dashboard/employer/select-campus',
            icon: Handshake,
          },
          { label: 'My Data Export', href: '/dashboard/my-exports', icon: Download },
          { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
        ],
      },
      {
        id: 'employer-programs',
        title: 'Student Opportunities',
        items: [
          { label: 'Placement Drives', href: '/dashboard/employer/drives', icon: Target },
          { label: 'Internships', href: '/dashboard/employer/internships', icon: GraduationCap },
          { label: 'Projects', href: '/dashboard/employer/projects', icon: FolderDot },
          { label: 'Alumni Job Postings', href: EMPLOYER_ALUMNI_JOBS_PATH, icon: Briefcase },
        ],
      },
      {
        id: 'employer-pipeline',
        title: 'Candidate Pipeline',
        items: [
          { label: 'Applications', href: '/dashboard/employer/applications', icon: ClipboardList },
          {
            label: 'Shortlisted / Unavailable (FCFS)',
            href: '/dashboard/employer/fcfs-unavailable',
            icon: UserX,
          },
          { label: 'Offers', href: '/dashboard/employer/offers', icon: Send },
          { label: 'Offer Templates', href: '/dashboard/employer/offer-templates', icon: FileEdit },
        ],
      },
      {
        id: 'employer-recruitment',
        title: 'Recruitment & Selection',
        items: [
          { label: 'Hiring Results Dashboard', href: '/dashboard/employer/hiring-assessment', icon: ListChecks },
          { label: 'Assessment Uploads (CSV)', href: '/dashboard/employer/assessment-uploads', icon: FileText },
          { label: 'Assessment Update Online', href: '/dashboard/employer/assessment-update-online', icon: Table2 },
          { label: 'Interview Scheduling', href: '/dashboard/employer/interviews', icon: Calendar },
        ],
      },
      {
        id: 'employer-internship-outcomes',
        title: 'Internship Outcomes',
        items: [
          {
            label: 'Internship Progress Reviews',
            href: '/dashboard/employer/internship-feedback',
            icon: MessageSquareText,
          },
          { label: 'Internship Supervisors', href: '/dashboard/employer/internship-supervisors', icon: UserCog },
          { label: 'Internship PPO', href: '/dashboard/employer/internship-ppo', icon: Award },
        ],
      },
      {
        id: 'employer-organization',
        title: 'Organization Management',
        items: [
          { label: 'Company Profile', href: '/dashboard/employer/profile', icon: Building2 },
          { label: 'Sponsorships', href: '/dashboard/employer/sponsorships', icon: Gem },
          { label: 'Startup Seed Funding', href: '/dashboard/employer/startup-funding', icon: Rocket },
          { label: 'Campus Guest Needs', href: '/dashboard/employer/campus-guest-needs', icon: Mic },
          {
            label: 'Student Mentorship Requests',
            href: '/dashboard/employer/mentorship-requests',
            icon: HandHeart,
          },
        ],
      },
      {
        id: 'employer-communication',
        title: 'Communication & Support',
        items: [
          { label: 'Clarifications', href: '/dashboard/employer/clarifications', icon: HelpCircle },
          { label: 'Discussions', href: '/dashboard/employer/discussions', icon: MessageSquare },
          { label: 'Email Templates', href: '/dashboard/employer/communication-templates', icon: Mail },
          { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        ],
      },
      {
        id: 'employer-operations',
        title: 'Operations',
        items: [
          { label: 'Events Calendar', href: '/dashboard/employer/calendar', icon: CalendarDays },
          {
            id: 'future-campus-calendar',
            label: 'Campus Calendar (Future)',
            href: '#future-employer-campus-calendar',
            icon: CalendarDays,
            disabled: true,
          },
          {
            id: 'future-recruitment-calendar',
            label: 'Recruitment Calendar (Future)',
            href: '#future-employer-recruitment-calendar',
            icon: Calendar,
            disabled: true,
          },
        ],
      },
      {
        id: 'employer-alumni',
        title: 'Alumni',
        items: [
          {
            label: 'Alumni Job Assessment Online',
            href: '/dashboard/employer/alumni/assessment-online',
            icon: Table2,
          },
        ],
      },
      {
        id: 'employer-settings',
        title: 'Settings',
        items: [
          { label: 'Campus Posting Limits', href: '/dashboard/employer/settings', icon: Building2 },
          { label: 'Assessment Map', href: '/dashboard/employer/assessment-summary', icon: Map },
        ],
      },
    ],
  },
  college_admin: {
    title: 'College Admin',
    sections: [
      {
        id: 'college-overview',
        title: 'Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard/college/overview', icon: LayoutDashboard },
          { label: 'Getting Started', href: '/dashboard/college/getting-started', icon: Rocket },
          { label: 'My Data Export', href: '/dashboard/my-exports', icon: Download },
          { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
        ],
      },
      {
        id: 'college-students-apps',
        title: 'Students & Applications',
        items: [
          { label: 'Students', href: '/dashboard/college/students', icon: Users },
          { label: 'Add Student', href: '/dashboard/college/students/add', icon: UserPlus },
          { label: 'Applications', href: '/dashboard/college/applications', icon: ClipboardList },
          { label: 'Offers', href: '/dashboard/college/offers', icon: Send },
        ],
      },
      {
        id: 'college-employers',
        title: 'Employers & Partnerships',
        items: [
          { label: 'Employers', href: '/dashboard/college/employers', icon: Building2 },
          { label: 'Employer Partnership Requests', href: '/dashboard/college/employers/requests', icon: Inbox },
          { label: 'Sponsorships', href: '/dashboard/college/sponsorships', icon: Gem },
          { label: 'Startup Seed Funding', href: '/dashboard/college/startup-funding', icon: Rocket },
        ],
      },
      {
        id: 'college-programs',
        title: 'Programs & Drives',
        items: [
          { label: 'Placement Drives', href: '/dashboard/college/drives', icon: Target },
          { label: 'Internships', href: '/dashboard/college/internships', icon: GraduationCap },
          { label: 'Internship Results', href: '/dashboard/college/internship-results', icon: CalendarDays },
        ],
      },
      {
        id: 'college-evaluation',
        title: 'Evaluation & Selection',
        items: [
          { label: 'Hiring Assessments', href: '/dashboard/college/hiring-assessment', icon: ListChecks },
          { label: 'Interview Scheduling', href: '/dashboard/college/interviews', icon: Calendar },
        ],
      },
      {
        id: 'college-internship-outcomes',
        title: 'Internship Outcomes',
        items: [
          {
            label: 'Internship Progress Reviews',
            href: '/dashboard/college/internship-feedback',
            icon: MessageSquareText,
          },
          { label: 'Internship Guides', href: '/dashboard/college/internship-guides', icon: UserRoundSearch },
          { label: 'Internship PPO', href: '/dashboard/college/internship-ppo', icon: Award },
        ],
      },
      {
        id: 'college-communication',
        title: 'Communication & Support',
        items: [
          { label: 'Clarifications', href: '/dashboard/college/clarifications', icon: HelpCircle },
          { label: 'Discussions', href: '/dashboard/college/discussions', icon: MessageSquare },
          { label: 'Email Templates', href: '/dashboard/college/communication-templates', icon: Mail },
          { label: 'Custom Message Templates', href: '/dashboard/college/message-templates', icon: FileEdit },
          { label: 'Bulk Notifications', href: '/dashboard/college/bulk-notifications', icon: Megaphone },
          { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
        ],
      },
      {
        id: 'college-engagement',
        title: 'Engagement',
        items: [
          { label: 'Calendar', href: '/dashboard/college/calendar', icon: CalendarDays },
          { label: 'Events', href: '/dashboard/college/events', icon: PartyPopper },
          { label: 'Guest Faculty & Lectures', href: '/dashboard/college/guest-engagements', icon: Mic },
          {
            label: 'Student Mentorship Requests',
            href: '/dashboard/college/mentorship-requests',
            icon: HandHeart,
          },
        ],
      },
      {
        id: 'college-alumni',
        title: 'Alumni',
        items: [{ label: 'Alumni Jobs', href: '/dashboard/college/jobs', icon: Briefcase }],
      },
      {
        id: 'college-insights',
        title: 'Insights',
        items: [
          { label: 'Reports', href: '/dashboard/college/reports', icon: TrendingUp },
          { label: 'Audit Reports', href: '/dashboard/college/audit-reports', icon: FileText },
        ],
      },
      {
        id: 'college-administration',
        title: 'Administration',
        items: [
          { label: 'Enrollment Key', href: '/dashboard/college/enrollment-key', icon: KeyRound },
          { label: 'Placement Rules', href: '/dashboard/college/rules', icon: SlidersHorizontal },
          { label: 'Academic Years', href: '/dashboard/college/academic-years', icon: CalendarRange },
          { label: 'Infrastructure', href: '/dashboard/college/infrastructure', icon: Building },
          { label: 'Settings', href: '/dashboard/college/settings', icon: Settings },
        ],
      },
    ],
  },
  placement_committee: {
    title: 'Placement Committee',
    sections: [
      {
        id: 'committee-overview',
        title: 'Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard/college/overview', icon: LayoutDashboard },
          { label: 'Getting Started', href: '/dashboard/college/getting-started', icon: Rocket },
          { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
        ],
      },
      {
        id: 'committee-students',
        title: 'Student data (read-only)',
        items: [
          { label: 'Students', href: '/dashboard/college/students', icon: Users },
          { label: 'Applications', href: '/dashboard/college/applications', icon: ClipboardList },
        ],
      },
      {
        id: 'committee-support',
        title: 'Support',
        items: [{ label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare }],
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
          { label: 'Platform overview', href: '/dashboard/admin/overview', icon: LayoutDashboard },
          { label: 'Getting Started', href: '/dashboard/admin/getting-started', icon: Rocket },
          { label: 'My data export', href: '/dashboard/my-exports', icon: Download },
        ],
      },
      {
        id: 'admin-directory',
        title: 'Platform Directory',
        items: [
          { label: 'Colleges', href: '/dashboard/admin/colleges', icon: Building },
          { label: 'Employers', href: '/dashboard/admin/employers', icon: Building2 },
          { label: 'Placement listings', href: '/dashboard/admin/placement-listings', icon: Briefcase },
          { label: 'Users', href: '/dashboard/admin/users', icon: Users },
          { label: 'Archived students', href: '/dashboard/admin/archived-students', icon: Archive },
        ],
      },
      {
        id: 'admin-communication',
        title: '💬 Communication & Support',
        items: [
          { label: 'Email templates', href: '/dashboard/admin/email-templates', icon: Mail },
        ],
      },
      {
        id: 'admin-operations',
        title: 'Operations & Risk',
        items: [
          { label: 'Onboard colleges & employers', href: '/dashboard/admin/pending-registrations', icon: Inbox },
          { label: 'Feedback inbox', href: '/dashboard/admin/feedback', icon: Inbox },
          { label: 'Error logs', href: '/dashboard/admin/error-logs', icon: AlertTriangle },
          { label: 'Email logs', href: '/dashboard/admin/email-logs', icon: Mail },
          { label: 'Audit reports', href: '/dashboard/admin/audit-reports', icon: FileText },
          { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
        ],
      },
    ],
  },
};

const STUDENT_CAMPUS_ONLY_HREFS = new Set([
  '/dashboard/student/drives',
  '/dashboard/student/internships',
  '/dashboard/student/internships/not-processed',
  '/dashboard/student/projects',
  '/dashboard/student/hackathons',
  '/dashboard/student/mentorship-requests',
  '/dashboard/student/clarifications',
  '/dashboard/student/applications/drives',
  '/dashboard/student/applications/internships',
  '/dashboard/student/applications/projects',
  '/dashboard/student/applications/hackathons',
]);

const STUDENT_ALUMNI_ONLY_HREFS = new Set([
  ALUMNI_BROWSE_JOBS_PATH,
  ALUMNI_MY_JOBS_PATH,
  LEGACY_STUDENT_JOBS_PATH,
  LEGACY_STUDENT_APPLICATIONS_JOBS_PATH,
]);

const ALUMNI_STUDENT_NAV_ITEMS = {
  'student-opportunities': [
    { label: 'Browse Alumni Jobs', href: ALUMNI_BROWSE_JOBS_PATH, icon: Briefcase },
  ],
  'student-applications': [{ label: 'My Alumni Jobs', href: ALUMNI_MY_JOBS_PATH, icon: Briefcase }],
};

function mapStudentNavItem(item, isAlumni) {
  if (isAlumni && item.href === '/dashboard/student/getting-started') {
    return { ...item, href: ALUMNI_GETTING_STARTED_PATH };
  }
  return item;
}

function filterStudentMenu(menu, isAlumni) {
  const hidden = isAlumni ? STUDENT_CAMPUS_ONLY_HREFS : STUDENT_ALUMNI_ONLY_HREFS;
  return {
    ...menu,
    sections: menu.sections
      .map((section) => {
        const items = section.items
          .filter((item) => item.disabled || !hidden.has(item.href))
          .map((item) => mapStudentNavItem(item, isAlumni));
        const alumniItems = isAlumni ? ALUMNI_STUDENT_NAV_ITEMS[section.id] || [] : [];
        return {
          ...section,
          title:
            isAlumni && section.id === 'student-opportunities' ? 'Alumni' : section.title,
          items: [...items, ...alumniItems],
        };
      })
      .filter((section) => section.items.length > 0),
  };
}

/** Stable React key for a nav item (disabled future items may share placeholder hrefs). */
export function getDashboardNavItemKey(item) {
  return item.id || item.href;
}

/** Role menu with alumni vs campus student visibility applied. */
export function getDashboardMenu(role, user) {
  const base = menuConfig[role] || menuConfig.student;
  if (role === 'student') {
    return filterStudentMenu(base, Boolean(user?.isAlumni));
  }
  return base;
}
