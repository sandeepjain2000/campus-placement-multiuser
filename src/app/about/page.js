import Link from 'next/link';
import {
  Target,
  Users,
  Building2,
  School,
  ShieldCheck,
  LineChart,
  HeartHandshake,
} from 'lucide-react';
import MarketingPageShell from '@/components/marketing/MarketingPageShell';

export const dynamic = 'force-dynamic';

const PILLARS = [
  {
    icon: Target,
    title: 'One record, every program',
    desc: 'Jobs, internships, drives, projects, and hackathons share the same student profile and college rules — no parallel spreadsheets per activity.',
  },
  {
    icon: ShieldCheck,
    title: 'Policy before pipeline',
    desc: 'Offer caps, eligibility, placement seasons, and blackout windows are enforced in software so committees spend placement week on people, not policing spreadsheets.',
  },
  {
    icon: LineChart,
    title: 'Audit-ready by default',
    desc: 'Applications, offers, assessments, and exports stay tenant-scoped with trails colleges can hand to NAAC reviewers or internal auditors.',
  },
  {
    icon: HeartHandshake,
    title: 'Built for three-sided trust',
    desc: 'Students see only campus-approved opportunities. Employers get predictable channels. Colleges control who publishes and when.',
  },
];

const AUDIENCES = [
  {
    icon: School,
    role: 'Colleges & training cells',
    items: [
      'Configure placement rules, academic years, and drive calendars',
      'Approve employer tie-ups and campus-visible postings',
      'Monitor applications, offers, and hiring assessments in one place',
    ],
  },
  {
    icon: Building2,
    role: 'Employers & campus partners',
    items: [
      'Publish jobs, internships, projects, and hackathons',
      'Request placement drives and manage shortlists per campus',
      'Upload assessments and track hiring outcomes',
    ],
  },
  {
    icon: Users,
    role: 'Students & alumni',
    items: [
      'Maintain profile, documents, and skills in one hub',
      'Apply to campus-visible opportunities with clear status',
      'Track interviews, offers, and placement calendar events',
    ],
  },
];

export default function AboutPage() {
  return (
    <MarketingPageShell>
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
        Company · Our story
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
        About PlacementHub
      </h1>
      <p
        style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          maxWidth: '44rem',
          lineHeight: 1.65,
          marginBottom: '2rem',
        }}
      >
        PlacementHub connects students, colleges, and employers on one campus placement platform — so
        training and hiring move in sync instead of through scattered emails, duplicate forms, and
        conflicting spreadsheets.
      </p>

      <section
        style={{
          marginBottom: '2.5rem',
          padding: '1.35rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--primary-200)',
          background: 'var(--primary-50)',
        }}
        aria-labelledby="mission-heading"
      >
        <h2 id="mission-heading" style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          Our mission
        </h2>
        <p style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Reduce friction between training and hiring: clearer handoffs from placement committee to
          student to recruiter, fewer lost applications, and placement seasons that respect exams,
          internal checks, and real-world employer timelines.
        </p>
      </section>

      <section style={{ marginBottom: '2.75rem' }} aria-labelledby="pillars-heading">
        <h2 id="pillars-heading" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 1.25rem' }}>
          What we optimize for
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
          {PILLARS.map(({ icon: Icon, title, desc }) => (
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
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem' }}>{title}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
                  {desc}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: '2.75rem' }} aria-labelledby="audience-heading">
        <h2 id="audience-heading" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 1.25rem' }}>
          Who we serve
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {AUDIENCES.map(({ icon: Icon, role, items }) => (
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
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.15rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.55,
                }}
              >
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
          marginBottom: '2rem',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-primary)',
        }}
        aria-labelledby="india-heading"
      >
        <h2 id="india-heading" style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
          Built for Indian campus realities
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: '1.2rem',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          <li>Multi-year batches and department-wise placement tracking</li>
          <li>Placement seasons, buffer days, and exam-friendly drive calendars</li>
          <li>Employer tie-ups with campus approval — not open-market job boards</li>
          <li>Exportable reports for committees, leadership, and accreditation reviews</li>
          <li>UI patterns that stay legible during high-stress placement weeks</li>
        </ul>
      </section>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
        Explore what the product includes on the{' '}
        <Link href="/features" style={{ fontWeight: 600 }}>
          Features
        </Link>{' '}
        page, or{' '}
        <Link href="/register" style={{ fontWeight: 600 }}>
          register your institution
        </Link>{' '}
        to get started. Questions? Visit{' '}
        <Link href="/contact" style={{ fontWeight: 600 }}>
          Contact
        </Link>
        .
      </p>
    </MarketingPageShell>
  );
}
