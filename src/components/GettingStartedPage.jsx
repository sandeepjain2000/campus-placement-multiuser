'use client';

import useSWR from 'swr';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Trophy,
  ArrowRight,
  UserCheck,
  FileText,
  Briefcase,
  Building2,
  CalendarPlus,
  Upload,
  Settings,
  Users,
  Inbox,
  Rocket
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';

async function onboardingFetcher(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load onboarding steps');
  return json;
}

const STEP_ICONS = {
  academic: UserCheck,
  resume: FileText,
  apply: Briefcase,
  profile: Building2,
  campus: Building2,
  posting: Briefcase,
  drive: CalendarPlus,
  offers: Upload,
  applications: Inbox,
  settings: Settings,
  employers: Building2,
  students: Users,
  colleges: Building2,
  'onboard-orgs': Inbox,
};

const ROLE_INTRO = {
  student: 'Complete these steps to set up your profile and start applying.',
  studentAlumni: 'Complete your alumni profile and apply to lateral roles published for your campus network.',
  employer: 'Set up your company profile, connect with campuses, and run your first placement activity.',
  college_admin: 'Configure your campus, employers, and student records to go live.',
  super_admin: 'Review pending sign-ups and platform settings to onboard colleges and employers.',
};

const ROLE_HOME = {
  student: '/dashboard/student/overview',
  employer: '/dashboard/employer/overview',
  college_admin: '/dashboard/college/overview',
  super_admin: '/dashboard/admin',
};

export default function GettingStartedPage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const isAlumni = Boolean(session?.user?.isAlumni);
  const userId = session?.user?.id;
  const { data, error, isLoading, mutate } = useSWR(
    userId ? '/api/user/onboarding' : null,
    onboardingFetcher,
  );

  if (sessionStatus === 'loading' || (userId && isLoading)) {
    return <PageLoading message="Loading getting started…" variant="skeleton-card" />;
  }

  if (!userId) {
    return (
      <div className="card animate-fadeIn" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="text-secondary" style={{ margin: 0 }}>Sign in to view your setup checklist.</p>
      </div>
    );
  }

  if (error) {
    return (
      <PageError
        error={error}
        reset={() => {
          void mutate();
        }}
      />
    );
  }

  const steps = data?.progress?.steps || [];
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextStep = steps.find((s) => !s.completed);
  const isComplete = data?.progress?.isComplete || (totalCount > 0 && completedCount === totalCount);
  const homeHref = ROLE_HOME[role] || '/dashboard';

  const intro =
    (role === 'student' && isAlumni ? ROLE_INTRO.studentAlumni : ROLE_INTRO[role]) ||
    'Complete these steps to set up your account and get the most out of the platform.';

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* High-Fidelity Glassmorphic Hero Banner */}
      <div
        className="gradient-banner"
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          overflow: 'hidden',
          marginBottom: '2.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        {/* Decorative Elements */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <h1 className="gradient-banner-title" style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Rocket size={28} /> Getting Started
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--banner-fg-muted)', margin: 0, lineHeight: 1.5 }}>
            {intro}
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 800, margin: '0 auto', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
        {/* Header / Progress Section */}
        <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '16px', background: 'var(--primary-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary-200)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              <Trophy size={28} style={{ color: 'var(--primary-700)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {isComplete ? 'You’re All Set!' : 'Account Setup Progress'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 500 }}>
                {isComplete ? 'You have completed all the recommended setup steps.' : `You've completed ${completedCount} out of ${totalCount} steps.`}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div style={{ height: 10, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{
              height: '100%', width: `${progressPercent}%`,
              background: isComplete ? 'var(--success-500)' : 'linear-gradient(90deg, var(--primary-500), var(--primary-600))',
              borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>

        {/* Steps List */}
        <div style={{ padding: '1.5rem 2rem' }}>
          {steps.length === 0 ? (
            <div
              style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                No setup steps are available
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Try refreshing the page. If this persists, open{' '}
                <Link href={homeHref} style={{ fontWeight: 600 }}>
                  Dashboard
                </Link>{' '}
                or contact support.
              </p>
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={() => void mutate()}>
                Refresh checklist
              </button>
            </div>
          ) : null}
          {steps.map((step) => {
            const Icon = STEP_ICONS[step.id] || Circle;
            const isCompleted = step.completed;
            const isNext = step === nextStep;

            return (
               <Link
                key={step.id}
                href={step.href}
                className="card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '1.25rem 1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  background: isNext ? 'var(--primary-50)' : 'var(--bg-primary)',
                  border: `1px solid ${isNext ? 'var(--primary-200)' : 'var(--border-default)'}`,
                  marginBottom: '0.75rem',
                  transition: 'all 0.2s ease',
                  boxShadow: isNext ? '0 4px 6px -1px rgba(79, 70, 229, 0.1)' : 'none',
                }}
              >
                {/* Step Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCompleted ? 'var(--success-100)' : isNext ? 'var(--primary-600)' : 'var(--bg-secondary)',
                  color: isCompleted ? 'var(--success-600)' : isNext ? 'white' : 'var(--text-tertiary)',
                }}>
                  {isCompleted ? (
                    <CheckCircle2 size={22} strokeWidth={2.5} />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>

                {/* Step Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1.1rem', fontWeight: isNext ? 800 : 600,
                    color: isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    textDecorationColor: 'var(--text-tertiary)',
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 500 }}>
                    {isCompleted ? 'Completed' : isNext ? 'Click here to continue' : 'Pending'}
                  </div>
                </div>

                {/* Action Arrow */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isNext ? 'var(--primary-600)' : 'transparent',
                  color: isNext ? '#fff' : 'var(--text-tertiary)',
                  border: isNext ? 'none' : '1px solid var(--border-default)',
                  transition: 'transform 0.2s ease',
                  transform: isNext ? 'translateX(0)' : 'none',
                }}>
                  {isCompleted ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
