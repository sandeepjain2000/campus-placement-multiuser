/** Seed / demo accounts for try-the-app flows (password is set in your DB seed). */
/** Same as `db/seed.sql` default for seeded users — only used to prefill the login form for these accounts. */
export const DEMO_SEED_PASSWORD = 'Admin@123';

export const DEMO_LOGINS = [
  // Students
  { label: 'Student (IITM)', email: 'arjun.verma@iitm.edu',  icon: '🎓', name: 'Arjun Verma · IIT Madras' },
  { label: 'Student (NITT)', email: 'sneha.rao@nitt.edu',    icon: '🎓', name: 'Sneha Rao · NIT Trichy' },
  { label: 'Student (BITS)', email: 'rohan.mehta@bits.edu',  icon: '🎓', name: 'Rohan Mehta · BITS Pilani' },
  { label: 'Alumni (IITM)', email: 'priya.sharma.alumni@iitm.edu', icon: '🎓', group: 'alumni', name: 'Priya Sharma · IIT Madras Alumni' },
  // Employers
  { label: 'Employer (TechCorp)',    email: 'hr@techcorp.com',          icon: '🏢', name: 'TechCorp Solutions' },
  { label: 'Employer (GlobalSoft)', email: 'hr@globalsoft.com',         icon: '🏢', name: 'GlobalSoft Technologies' },
  { label: 'Employer (Infosys)',    email: 'hr@infosys.com',            icon: '🏢', name: 'Infosys Limited' },
  // College Admins
  { label: 'Admin (IITM)',  email: 'admin@iitm.edu', icon: '🏫', name: 'IIT Madras' },
  { label: 'Admin (NITT)',  email: 'admin@nitt.edu', icon: '🏫', name: 'NIT Trichy' },
  { label: 'Admin (BITS)',  email: 'admin@bits.edu', icon: '🏫', name: 'BITS Pilani' },
  // Placement committee (read-only student data per college)
  { label: 'Placement Committee (IITM)', email: 'committee@iitm.edu', icon: '📋', group: 'placement_committee', name: 'IIT Madras — read-only' },
  { label: 'Placement Committee (NITT)', email: 'committee@nitt.edu', icon: '📋', group: 'placement_committee', name: 'NIT Trichy — read-only' },
  { label: 'Placement Committee (BITS)', email: 'committee@bits.edu', icon: '📋', group: 'placement_committee', name: 'BITS Pilani — read-only' },
  { label: 'Placement Committee (Jadavpur)', email: 'committee.jadavpur@campus-placement.work', icon: '📋', group: 'placement_committee', name: 'Jadavpur University — read-only' },
  { label: 'Placement Committee (VIT)', email: 'committee.vit@campus-placement.work', icon: '📋', group: 'placement_committee', name: 'VIT Vellore — read-only' },
  { label: 'Placement Committee (DTU)', email: 'committee.dtu@campus-placement.work', icon: '📋', group: 'placement_committee', name: 'DTU — read-only' },
  { label: 'Placement Committee (IIIT-H)', email: 'committee.iiith@campus-placement.work', icon: '📋', group: 'placement_committee', name: 'IIIT Hyderabad — read-only' },
  // Platform
  { label: 'Super Admin', email: 'admin@placementhub.com', icon: '⚙️', name: 'PlacementHub' },
];

/**
 * Extra employer rows on the login “Demo accounts” picker only.
 * Others (e.g. GreenVolt, DataQuotient) are seeded in DB and appear on /demo-accounts only.
 */
export const SEEDED_EMPLOYER_CREDENTIALS = [
  { label: 'Employer (Innovent Labs)', email: 'talent@innoventlabs.ai', icon: '🏢', name: 'Innovent Labs' },
  { label: 'Employer (FinEdge Systems)', email: 'careers@finedge.io', icon: '🏢', name: 'FinEdge Systems' },
];


/**
 * Whether to show quick demo account cards on `/login`.
 * Default is on (including Vercel production) so try-the-app flows work without extra env.
 * Set `NEXT_PUBLIC_HIDE_DEMO_LOGINS=true` to hide, or `NEXT_PUBLIC_SHOW_DEMO_LOGINS=false`.
 */
export function isDemoLoginsEnabled() {
  if (process.env.NEXT_PUBLIC_HIDE_DEMO_LOGINS === 'true') return false;
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === 'false') return false;
  return true;
}
