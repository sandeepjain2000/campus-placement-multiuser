/** Seed / demo accounts for try-the-app flows (password is set in your DB seed). */
/** Same as `db/seed.sql` default for seeded users — only used to prefill the login form for these accounts. */
export const DEMO_SEED_PASSWORD = 'Admin@123';

export const DEMO_LOGINS = [
  { label: 'Student (IITM)', email: 'arjun.verma@iitm.edu', icon: '🎓', name: 'IIT Madras' },
  { label: 'Student (NITT)', email: 'sneha.rao@nitt.edu', icon: '🎓', name: 'NIT Trichy' },
  { label: 'Student (BITS)', email: 'rohan.mehta@bits.edu', icon: '🎓', name: 'BITS Pilani' },
  { label: 'Employer (TechCorp)', email: 'hr@techcorp.com', icon: '🏢', name: 'TechCorp Solutions' },
  { label: 'Employer (Infosys)', email: 'hr@infosys.com', icon: '🏢', name: 'Infosys Limited' },
  { label: 'Admin (IITM)', email: 'admin@iitm.edu', icon: '🏫', name: 'IIT Madras' },
  { label: 'Admin (NITT)', email: 'admin@nitt.edu', icon: '🏫', name: 'NIT Trichy' },
  { label: 'Super Admin', email: 'admin@placementhub.com', icon: '⚙️', name: 'PlacementHub' },
  {
    label: 'Placement Committee',
    email: 'committee@iitm.edu',
    icon: '🤝',
    isDummy: true,
    name: 'IIT Madras',
  },
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
