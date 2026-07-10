'use client';

import Link from 'next/link';
import { Database, UserPlus, GraduationCap, Target, ArrowRight } from 'lucide-react';

const SCREENS = [
  {
    href: '/data-entry/users',
    title: 'Users',
    description: 'Create login users (student/college/employer) within your tenant.',
    icon: UserPlus,
  },
  {
    href: '/data-entry/student-profiles',
    title: 'Student Profiles',
    description: 'Attach academic profile data for student users.',
    icon: GraduationCap,
  },
  {
    href: '/data-entry/placement-drives',
    title: 'Placement Drives',
    description: 'Create real drives that appear in college metrics.',
    icon: Target,
  },
];

export default function DataEntryHubPage() {
  return (
    <div className="animate-fadeIn" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '2rem' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <h1 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
              <Database size={22} /> Data Entry Hub
            </h1>
          </div>
          <p className="text-secondary" style={{ marginTop: 0 }}>
            Use these standalone screens to insert live data into database tables via UI. <strong>Offer acceptance</strong> is not managed here — students respond on{' '}
            <strong>Dashboard → My Offers</strong>; employers and colleges use their dashboard <strong>Offers</strong> screens to view status.
          </p>
        </div>

        <div className="grid grid-2">
          {SCREENS.map((screen) => (
            <Link key={screen.href} href={screen.href} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card-header">
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <screen.icon size={18} />
                  {screen.title}
                </h2>
                <span className="badge badge-gray">Open</span>
              </div>
              <p className="text-secondary">{screen.description}</p>
              <div className="text-sm font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Go to screen <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
