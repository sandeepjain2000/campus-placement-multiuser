import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Target,
  Trophy,
  FolderDot,
  CalendarDays,
  SlidersHorizontal,
  Building2,
  School,
  ShieldCheck,
  ClipboardList,
  Handshake,
  ListChecks,
  MessageSquare,
  Mic,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const OPPORTUNITY_TYPES = [
  {
    icon: Briefcase,
    title: 'Jobs (full-time & part-time)',
    desc: 'Employers publish roles with eligibility, locations, and compensation bands. Students apply in one click; colleges see applications on a shared board.',
    roles: 'Employer posts · Student applies · College monitors',
  },
  {
    icon: GraduationCap,
    title: 'Internships',
    desc: 'Summer and semester internships with campus visibility rules. Track internship results separately from final placements.',
    roles: 'Employer · Student · College internship board',
  },
  {
    icon: Target,
    title: 'Placement drives',
    desc: 'On-campus or virtual drives with schedules, capacity, and linked assessments. Employers request drives; colleges approve and run the calendar.',
    roles: 'Employer requests · College approves · Students register',
  },
  {
    icon: FolderDot,
    title: 'Short projects',
    desc: 'Employer-posted short projects for pre-final and final-year students who need portfolio or industry exposure outside a full internship.',
    roles: 'Employer Projects · Student browse & apply',
  },
  {
    icon: Trophy,
    title: 'Hackathons',
    desc: 'Coding and innovation hackathons with optional PPO links. Students discover campus-visible hackathons and track applications like other programs.',
    roles: 'Employer · Student hackathons · College visibility',
  },
  {
    icon: Mic,
    title: 'Guest faculty & lectures',
    desc: 'Colleges list guest lecture needs; employer partners respond. Keeps industry engagement on the same platform as hiring.',
    roles: 'College lists · Employers discover',
  },
];

const PLACEMENT_RULES = [
  {
    label: 'Offer limits',
    detail: 'Cap how many offers a student may hold (e.g. one full-time offer) so committees enforce policy automatically.',
  },
  {
    label: 'Eligibility',
    detail: 'Minimum CGPA, backlog rules, PPT requirements, and verification before students appear in employer shortlists.',
  },
  {
    label: 'Placement season',
    detail: 'Season start/end dates and buffer days so drives do not clash with exams or internal blackout windows.',
  },
  {
    label: 'FCFS & acceptance windows',
    detail: 'First-come-first-serve offer acceptance and time-bound responses — configurable per college tenant.',
  },
  {
    label: 'Academic years',
    detail: 'Batch and semester context on postings, drives, and reports so multi-year programs stay separated.',
  },
];

const ROLE_FEATURE_MATRIX = [
  {
    category: 'Programs & postings',
    student: ['Browse jobs, internships, drives', 'Projects & hackathons', 'Campus-visible only'],
    college: ['Jobs, drives, internships board', 'Approve employer postings', 'Guest lecture listings'],
    employer: ['Post jobs & internships', 'Projects & hackathons', 'Request placement drives'],
  },
  {
    category: 'Applications',
    student: ['One-click apply', 'Track status by type', 'My applications hub'],
    college: ['Campus applications board', 'Filter by program', 'Verify eligibility'],
    employer: ['Pipeline by campus', 'Resume & profile view', 'Shortlist & status updates'],
  },
  {
    category: 'Selection & offers',
    student: ['Interviews calendar', 'Offers accept / decline', 'Assessment visibility'],
    college: ['Interview scheduling', 'Offers (CSV via Offers page)', 'Hiring assessments'],
    employer: ['Interview scheduling', 'Offers (CSV via Offers page)', 'Assessment uploads (CSV) & Update Online'],
  },
  {
    category: 'Profile & records',
    student: ['Profile & skills', 'Documents & CV', 'Data export'],
    college: ['Student records', 'Bulk upload', 'Enrollment key'],
    employer: ['Company profile', 'Campus partnerships', 'Sponsorships'],
  },
  {
    category: 'Rules & planning',
    student: ['Placement calendar', 'Alerts & reminders', '—'],
    college: ['Placement rules engine', 'Academic years', 'Infrastructure & events'],
    employer: ['Drive calendar', 'Campus guest needs', '—'],
  },
  {
    category: 'Communication',
    student: ['Clarifications Q&A', 'Feedback', 'Alerts'],
    college: ['Clarifications', 'Email & message templates', 'Discussions'],
    employer: ['Clarifications', 'Email templates', 'Discussions'],
  },
];

const ROLE_COLUMNS = [
  { key: 'student', label: 'Students' },
  { key: 'college', label: 'College' },
  { key: 'employer', label: 'Employer' },
];

