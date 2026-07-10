'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket,
  GraduationCap,
  Building2,
  School,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  Mail,
  Database,
  Download,
} from 'lucide-react';
import { appendClientDebugLog, downloadClientDebugLog } from '@/lib/clientDebugLog';

export default function LandingPage() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '?';
  const buildTimeIso = process.env.NEXT_PUBLIC_BUILD_TIME || '';
  const gitSha = process.env.NEXT_PUBLIC_APP_GIT_SHA || '';
  const deployId = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID || '';
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV || '';

  const buildLabel = buildTimeIso
    ? `${buildTimeIso.slice(0, 16).replace('T', ' ')} UTC`
    : '—';

  useEffect(() => {
    appendClientDebugLog({
      source: 'landing',
      action: 'view',
      version: appVersion,
      buildTime: buildTimeIso || null,
      gitSha: gitSha || null,
      deploymentId: deployId || null,
    });
  }, [appVersion, buildTimeIso, gitSha, deployId]);

  return (
    <div className="landing-shell">
      {/* Top Navbar */}
      <header className="landing-header">
        <div className="landing-container py-5" style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="sm-flex-row sm-items-center sm-justify-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', height: '2.5rem', width: '2.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', backgroundColor: 'var(--primary-600)', color: '#ffffff', fontWeight: 'bold', fontSize: '1.125rem' }}>
                P
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>PlacementHub</h1>
                <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.25rem 0 0 0' }}>Campus Recruitment</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', marginRight: '1rem' }}>
                  <Link href="/data-entry" style={{ borderRadius: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <Database size={16} /> Data entry
                  </Link>
                  <Link href="/email-notifications" style={{ borderRadius: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <Mail size={16} /> Email workflows
                  </Link>
               </div>
               <Link href="/login" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  Sign In
               </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-container">
        {/* Hero Section */}
        <section className="landing-hero">
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            <div className="landing-badge">
              <Rocket size={16} style={{ color: 'var(--text-primary)' }} /> India&apos;s #1 Campus Recruitment Platform
            </div>
            <h1 className="landing-title">
              Transform Your <br />
              <span>Campus Placements</span>
            </h1>
            <p className="landing-subtitle">
              Connect students, employers, and colleges on a single intelligent platform. 
              Streamline drives, automate hiring pipelines, and track every offer in real-time.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <Link href="/register" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                Get Started Free <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
              </Link>
              <Link href="#features" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                Explore Features
              </Link>
            </div>
          </div>

          <div className="landing-stats-grid">
            {[
              { label: 'Colleges', value: '500+' },
              { label: 'Students Placed', value: '10K+' },
              { label: 'Employers', value: '200+' },
              { label: 'Avg. Package', value: '₹12L' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ paddingTop: '5rem', paddingBottom: '5rem', borderTop: '1px solid var(--border-default)' }}>
          <div style={{ textAlign: 'center', maxWidth: '42rem', margin: '0 auto 4rem auto' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
              Everything You Need for <span style={{ color: 'var(--text-tertiary)' }}>Seamless Placements</span>
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
              From drive scheduling to offer management — one platform to rule them all.
            </p>
          </div>

          <div className="landing-features-grid">
            {[
              {
                icon: GraduationCap,
                title: 'Student Portal',
                desc: 'Complete profile management, resume builder, skill tracking, document uploads, and one-click applications.',
              },
              {
                icon: Building2,
                title: 'Employer Dashboard',
                desc: 'Post jobs, set eligibility criteria, schedule drives, manage hiring pipelines, and publish offers.',
              },
              {
                icon: School,
                title: 'College Management',
                desc: 'Verify students, configure placement rules, manage calendars, approve employers, and generate reports.',
              },
              {
                icon: BarChart3,
                title: 'Real-time Analytics',
                desc: 'Placement rates, salary trends, department-wise stats, employer reliability scores, and year-over-year comparisons.',
              },
              {
                icon: CalendarDays,
                title: 'Smart Scheduling',
                desc: 'Calendar integration, conflict detection, academic blocking, buffer days, and facility booking.',
              },
              {
                icon: ShieldCheck,
                title: 'Multi-Tenant & Secure',
                desc: 'Complete data isolation, role-based access, audit logs, and enterprise-grade security for every college.',
              },
            ].map((feature) => (
              <div key={feature.title} className="landing-feature-card">
                <div className="landing-feature-icon">
                  <feature.icon size={24} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center', borderTop: '1px solid var(--border-default)' }}>
          <div style={{ borderRadius: '1.5rem', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-primary)', padding: '3rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', maxWidth: '56rem', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Ready to Transform Placements?
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto' }}>
              Join 500+ colleges already using PlacementHub to drive better outcomes.
            </p>
            <Link href="/register" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
              Start Free Trial
            </Link>
          </div>
        </section>
      </main>

      <footer style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-primary)', paddingTop: '2rem', paddingBottom: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <p>© 2026 PlacementHub. All rights reserved. | Built with rigorous design intelligence.</p>
            <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                onClick={() => downloadClientDebugLog()}
            >
                <Download size={14} style={{ marginRight: '0.375rem' }} /> Save debug log
            </button>
        </div>
      </footer>
    </div>
  );
}
