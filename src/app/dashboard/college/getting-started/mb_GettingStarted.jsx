'use client';
import useSWR from 'swr';
import Link from 'next/link';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Circle, ArrowRight, UserCheck, FileText, Briefcase, Building2, CalendarPlus, Upload, Settings, Users, Inbox, Rocket, Trophy } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const STEP_ICONS = {
  academic: UserCheck,
  resume: FileText,
  apply: Briefcase,
  profile: Building2,
  drive: CalendarPlus,
  offers: Upload,
  settings: Settings,
  employers: Building2,
  students: Users,
  colleges: Building2,
};

export default function mb_GettingStarted() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data, error, isLoading } = useSWR(userId ? '/api/user/onboarding' : null, fetcher);

  const steps = data?.progress?.steps || [];
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
  const nextStep = steps.find((s) => !s.completed);
  const isComplete = data?.progress?.isComplete || completedCount === totalCount;

  return (
    <>
      <MobileHeader title="Getting Started" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center', background: 'var(--banner-gradient)', color: 'white' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Rocket size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', fontWeight: 800 }}>Welcome!</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            Complete these setup steps to get your campus placement office fully operational.
          </p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="skeleton" style={{ height: 100, borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: 80, borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: 80, borderRadius: '12px' }} />
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '1rem', color: 'var(--danger-600)', textAlign: 'center' }}>
            Failed to load onboarding steps.
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--primary-200)', background: 'var(--primary-50)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Trophy size={20} style={{ color: 'var(--primary-600)' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isComplete ? 'All Set!' : 'Setup Progress'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {completedCount} of {totalCount} steps completed
                  </div>
                </div>
              </div>
              <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--primary-600)', borderRadius: 999 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {steps.map((step) => {
                const Icon = STEP_ICONS[step.id] || Circle;
                const isCompleted = step.completed;
                const isNext = step === nextStep;

                return (
                  <Link
                    key={step.id}
                    href={step.href}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      textDecoration: 'none',
                      background: isNext ? 'var(--primary-600)' : 'var(--bg-primary)',
                      border: isNext ? 'none' : '1px solid var(--border-default)',
                      color: isNext ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isCompleted ? 'var(--success-100)' : isNext ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                      color: isCompleted ? 'var(--success-600)' : isNext ? 'white' : 'var(--text-tertiary)',
                    }}>
                      {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.95rem', fontWeight: 600,
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        color: isCompleted ? 'var(--text-tertiary)' : isNext ? 'white' : 'var(--text-primary)',
                      }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isNext ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {isCompleted ? 'Completed' : isNext ? 'Tap to continue' : 'Pending'}
                      </div>
                    </div>

                    <div style={{
                      color: isNext ? 'white' : 'var(--text-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isCompleted ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