const ROLE_CAPABILITIES = [
  {
    role: 'Students',
    icon: GraduationCap,
    items: [
      'Profile, documents, resume, and skills',
      'Browse jobs, internships, drives, projects, and hackathons',
      'Apply and track status; interviews and offers in one place',
      'Clarifications, alerts, and calendar for campus events',
    ],
  },
  {
    role: 'Employers',
    icon: Building2,
    items: [
      'Campus partnerships and job / internship / project postings',
      'Placement drive requests and hiring assessments',
      'Applications pipeline, interviews, offers (including CSV upload)',
      'Clarifications, discussions, and email templates',
    ],
  },
  {
    role: 'College admins',
    icon: School,
    items: [
      'Student records, verification, and applications board',
      'Approve employers and configure placement rules',
      'Drive calendar, infrastructure, events, and reports',
      'Offers, assessments, audit reports, and guest engagements',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <header style={{ borderBottom: '1px solid var(--border-default)', padding: '1rem 1.5rem' }}>
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <Link
            href="/"
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} aria-hidden />
            Home
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/register" className="btn btn-secondary btn-sm">
              Register
            </Link>
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <p
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
          }}
        >
          Product · What&apos;s available
        </p>
        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: '0 0 1rem',
            lineHeight: 1.15,
          }}
        >
          One platform for every placement program
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            maxWidth: '44rem',
            lineHeight: 1.6,
            marginBottom: '2.5rem',
          }}
        >
          PlacementHub is not only full-time hiring. Jobs, internships, placement drives, hackathons,
          short projects, and guest lectures share the same tenant, the same student record, and the
          same college placement rules — so committees do not run parallel spreadsheets for each
          activity type.
        </p>

        <section style={{ marginBottom: '3rem' }} aria-labelledby="opportunity-types-heading">
          <h2
            id="opportunity-types-heading"
            style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem' }}
          >
            Opportunity types on the platform
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.55 }}>
            High-level programs your campus can run today. Each type uses the same application and
            audit patterns; only the employer posting form and student browse screens differ.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
            {OPPORTUNITY_TYPES.map(({ icon: Icon, title, desc, roles }) => (
              <li
                key={title}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '1rem',
                  padding: '1.25rem 1.35rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    width: '2.75rem',
                    height: '2.75rem',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    color: 'var(--primary-600)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <Icon size={22} aria-hidden />
                </span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>{title}</h3>
                  <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
                    {desc}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                    {roles}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ marginBottom: '3rem' }} aria-labelledby="rules-heading">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <SlidersHorizontal size={24} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: 2 }} aria-hidden />
            <div>
              <h2 id="rules-heading" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
                College placement rules (one policy engine)
              </h2>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Each college tenant configures rules under{' '}
                <strong>Placement Rules</strong> in the college dashboard. Those settings apply across
                jobs, drives, and offers — not per spreadsheet.
              </p>
            </div>
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: '0.65rem',
            }}
          >
            {PLACEMENT_RULES.map((r) => (
              <li
                key={r.label}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-primary)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{r.label}</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {r.detail}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ marginBottom: '3rem' }} aria-labelledby="roles-heading">
          <h2 id="roles-heading" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 1.25rem' }}>
            What each role can do
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {ROLE_CAPABILITIES.map(({ role, icon: Icon, items }) => (
              <div
                key={role}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Icon size={20} style={{ color: 'var(--primary-600)' }} aria-hidden />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{role}</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {items.map((item) => (
                    <li key={item} style={{ marginBottom: '0.35rem' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
          }}
          aria-labelledby="shared-heading"
        >
          <h2 id="shared-heading" style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
            Shared across all programs
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem 1.25rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            {[
              { icon: ClipboardList, label: 'Applications & status tracking' },
              { icon: Handshake, label: 'Offers & acceptance' },
              { icon: ListChecks, label: 'Hiring assessments' },
              { icon: CalendarDays, label: 'Calendars & scheduling' },
              { icon: MessageSquare, label: 'Clarifications & feedback' },
              { icon: ShieldCheck, label: 'Audit logs & exports' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Icon size={16} aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }} aria-labelledby="matrix-heading">
          <h2 id="matrix-heading" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
            At a glance by role
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Major capabilities — not every screen, but enough to see who does what.
          </p>
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-primary)',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: 640,
                borderCollapse: 'collapse',
                fontSize: '0.8125rem',
                lineHeight: 1.45,
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                  <th
                    scope="col"
                    style={{
                      textAlign: 'left',
                      padding: '0.65rem 0.85rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      width: '9.5rem',
                      verticalAlign: 'bottom',
                    }}
                  >
                    Category
                  </th>
                  {ROLE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      style={{
                        textAlign: 'left',
                        padding: '0.65rem 0.85rem',
                        fontWeight: 700,
                        color: 'var(--primary-700, var(--primary-600))',
                        verticalAlign: 'bottom',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_FEATURE_MATRIX.map((row, idx) => (
                  <tr
                    key={row.category}
                    style={{
                      borderBottom:
                        idx < ROLE_FEATURE_MATRIX.length - 1 ? '1px solid var(--border-default)' : undefined,
                    }}
                  >
                    <th
                      scope="row"
                      style={{
                        textAlign: 'left',
                        padding: '0.65rem 0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        background: 'var(--bg-secondary)',
                        verticalAlign: 'top',
                      }}
                    >
                      {row.category}
                    </th>
                    {ROLE_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '0.65rem 0.85rem',
                          color: 'var(--text-secondary)',
                          verticalAlign: 'top',
                        }}
                      >
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                          {row[col.key].map((point) => (
                            <li key={point} style={{ marginBottom: '0.2rem' }}>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
          Signed-in users see the full menu for their role after{' '}
          <Link href="/login" style={{ fontWeight: 600 }}>
            sign in
          </Link>
          . Colleges configure rules under Administration → Placement Rules.
        </p>
      </main>
    </div>
  );
}
