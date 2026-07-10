'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Trophy,
  ArrowRight,
  UserCheck,
  FileText,
  Briefcase,
  Building2,
  CalendarPlus,
  Upload,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const STEP_ICONS = {
  academic: UserCheck,
  resume:   FileText,
  apply:    Briefcase,
  profile:  Building2,
  drive:    CalendarPlus,
  offers:   Upload,
};

export default function OnboardingChecklist() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data, error, isLoading } = useSWR(userId ? '/api/user/onboarding' : null, fetcher);

  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (userId) {
      // sessionStorage: resets on browser close, matching our session-cookie auth
      const isDismissed = sessionStorage.getItem(`onboarding_dismissed_${userId}`);
      if (isDismissed !== 'true') setDismissed(false);
    }
  }, [userId]);

  if (isLoading || error || !data?.progress) return null;
  if (dismissed || data.progress.isComplete) return null;

  const { steps } = data.progress;
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const nextStep = steps.find((s) => !s.completed);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    if (userId) sessionStorage.setItem(`onboarding_dismissed_${userId}`, 'true');
  };

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1rem',
        overflow: 'hidden',
      }}
    >
      {/* ── Collapsed header (always visible) ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.625rem 0.875rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Trophy icon */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Trophy size={14} style={{ color: 'var(--primary-600)' }} />
        </div>

        {/* Title + mini progress bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Getting Started
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--primary-600)',
                background: 'var(--primary-50)',
                border: '1px solid var(--primary-200)',
                borderRadius: '999px',
                padding: '0.1rem 0.45rem',
              }}
            >
              {completedCount}/{totalCount}
            </span>
          </div>
          {/* thin progress track */}
          <div
            style={{
              marginTop: '0.3rem',
              height: 3,
              background: 'var(--gray-100)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'var(--primary-500)',
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Dismiss × */}
        <span
          role="button"
          tabIndex={0}
          onClick={handleDismiss}
          onKeyDown={(e) => e.key === 'Enter' && handleDismiss(e)}
          title="Dismiss"
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            padding: '0.2rem 0.35rem',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Dismiss getting started guide"
        >
          ✕
        </span>

        {expanded ? (
          <ChevronUp size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        ) : (
          <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        )}
      </button>

      {/* ── Expanded steps ── */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border-default)',
            padding: '0.5rem 0.5rem 0.625rem',
          }}
        >
          {steps.map((step) => {
            const Icon = STEP_ICONS[step.id] || Circle;
            const isCompleted = step.completed;
            const isNext = step === nextStep;

            return (
              <Link
                key={step.id}
                href={step.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.45rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  background: isNext ? 'var(--primary-50)' : 'transparent',
                  marginBottom: '0.15rem',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isNext) e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isNext ? 'var(--primary-50)' : 'transparent';
                }}
              >
                {/* Step icon circle */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCompleted
                      ? 'var(--success-500)'
                      : isNext
                      ? 'var(--primary-600)'
                      : 'var(--bg-secondary)',
                    border: `1.5px solid ${
                      isCompleted
                        ? 'var(--success-400)'
                        : isNext
                        ? 'var(--primary-600)'
                        : 'var(--gray-300)'
                    }`,
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={13} style={{ color: '#fff' }} />
                  ) : (
                    <Icon size={12} style={{ color: isNext ? '#fff' : 'var(--text-tertiary)' }} />
                  )}
                </div>

                {/* Label */}
                <span
                  style={{
                    flex: 1,
                    fontSize: '0.8125rem',
                    fontWeight: isNext ? 600 : 500,
                    color: isCompleted
                      ? 'var(--text-tertiary)'
                      : 'var(--text-primary)',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    textDecorationColor: 'var(--text-tertiary)',
                  }}
                >
                  {step.title}
                </span>

                {/* Arrow for next step */}
                {isNext && (
                  <ArrowRight size={12} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
