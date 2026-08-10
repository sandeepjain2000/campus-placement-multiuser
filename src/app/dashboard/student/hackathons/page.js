'use client';

import useSWR from 'swr';
import { BookOpen, Calendar, IndianRupee, Trophy } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import CompanyNameLink from '@/components/CompanyNameLink';
import StudentApplyResumeBanner from '@/components/StudentApplyResumeBanner';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';
import StudentApplyEligibilityControls from '@/components/student/StudentApplyEligibilityControls';
import PageLoading from '@/components/PageLoading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  globalApplyBlockedReason,
  resolveApplyBlockReason,
} from '@/lib/getApplyBlockReason';
import { buildStudentApplyContext, programOpportunityFromRow } from '@/lib/studentApplyContext';
import { useProgramApplicationWithCv } from '@/components/student/StudentCvApply';

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function StudentHackathonsPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/student/program-opportunities?kind=hackathon', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  const items = data?.items || [];
  const totalCount = items.length;
  const placementLocked = data?.placementLocked === true;
  const applyBlockedReason = data?.applyBlockedReason || '';
  const currentStudent = buildStudentApplyContext(data);
  const canApply = data?.canApply !== false;
  const globalBlockedReason = globalApplyBlockedReason(canApply, applyBlockedReason);

  const { startApply, applyingId, pickerModal } = useProgramApplicationWithCv({ addToast, mutate });

  const apply = async (jobId, title) => {
    const row = items.find((i) => i.id === jobId);
    const blockReason = row
      ? resolveApplyBlockReason(programOpportunityFromRow(row), currentStudent, { globalBlockedReason })
      : null;
    if (blockReason) return;
    startApply(jobId, title);
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Trophy className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Browse Hackathons
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Hackathons published for your campus. Apply when you meet the criteria — track submissions under My Hackathons
            in My Applications.
          </p>
        </div>
        {!isLoading && !error && totalCount > 0 ? (
          <StatusBadge tone="blue" className="px-3 py-1 text-sm">
            {totalCount} hackathon{totalCount !== 1 ? 's' : ''} available
          </StatusBadge>
        ) : null}
      </div>

      <StudentApplyResumeBanner
        canApply={canApply}
        placementLocked={placementLocked}
        applyBlockedReason={applyBlockedReason}
      />

      {isLoading && <PageLoading message="Loading hackathons…" inline />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load hackathons</AlertTitle>
          <AlertDescription>
            {error.message}
            {/job_posting_visibility|program_applications|member_tenant_id|does not exist/i.test(error.message) ? (
              <>
                {' '}
                Run <code className="text-xs">006_job_visibility_program_applications.sql</code> (adds{' '}
                <code className="text-xs">member_tenant_id</code> + visibility tables) or{' '}
                <code className="text-xs">004_group_tenants_student_affiliation.sql</code>, then reload.
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && totalCount === 0 && (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
              <Trophy className="size-7" />
            </div>
            <CardTitle className="mb-1 text-lg">No hackathons available</CardTitle>
            <CardDescription className="max-w-md text-sm">
              No published hackathons for your campus yet. Employers post these from Projects (hackathon type) and select
              your college.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && totalCount > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((row) => (
            <Card key={row.id} size="sm" className="gap-3">
              <CardHeader className="gap-2 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <StatusBadge tone="amber" showDot>
                    Hackathon
                  </StatusBadge>
                  {row.hasApplied ? (
                    <StatusBadge status={row.applicationStatus || 'applied'} showDot>
                      {formatStatus(row.applicationStatus) || 'Applied'}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="gray" showDot>
                      Open
                    </StatusBadge>
                  )}
                </div>
                <CardDescription>
                  <CompanyNameLink name={row.companyName} website={row.website} />
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4">
                {row.description ? (
                  <p className="text-muted-foreground m-0 text-sm leading-relaxed whitespace-pre-wrap">
                    {row.description}
                  </p>
                ) : null}
                <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
                  {row.salaryMin != null || row.salaryMax != null ? (
                    <span className="inline-flex items-center gap-1">
                      <IndianRupee className="size-3.5" aria-hidden />
                      Prize / stipend: {formatCurrency(row.salaryMin || row.salaryMax)}
                      {row.salaryMax != null &&
                      row.salaryMin != null &&
                      Number(row.salaryMax) !== Number(row.salaryMin)
                        ? ` – ${formatCurrency(row.salaryMax)}`
                        : ''}
                    </span>
                  ) : null}
                  {row.minCgpa != null ? (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3.5" aria-hidden />
                      Min CGPA: {row.minCgpa}
                    </span>
                  ) : null}
                  {row.vacancies != null ? <span>Slots: {row.vacancies}</span> : null}
                  {row.applicationDeadline ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5" aria-hidden />
                      Deadline: {formatDate(row.applicationDeadline)}
                    </span>
                  ) : null}
                </div>
                {row.skillsRequired?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {row.skillsRequired.map((s) => (
                      <StatusBadge key={s} tone="gray">
                        {s}
                      </StatusBadge>
                    ))}
                  </div>
                ) : null}
                {!row.hasApplied ? (
                  <PostingEligibilitySection
                    opportunity={programOpportunityFromRow(row)}
                    student={currentStudent}
                    audience="student"
                  />
                ) : null}
                <div className="flex justify-end border-t pt-3">
                  {row.hasApplied ? (
                    <StatusBadge status={row.applicationStatus || 'applied'} showDot>
                      {formatStatus(row.applicationStatus) || 'Applied'}
                    </StatusBadge>
                  ) : (
                    <StudentApplyEligibilityControls
                      opportunity={programOpportunityFromRow(row)}
                      student={currentStudent}
                      applyLabel="Apply"
                      globalBlockedReason={globalBlockedReason}
                      applying={applyingId === row.id}
                      onApply={() => apply(row.id, row.title)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      {pickerModal}
    </div>
  );
}
