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
    <div style={{ background: '#FFFFFF', color: '#111827', minHeight: '100vh' }}>
      {/* Top Navbar */}
      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 100, borderBottom: '1px solid var(--border-default)', background: '#FFFFFF' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.35rem',
            maxWidth: 'min(380px, 46vw)',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--primary-600)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>P</div>
            PlacementHub
          </div>
          <div
            title="Build baked in at deploy time (NEXT_PUBLIC_* from next.config)"
            style={{
              fontSize: '0.625rem',
              lineHeight: 1.4,
              color: '#6B7280',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          >
            v{appVersion}
            {gitSha ? ` · ${gitSha}` : ''}
            {vercelEnv ? ` · ${vercelEnv}` : ''}
            <br />
            build {buildLabel}
            {deployId ? (
              <>
                <br />
                deploy {deployId}
              </>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              fontSize: '0.7rem',
              padding: '0.25rem 0.55rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-default)',
            }}
            onClick={() => downloadClientDebugLog()}
          >
            <Download size={13} aria-hidden />
            Save debug log
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, paddingTop: '0.15rem' }}>
          <Link href="/data-entry" className="btn btn-ghost" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Database size={16} /> Data entry
          </Link>
          <Link href="/email-notifications" className="btn btn-ghost" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Mail size={16} /> Email workflows
          </Link>
          <Link href="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ paddingTop: '10rem', paddingBottom: '6rem', textAlign: 'center', background: '#FFFFFF' }}>
        <div className="animate-fadeIn" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            <Rocket size={16} className="text-primary-600" /> India&apos;s #1 Campus Recruitment Platform
          </div>
          <h1 style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '1.5rem', color: '#111827' }}>
            Transform Your <br />
            <span style={{ color: 'var(--primary-600)' }}>Campus Placements</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#4B5563', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            Connect students, employers, and colleges on a single intelligent platform. 
            Streamline drives, automate hiring pipelines, and track every offer in real-time.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/register" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
              Get Started Free <ArrowRight size={20} />
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '4rem', borderTop: '1px solid var(--border-default)', paddingTop: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>500+</div>
              <div style={{ color: '#6B7280', fontWeight: 500 }}>Colleges</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>10K+</div>
              <div style={{ color: '#6B7280', fontWeight: 500 }}>Students Placed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>200+</div>
              <div style={{ color: '#6B7280', fontWeight: 500 }}>Employers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>₹12L</div>
              <div style={{ color: '#6B7280', fontWeight: 500 }}>Avg. Package</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '6rem 2rem', background: '#F9FAFB' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '800px', margin: '0 auto 4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: '#111827' }}>
            Everything You Need for <span style={{ color: 'var(--primary-600)' }}>Seamless Placements</span>
          </h2>
          <p style={{ color: '#4B5563', fontSize: '1.125rem' }}>
            From drive scheduling to offer management — one platform to rule them all.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <GraduationCap size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Student Portal
            </h3>
            <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
              Complete profile management, resume builder, skill tracking, document uploads, and one-click applications to placement drives.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Building2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Employer Dashboard
            </h3>
            <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
              Post jobs, set eligibility criteria, schedule drives, manage hiring pipelines, and publish offers — all from one place.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <School size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              College Management
            </h3>
            <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
              Verify students, configure placement rules, manage calendars, approve employers, and generate comprehensive reports.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(225, 29, 72, 0.1)', color: 'var(--danger-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <BarChart3 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Real-time Analytics
            </h3>
            <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
              Placement rates, salary trends, department-wise stats, employer reliability scores, and year-over-year comparisons.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--info-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <CalendarDays size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Smart Scheduling
            </h3>
            <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
              Calendar integration, conflict detection, academic blocking, buffer days, and facility booking for seamless drive management.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Multi-Tenant & Secure
            </h3>
            <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
              Complete data isolation, role-based access, audit logs, and enterprise-grade security for every college on the platform.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center', background: '#FFFFFF', borderTop: '1px solid var(--border-default)' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>
          Ready to Transform Placements?
        </h2>
        <p style={{ color: '#4B5563', fontSize: '1.125rem', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
          Join 500+ colleges already using PlacementHub to drive better outcomes.
        </p>
        <Link href="/register" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
          Start Free Trial <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2.5rem', textAlign: 'center', borderTop: '1px solid var(--border-default)', background: '#F9FAFB', color: '#6B7280', fontSize: '0.875rem' }}>
        © 2026 PlacementHub. All rights reserved. | Built with rigorous design intelligence.
      </footer>
    </div>
  );
}
