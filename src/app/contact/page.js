import Link from 'next/link';
import { Mail, Phone, MessageSquare, Building2, School, GraduationCap, Clock, ExternalLink } from 'lucide-react';
import MarketingPageShell from '@/components/marketing/MarketingPageShell';
import { getPlatformSettings } from '@/lib/platformSettings';
import { buildPublicSupportConfig } from '@/lib/supportContact';

export const dynamic = 'force-dynamic';

const INQUIRY_TYPES = [
  {
    icon: School,
    title: 'Colleges & training cells',
    detail: 'Onboarding, tenant setup, placement rules, bulk student upload, and demo walkthroughs.',
    action: 'Mention your institution name and expected go-live window.',
  },
  {
    icon: Building2,
    title: 'Employers & campus partners',
    detail: 'Campus tie-ups, drive scheduling, posting jobs or internships, and assessment workflows.',
    action: 'Include company name and target campuses if known.',
  },
  {
    icon: GraduationCap,
    title: 'Students',
    detail: 'Login, applications, offers, and profile issues on your campus tenant.',
    action: 'Contact your placement office first — they control enrollment and verification.',
  },
  {
    icon: MessageSquare,
    title: 'Product & partnerships',
    detail: 'Feature questions, integrations, pilots, and general feedback about PlacementHub.',
    action: 'A short subject line helps us route your message faster.',
  },
];

function phoneTelHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export default async function ContactPage() {
  const platform = await getPlatformSettings();
  const support = buildPublicSupportConfig(platform);
  const tel = phoneTelHref(support.supportPhone);

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
        Support · Get in touch
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
        Contact PlacementHub
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
        For demos, campus onboarding, employer partnerships, or product questions — reach us using the
        channels below. We typically respond within one business day (IST).
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        <a
          href={`mailto:${support.supportEmail}`}
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Mail size={22} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--primary-600)' }} aria-hidden />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Email</div>
            <span style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{support.supportEmail}</span>
          </div>
        </a>

        {support.supportPhone ? (
          <a
            href={tel}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Phone size={22} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--primary-600)' }} aria-hidden />
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Phone</div>
              <span style={{ fontSize: '0.9rem' }}>{support.supportPhone}</span>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Mon–Fri, 9:00–18:00 IST
              </p>
            </div>
          </a>
        ) : null}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
          }}
        >
          <Clock size={22} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--primary-600)' }} aria-hidden />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Login page support</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Signed-out users can send a message from the{' '}
              <Link href="/login" style={{ fontWeight: 600 }}>
                sign-in page
              </Link>{' '}
              — it delivers to the platform notification inbox.
            </p>
          </div>
        </div>
      </div>

      <section style={{ marginBottom: '2.5rem' }} aria-labelledby="inquiry-heading">
        <h2 id="inquiry-heading" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 1.25rem' }}>
          What can we help with?
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
          {INQUIRY_TYPES.map(({ icon: Icon, title, detail, action }) => (
            <li
              key={title}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '1rem',
                padding: '1.15rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-primary)',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  width: '2.5rem',
                  height: '2.5rem',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--primary-600)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <Icon size={20} aria-hidden />
              </span>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.3rem' }}>{title}</h3>
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {detail}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {action}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        style={{
          marginBottom: '2rem',
          padding: '1.35rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--primary-200)',
          background: 'var(--primary-50)',
        }}
        aria-labelledby="demo-heading"
      >
        <h2 id="demo-heading" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          Demo environment
        </h2>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          This deployment uses a disposable demo inbox for system and support mail:{' '}
          <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{support.notificationInboxEmail}</strong>.
          Open{' '}
          <a
            href={support.yopmailWebmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
          >
            YOPmail
            <ExternalLink size={14} aria-hidden />
          </a>{' '}
          and enter that mailbox name to read messages sent from the login support form or automated
          notifications.
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          Super admins can change support email and phone under Administration → Settings.
        </p>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/register" className="btn btn-primary">
          Register your institution
        </Link>
        <Link href="/about" className="btn btn-secondary">
          About PlacementHub
        </Link>
      </div>
    </MarketingPageShell>
  );
}
