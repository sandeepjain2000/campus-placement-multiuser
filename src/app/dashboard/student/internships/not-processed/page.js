'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { GraduationCap, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { buildStudentOpportunityCsvPayload } from '@/lib/studentOpportunityCsvExport';

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function StudentNotProcessedInternshipsPage() {
  const { data, error, isLoading } = useSWR('/api/student/internships/not-processed', fetcher, {
    revalidateOnFocus: true,
  });

  const items = data?.items || [];
  const locked = data?.locked === true;
  const selected = data?.selectedInternship;

  const buildCsvRows = () => {
    const headers = ['Company', 'Role', 'Stipend (INR/mo)', 'Deadline', 'Reason'];
    const rows = items.map((row) => [
      row.companyName || '',
      row.title || '',
      row.salaryMin != null || row.salaryMax != null
        ? formatCurrency(row.salaryMin || row.salaryMax)
        : '',
      row.applicationDeadline ? formatDate(row.applicationDeadline) : '',
      row.notProcessedReason || 'Not processed after internship selection',
    ]);
    return { headers, rows };
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lock size={26} className="text-secondary" strokeWidth={1.5} />
            Not Processed Internships
          </h1>
          <p className="text-secondary">
            Read-only list of internships you could not apply to after FCFS internship selection (max 1 per student).
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {items.length > 0 ? (
            <ExportCsvSplitButton
              filenameBase="not_processed_internships"
              currentCount={items.length}
              fullCount={items.length}
              getRows={buildCsvRows}
              size="sm"
            />
          ) : null}
          <Link href="/dashboard/student/internships" className="btn btn-secondary btn-sm">
            <GraduationCap size={16} style={{ marginRight: '0.35rem' }} />
            Browse internships
          </Link>
        </div>
      </div>

      {isLoading && !error ? <PageLoading message="Loading…" inline /> : null}

      {!isLoading && error ? (
        <div className="card" style={{ borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>{error.message}</p>
        </div>
      ) : null}

      {!isLoading && !error && !locked ? (
        <div
          className="card"
          style={{
            padding: '1.25rem 1.5rem',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
          }}
        >
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            You are not locked by an internship selection yet. When a company selects you for an internship, other open
            internships you did not apply to will appear here.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && locked && selected ? (
        <div
          role="status"
          className="card"
          style={{
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            borderColor: 'var(--primary-200)',
            background: 'var(--primary-50)',
          }}
        >
          <p className="text-sm" style={{ margin: 0, lineHeight: 1.55 }}>
            Selected internship:{' '}
            <strong>{selected.companyName}</strong> — {selected.title}. Other internships below were not processed
            because you cannot apply after selection.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && locked && items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            No additional not-processed internships. You either applied to all other visible openings before selection,
            or no other internships were published for your campus.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <div className="card card-table-shell">
          <div className="table-container">
            <table className="data-table student-opportunities-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1rem' }}>Company</th>
                  <th>Role</th>
                  <th>Stipend</th>
                  <th>Deadline</th>
                  <th style={{ paddingRight: '1rem' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td style={{ paddingLeft: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <EntityLogo name={row.companyName} size="sm" shape="rounded" />
                        <span className="cell-truncate font-semibold">
                          <CompanyNameLink name={row.companyName} website={row.website} />
                        </span>
                      </div>
                    </td>
                    <td className="cell-truncate">{row.title}</td>
                    <td className="text-sm">
                      {row.salaryMin != null || row.salaryMax != null
                        ? `${formatCurrency(row.salaryMin || row.salaryMax)} /mo`
                        : '—'}
                    </td>
                    <td className="text-sm">
                      {row.applicationDeadline ? formatDate(row.applicationDeadline) : '—'}
                    </td>
                    <td className="text-sm text-secondary" style={{ paddingRight: '1rem' }}>
                      Not applied — blocked after FCFS selection
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
