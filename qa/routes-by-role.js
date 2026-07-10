/**
 * Dashboard routes per role (from src/config/dashboardMenu.js).
 * Used by blank-screens.spec.js — keep in sync when menu changes.
 *
 * Regenerate: npm run qa:sync-routes
 */

const SHARED = [
  { label: 'Alerts', href: '/dashboard/alerts' },
  { label: 'Feedback', href: '/dashboard/feedback' },
  { label: 'My data export', href: '/dashboard/my-exports' },
];

function dedupe(routes) {
  const seen = new Set();
  return routes.filter((r) => {
    if (seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  });
}

const collegeAdminRoutes = dedupe([
  { label: "Hub", href: "/dashboard/college", hub: true },
  { label: "Dashboard", href: "/dashboard/college/overview" },
  { label: "Getting Started", href: "/dashboard/college/getting-started" },
  { label: "My data export", href: "/dashboard/my-exports" },
  { label: "Alerts", href: "/dashboard/alerts" },
  { label: "Employers", href: "/dashboard/college/employers" },
  { label: "Employer Partnership Requests", href: "/dashboard/college/employers/requests" },
  { label: "Sponsorships", href: "/dashboard/college/sponsorships" },
  { label: "Startup seed funding", href: "/dashboard/college/startup-funding" },
  { label: "Jobs", href: "/dashboard/college/jobs" },
  { label: "Placement Drives", href: "/dashboard/college/drives" },
  { label: "Internships", href: "/dashboard/college/internships" },
  { label: "Internship Results", href: "/dashboard/college/internship-results" },
  { label: "Students", href: "/dashboard/college/students" },
  { label: "Add student", href: "/dashboard/college/students/add" },
  { label: "Applications", href: "/dashboard/college/applications" },
  { label: "Offers", href: "/dashboard/college/offers" },
  { label: "Hiring Assessment", href: "/dashboard/college/hiring-assessment" },
  { label: "Interview Scheduling", href: "/dashboard/college/interviews" },
  { label: "Clarifications", href: "/dashboard/college/clarifications" },
  { label: "Discussions", href: "/dashboard/college/discussions" },
  { label: "Email templates", href: "/dashboard/college/communication-templates" },
  { label: "Custom message templates", href: "/dashboard/college/message-templates" },
  { label: "Feedback", href: "/dashboard/feedback" },
  { label: "Calendar", href: "/dashboard/college/calendar" },
  { label: "Events", href: "/dashboard/college/events" },
  { label: "Guest faculty & lectures", href: "/dashboard/college/guest-engagements" },
  { label: "Enrollment key", href: "/dashboard/college/enrollment-key" },
  { label: "Placement Rules", href: "/dashboard/college/rules" },
  { label: "Academic years", href: "/dashboard/college/academic-years" },
  { label: "Infrastructure", href: "/dashboard/college/infrastructure" },
  { label: "Settings", href: "/dashboard/college/settings" },
  { label: "Reports", href: "/dashboard/college/reports" },
  { label: "Audit reports", href: "/dashboard/college/audit-reports" },
]);

const studentRoutes = dedupe([
  { label: "Hub", href: "/dashboard/student", hub: true },
  { label: "Dashboard", href: "/dashboard/student/overview" },
  { label: "Getting Started", href: "/dashboard/student/getting-started" },
  { label: "My data export", href: "/dashboard/my-exports" },
  { label: "Browse Drives", href: "/dashboard/student/drives" },
  { label: "Browse Alumni Jobs", href: "/dashboard/alumni/jobs" },
  { label: "Browse Internships", href: "/dashboard/student/internships" },
  { label: "Not Processed Internships", href: "/dashboard/student/internships/not-processed" },
  { label: "Browse Projects", href: "/dashboard/student/projects" },
  { label: "Browse Hackathons", href: "/dashboard/student/hackathons" },
  { label: "Placement calendar", href: "/dashboard/student/calendar" },
  { label: "My Drives", href: "/dashboard/student/applications/drives" },
  { label: "My Alumni Jobs", href: "/dashboard/alumni/applications/jobs" },
  { label: "My Internships", href: "/dashboard/student/applications/internships" },
  { label: "My Projects", href: "/dashboard/student/applications/projects" },
  { label: "My Hackathons", href: "/dashboard/student/applications/hackathons" },
  { label: "My Interviews", href: "/dashboard/student/interviews" },
  { label: "My Offers", href: "/dashboard/student/offers" },
  { label: "Clarifications", href: "/dashboard/student/clarifications" },
  { label: "Alerts", href: "/dashboard/alerts" },
  { label: "Feedback", href: "/dashboard/feedback" },
  { label: "My Profile", href: "/dashboard/student/profile" },
  { label: "Documents", href: "/dashboard/student/documents" },
]);

const employerRoutes = dedupe([
  { label: "Hub", href: "/dashboard/employer", hub: true },
  { label: "Dashboard", href: "/dashboard/employer/overview" },
  { label: "Getting Started", href: "/dashboard/employer/getting-started" },
  { label: "Campus Partnerships", href: "/dashboard/employer/select-campus" },
  { label: "My data export", href: "/dashboard/my-exports" },
  { label: "Alerts", href: "/dashboard/alerts" },
  { label: "Company Profile", href: "/dashboard/employer/profile" },
  { label: "Sponsorships", href: "/dashboard/employer/sponsorships" },
  { label: "Startup seed funding", href: "/dashboard/employer/startup-funding" },
  { label: "Campus guest needs", href: "/dashboard/employer/campus-guest-needs" },
  { label: "Placement Drives", href: "/dashboard/employer/drives" },
  { label: "Internships", href: "/dashboard/employer/internships" },
  { label: "Projects", href: "/dashboard/employer/projects" },
  { label: "Alumni Job Postings", href: "/dashboard/employer/alumni/jobs" },
  { label: "Alumni Applications", href: "/dashboard/employer/alumni/applications" },
  { label: "Alumni Interview Scheduling", href: "/dashboard/employer/alumni/interviews" },
  { label: "Hiring Results Dashboard", href: "/dashboard/employer/hiring-assessment" },
  { label: "Assessment uploads (CSV)", href: "/dashboard/employer/assessment-uploads" },
  { label: "Assessment Update Online", href: "/dashboard/employer/assessment-update-online" },
  { label: "Applications", href: "/dashboard/employer/applications" },
  { label: "Offers", href: "/dashboard/employer/offers" },
  { label: "Clarifications", href: "/dashboard/employer/clarifications" },
  { label: "Discussions", href: "/dashboard/employer/discussions" },
  { label: "Email templates", href: "/dashboard/employer/communication-templates" },
  { label: "Feedback", href: "/dashboard/feedback" },
  { label: "Interview Scheduling", href: "/dashboard/employer/interviews" },
  { label: "Events Calendar", href: "/dashboard/employer/calendar" },
  { label: "Assessment map", href: "/dashboard/employer/assessment-summary" },
]);

const superAdminRoutes = dedupe([
  { label: "Hub", href: "/dashboard/admin", hub: true },
  { label: "Platform overview", href: "/dashboard/admin/overview" },
  { label: "Getting Started", href: "/dashboard/admin/getting-started" },
  { label: "My data export", href: "/dashboard/my-exports" },
  { label: "Colleges", href: "/dashboard/admin/colleges" },
  { label: "Employers", href: "/dashboard/admin/employers" },
  { label: "Placement listings", href: "/dashboard/admin/placement-listings" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Archived students", href: "/dashboard/admin/archived-students" },
  { label: "Email templates", href: "/dashboard/admin/email-templates" },
  { label: "Onboard colleges & employers", href: "/dashboard/admin/pending-registrations" },
  { label: "Feedback inbox", href: "/dashboard/admin/feedback" },
  { label: "Audit reports", href: "/dashboard/admin/audit-reports" },
  { label: "Settings", href: "/dashboard/admin/settings" },
]);

module.exports = {
  DEMO_LOGINS: {
    student: 'arjun.verma@iitm.edu',
    employer: 'hr@techcorp.com',
    college_admin: 'admin@iitm.edu',
    super_admin: 'admin@placementhub.com',
  },
  ROLE_HOME: {
    student: //dashboard/student/,
    employer: //dashboard/employer/,
    college_admin: //dashboard/college/,
    super_admin: //dashboard/admin/,
  },
  ROUTES_BY_ROLE: {
    student: studentRoutes,
    employer: employerRoutes,
    college_admin: collegeAdminRoutes,
    super_admin: superAdminRoutes,
  },
};
