'use client';

import useSWR from 'swr';
import { GraduationCap } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function StudentInternshipsPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/student/program-opportunities?kind=internship', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  const items = data?.items || [];

  const apply = async (jobId, title) => {
    try {
      const res = await fetch('/api/student/program-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json.error || 'Could not apply', 'error');
        return;
      }
      addToast(`Applied to ${title}`, 'success');
      mutate();
    } catch {
      addToast('Network error', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <GraduationCap size={28} className="text-secondary" strokeWidth={1.5} />
            Internships
          </h1>
          <p className="text-secondary">
            Published internships your college is included on. Apply here — no dummy listings.
          </p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-secondary">Loading…</p>}
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
            No published internships for your campus right now. When an employer publishes one and selects your college, it will
            appear here.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {items.map((row) => (
          <div key={row.id} className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="font-semibold text-lg">{row.title}</div>
                <div className="text-sm text-secondary">{row.companyName}</div>
                {row.description && (
                  <p className="text-sm" style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    {row.description}
                  </p>
                )}
                <div className="text-sm text-tertiary" style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {row.salaryMin != null || row.salaryMax != null ? (
                    <span>
                      Stipend: {formatCurrency(row.salaryMin || row.salaryMax)}
                      {row.salaryMax != null && row.salaryMin != null && Number(row.salaryMax) !== Number(row.salaryMin)
                        ? ` – ${formatCurrency(row.salaryMax)}`
                        : ''}{' '}
                      / mo
                    </span>
                  ) : null}
                  {row.minCgpa != null ? <span>Min CGPA: {row.minCgpa}</span> : null}
                  {row.vacancies != null ? <span>Openings: {row.vacancies}</span> : null}
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
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                {row.hasApplied ? (
                  <span className={`badge badge-${getStatusColor(row.applicationStatus)} badge-dot`}>
                    {formatStatus(row.applicationStatus)}
                  </span>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => apply(row.id, row.title)}>
                    Apply
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
