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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    userId && role !== 'placement_committee' ? '/api/user/onboarding' : null,
    onboardingFetcher,
  );

  if (sessionStatus === 'loading' || (userId && isLoading)) {
    return <PageLoading message="Loading getting started…" variant="skeleton-card" />;
  }

  if (!userId) {
    return (
      <Card className="animate-fadeIn"><CardContent className="text-muted-foreground py-10 text-center">Sign in to view your setup checklist.</CardContent></Card>
    );
  }

  if (role === 'placement_committee') {
    return (
      <div className="animate-fadeIn flex flex-col gap-6 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">
            Getting Started
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Placement Committee onboarding
          </p>
        </div>
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader className="items-center text-center">
          <Rocket className="text-muted-foreground size-7" aria-hidden />
          <CardTitle>Coming soon…</CardTitle>
          <CardDescription>
            A Placement Committee setup checklist is not available yet. Use Dashboard to browse campus placement activity.
          </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
          <Button render={<Link href="/dashboard/college/overview" />} variant="outline" size="sm">
            Go to Dashboard
          </Button>
          </CardContent>
        </Card>
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
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex max-w-3xl flex-col gap-1">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <Rocket className="text-muted-foreground size-7" strokeWidth={1.5} /> Getting Started
        </h1>
        <p className="text-muted-foreground m-0 text-sm">{intro}</p>
      </div>

      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
              <Trophy className="size-5" />
            </div>
            <div>
              <CardTitle>{isComplete ? 'You’re all set!' : 'Account setup progress'}</CardTitle>
              <CardDescription>
                {isComplete ? 'You have completed all recommended setup steps.' : `${completedCount} of ${totalCount} steps completed.`}
              </CardDescription>
            </div>
          </div>
          <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-primary h-full rounded-full transition-[width]" style={{ width: `${progressPercent}%` }} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {steps.length === 0 ? (
            <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center">
              <p className="text-foreground m-0 font-medium">No setup steps are available</p>
              <p className="mt-2 mb-4 text-sm">Refresh the checklist or open <Link href={homeHref} className="text-primary underline">Dashboard</Link>.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>Refresh checklist</Button>
            </div>
          ) : null}
          {steps.map((step) => {
            const Icon = STEP_ICONS[step.id] || Circle;
            const isCompleted = step.completed;
            const isNext = step === nextStep;
            return (
              <Button
                key={step.id}
                render={<Link href={step.href} />}
                variant={isNext ? 'secondary' : 'outline'}
                className="h-auto w-full justify-start gap-4 px-4 py-3 text-left"
              >
                <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                  {isCompleted ? <CheckCircle2 /> : <Icon />}
                </span>
                <span className="flex flex-1 flex-col items-start">
                  <span className={isCompleted ? 'text-muted-foreground line-through' : ''}>{step.title}</span>
                  <span className="text-muted-foreground text-xs font-normal">{isCompleted ? 'Completed' : isNext ? 'Continue setup' : 'Pending'}</span>
                </span>
                {isCompleted ? <CheckCircle2 /> : <ArrowRight />}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
