'use client';

import useSWR from 'swr';
import { Trophy } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import CompanyNameLink from '@/components/CompanyNameLink';
import StudentApplyResumeBanner from '@/components/StudentApplyResumeBanner';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';
import StudentApplyEligibilityControls from '@/components/student/StudentApplyEligibilityControls';
import PageLoading from '@/components/PageLoading';
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
  const placementLocked = data?.placementLocked === true;
  const applyBlockedReason = data?.applyBlockedReason || '';
  const currentStudent = buildStudentApplyContext(data);
  const canApply = data?.canApply !== false;
  const globalBlockedReason = globalApplyBlockedReason(canApply, applyBlockedReason);

  const { startApply, pickerModal } = useProgramApplicationWithCv({ addToast, mutate });

  const apply = async (jobId, title) => {
    const row = items.find((i) => i.id === jobId);
    const blockReason = row
      ? resolveApplyBlockReason(programOpportunityFromRow(row), currentStudent, { globalBlockedReason })
      : null;
    if (blockReason) return;
    startApply(jobId, title);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Trophy size={28} className="text-secondary" strokeWidth={1.5} />
            Browse Hackathons
          </h1>
          <p className="text-secondary">
            Hackathons published for your campus. Apply when you meet the criteria — track submissions under My Hackathons in My
            Applications.
          </p>
        </div>
      </div>

      <StudentApplyResumeBanner
        canApply={canApply}
        placementLocked={placementLocked}
        applyBlockedReason={applyBlockedReason}
      />

      {isLoading && <PageLoading message="Loading hackathons…" inline />}
      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            {error.message}
            {/job_posting_visibility|program_applications|member_tenant_id|does not exist/i.test(error.message) ? (
              <>
                {' '}
                Run <code className="text-xs">006_job_visibility_program_applications.sql</code> (adds{' '}
                <code className="text-xs">member_tenant_id</code> + visibility tables) or{' '}
                <code className="text-xs">004_group_tenants_student_affiliation.sql</code>, then reload.
              </>
            ) : null}
          </p>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="card">
          <p className="text-secondary" style={{ margin: 0 }}>
            No published hackathons for your campus yet. Employers post these from Projects (hackathon type) and select your college.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {items.map((row) => (
          <div key={row.id} className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="font-semibold text-lg">{row.title}</span>
                  <span className="badge badge-amber">Hackathon</span>
                </div>
                <div className="text-sm text-secondary">
                  <CompanyNameLink name={row.companyName} website={row.website} />
                </div>
                {row.description && (
                  <p className="text-sm" style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    {row.description}
                  </p>
                )}
                <div className="text-sm text-tertiary" style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {row.salaryMin != null || row.salaryMax != null ? (
                    <span>
                      Prize / stipend: {formatCurrency(row.salaryMin || row.salaryMax)}
                      {row.salaryMax != null && row.salaryMin != null && Number(row.salaryMax) !== Number(row.salaryMin)
                        ? ` – ${formatCurrency(row.salaryMax)}`
                        : ''}
                    </span>
                  ) : null}
                  {row.minCgpa != null ? <span>Min CGPA: {row.minCgpa}</span> : null}
                  {row.vacancies != null ? <span>Slots: {row.vacancies}</span> : null}
                  {row.applicationDeadline ? <span>Deadline: {formatDate(row.applicationDeadline)}</span> : null}
                </div>
                {row.skillsRequired?.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {row.skillsRequired.map((s) => (
                      <span key={s} className="badge badge-gray">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {!row.hasApplied ? (
                  <div style={{ marginTop: '1rem' }}>
                    <PostingEligibilitySection
                      opportunity={programOpportunityFromRow(row)}
                      student={currentStudent}
                      audience="student"
                    />
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', minWidth: '11rem' }}>
                {row.hasApplied ? (
                  <span className={`badge badge-${getStatusColor(row.applicationStatus)} badge-dot`}>
                    {formatStatus(row.applicationStatus)}
                  </span>
                ) : (
                  <StudentApplyEligibilityControls
                    opportunity={programOpportunityFromRow(row)}
                    student={currentStudent}
                    applyLabel="Apply"
                    globalBlockedReason={globalBlockedReason}
                    onApply={() => apply(row.id, row.title)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {pickerModal}
    </div>
  );
}
