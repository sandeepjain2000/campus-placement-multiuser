import { query } from '@/lib/db';
import Link from 'next/link';
import DemoAccountLoginLink from '@/components/auth/DemoAccountLoginLink';
import { ArrowLeft, GraduationCap, Building2, School, ShieldCheck, Award, ClipboardList } from 'lucide-react';
import { DEMO_SEED_PASSWORD } from '@/lib/demoLogins';
import { demoAccountLine1, demoAccountRowStyles } from '@/lib/demoAccountDisplay';
import { writePlatformErrorLog } from '@/lib/platformErrorLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function DemoAccountRow({ user, isLast, accentColor }) {
  const inactive = user.is_active === false;
  return (
    <DemoAccountLoginLink
      email={user.email}
      style={{
        ...demoAccountRowStyles.link,
        borderBottom: isLast ? 'none' : '1px solid var(--border-default)',
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
        opacity: inactive ? 0.55 : 1,
      }}
      className="demo-account-row-hover"
      title={inactive ? `${user.email} (inactive — may not sign in)` : user.email}
    >
      <div style={demoAccountRowStyles.line1} title={demoAccountLine1(user)}>
        {demoAccountLine1(user)}
      </div>
      <div style={demoAccountRowStyles.line2} title={user.email}>
        {user.email}
      </div>
    </DemoAccountLoginLink>
  );
}

function DemoAccountGroup({ group, users }) {
  const Icon = group.icon;
  if (!users.length) return null;

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          background: group.bg,
          borderBottom: `1px solid ${group.border}`,
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: group.color,
          fontWeight: 700,
          letterSpacing: '0.025em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
        }}
      >
        <Icon size={15} aria-hidden />
        {group.label} ({users.length})
      </div>
      <div>
        {users.map((user, i) => (
          <DemoAccountRow key={user.email} user={user} isLast={i === users.length - 1} accentColor={group.color} />
        ))}
      </div>
    </div>
  );
}

export default async function DemoAccountsPage() {
  await writePlatformErrorLog({
    context: 'demo_accounts_open',
    severity: 'info',
    statusCode: 200,
    error: new Error('Demo accounts page render triggered'),
    userMessage: 'Demo accounts page opened',
    details: {
      timestamp: new Date().toISOString(),
    }
  }).catch(() => {});

  const result = await query(`
    SELECT 
      u.id, u.email, u.role, u.is_active, u.first_name, u.last_name,
      t.name as college_name,
      ep.company_name,
      COALESCE(sp.is_alumni, false) AS is_alumni
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    LEFT JOIN employer_profiles ep ON u.id = ep.user_id
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    ORDER BY u.is_active DESC, u.role, u.email
  `);

  const users = result.rows;
  const activeCount = users.filter((u) => u.is_active !== false).length;
  const inactiveCount = users.length - activeCount;

  const groups = [
    { key: 'student', label: 'Students', icon: GraduationCap, bg: 'var(--primary-50)', color: 'var(--primary-700)', border: 'var(--primary-200)' },
    { key: 'alumni', label: 'Alumni', icon: Award, bg: 'var(--accent-50, #f5f3ff)', color: 'var(--accent-700, #6d28d9)', border: 'var(--accent-200, #ddd6fe)' },
    { key: 'employer', label: 'Employers', icon: Building2, bg: 'var(--success-50)', color: 'var(--success-700)', border: 'var(--success-200)' },
    { key: 'college_admin', label: 'College Admins', icon: School, bg: 'var(--warning-50)', color: 'var(--warning-700)', border: 'var(--warning-200)' },
    { key: 'placement_committee', label: 'Placement Committees', icon: ClipboardList, bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
    { key: 'super_admin', label: 'Super Admins', icon: ShieldCheck, bg: 'var(--danger-50)', color: 'var(--danger-700)', border: 'var(--danger-200)' },
  ];

  const students = users.filter((u) => u.role === 'student' && !u.is_alumni);
  const alumni = users.filter((u) => u.role === 'student' && u.is_alumni);
  const employers = users.filter((u) => u.role === 'employer');
  const collegeAdmins = users.filter((u) => u.role === 'college_admin');
  const placementCommittees = users.filter((u) => u.role === 'placement_committee');
  const superAdmins = users.filter((u) => u.role === 'super_admin');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem', letterSpacing: '-0.025em' }}>
              System Accounts
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              All login accounts for demo and testing. Each row shows name/context and email (dimmed = inactive).
            </p>
          </div>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <ArrowLeft size={16} aria-hidden />
            Back to Login
          </Link>
        </div>

        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          <strong>Password:</strong>{' '}
          <code style={{ background: 'var(--bg-secondary)', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 700, color: 'var(--text-primary)' }}>
            {DEMO_SEED_PASSWORD}
          </code>
          <span style={{ margin: '0 0.75rem' }}>·</span>
          <span>
            {users.length} accounts ({activeCount} active
            {inactiveCount ? `, ${inactiveCount} inactive` : ''})
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          <DemoAccountGroup group={groups[0]} users={students} />
          <DemoAccountGroup group={groups[1]} users={alumni} />
          <DemoAccountGroup group={groups[2]} users={employers} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <DemoAccountGroup group={groups[5]} users={superAdmins} />
            <DemoAccountGroup group={groups[3]} users={collegeAdmins} />
            <DemoAccountGroup group={groups[4]} users={placementCommittees} />
          </div>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `.demo-account-row-hover:hover { background-color: var(--bg-secondary); }`,
        }}
      />
    </div>
  );
}
