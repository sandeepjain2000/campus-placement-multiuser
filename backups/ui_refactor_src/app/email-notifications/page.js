'use client';

import Link from 'next/link';
import { Mail, ArrowLeft, Bell, FileCheck, Users, CalendarClock } from 'lucide-react';

const WORKFLOWS = [
  {
    title: 'Drive approved',
    trigger: 'College approves a placement drive request',
    template: 'Drive {{company}} on {{date}} is approved. Next: confirm venue & slots.',
  },
  {
    title: 'Interview slot assigned',
    trigger: 'TPO publishes a slot with student names',
    template: 'You are scheduled for {{company}} — {{round}} on {{datetime}} ({{mode}}).',
  },
  {
    title: 'Offer released',
    trigger: 'Employer publishes an offer to a student',
    template: 'Offer from {{company}} is ready for review. Respond before {{deadline}}.',
  },
  {
    title: 'Clarification batch published',
    trigger: 'Placement committee posts up to 5 questions for a company',
    template: 'New clarification batch for {{company}} is live for all students.',
  },
];

export default function EmailNotificationsDemoPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <nav style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={16} /> Back to home
        </Link>
        <span className="text-sm text-secondary">Dummy preview — no email is sent from this screen</span>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
            <Mail size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Email &amp; notifications</h1>
            <p className="text-sm text-secondary" style={{ margin: '0.25rem 0 0' }}>
              Illustrates that important workflows trigger outbound email and in-app alerts. Copy and merge fields are indicative only.
            </p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} /> What recipients would see
          </h2>
          <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
            From: <strong>notifications@placementhub.app</strong> · Reply-to: placement cell or company as configured.
          </p>
          <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-tertiary)', fontFamily: 'var(--font-sans)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Subject</div>
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>[PlacementHub] Interview scheduled — TCS · Round 1</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Body</div>
            <div className="text-sm" style={{ lineHeight: 1.6 }}>
              Hi Arjun,
              <br />
              <br />
              You are scheduled for <strong>TCS — Round 1 (Technical)</strong> on <strong>1 Oct 2026, 10:30 AM</strong> (Virtual).
              <br />
              Please join from the dashboard link. Good luck!
            </div>
          </div>
        </div>

        <h2 className="text-sm font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
          Workflow triggers (sample)
        </h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {WORKFLOWS.map((w) => (
            <div key={w.title} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <FileCheck size={18} className="text-primary-600" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <div className="font-semibold">{w.title}</div>
                  <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                    When: {w.trigger}
                  </div>
                  <div className="text-sm text-secondary" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    “{w.template}”
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 className="card-title" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Audience segments
          </h3>
          <ul className="text-sm text-secondary" style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            <li>Students — applications, interviews, offers, reminders</li>
            <li>Employers — drive status, slot confirmations, new applications</li>
            <li>College admins — approvals, infrastructure, reports</li>
          </ul>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 className="card-title" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarClock size={18} /> Digest option
          </h3>
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            Daily digest combining non-urgent items (e.g. new discussion replies) can be enabled per tenant — shown here as a product placeholder.
          </p>
        </div>
      </div>
    </div>
  );
}
