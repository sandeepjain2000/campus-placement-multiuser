'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { UserX, Building2, Briefcase, GraduationCap, Target } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import { formatDate } from '@/lib/utils';
import { resolveEmployerActiveCampus } from '@/lib/employerActiveCampus';

const TABS = [
  { id: 'internship', label: 'Internships', icon: GraduationCap },
  { id: 'jobs', label: 'Alumni Jobs', icon: Briefcase },
  { id: 'placement', label: 'Placement', icon: Target },
];

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data;
};

export default function EmployerFcfsUnavailablePage() {
  const [tenantId, setTenantId] = useState('');
  const [tab, setTab] = useState('internship');
  const [campusName, setCampusName] = useState('');

  useEffect(() => {
    resolveEmployerActiveCampus().then(({ active }) => {
      if (active?.id) {
        setTenantId(active.id);
        setCampusName(active.name || '');
      }
    });
  }, []);

  const swrKey = tenantId ? `/api/employer/fcfs-unavailable?tenantId=${tenantId}&tab=${tab}` : null;
  const { data, error, isLoading } = useSWR(swrKey, fetcher);

  const items = data?.items || [];
  const counts = data?.counts || {};

  const tabDesc = useMemo(() => {
    if (tab === 'internship') {
      return 'Students already confirmed for an internship by another employer (first-come, first-served).';
    }
    if (tab === 'placement') {
      return 'Students already confirmed on a placement drive by another employer.';
    }
    return 'Students already confirmed on a job posting by another employer.';
  }, [tab]);

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserX size={28} /> Unavailable candidates (FCFS)
        </h1>
        <p className="text-secondary" style={{ margin: 0, maxWidth: 720, lineHeight: 1.55 }}>
          {tabDesc} They are hidden from your applicant list and online assessment grid. CSV rows with{' '}
          <strong>Select</strong> for these students are rejected.
        </p>
        {campusName ? (
          <p className="text-sm text-tertiary" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building2 size={14} /> Campus: <strong>{campusName}</strong>
            {' · '}
            <Link href="/dashboard/employer/select-campus">Change campus</Link>
          </p>
        ) : (
          <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--warning-700)' }}>
            Select an active campus from <Link href="/dashboard/employer/select-campus">Campus partnerships</Link> first.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const n = counts[t.id] ?? (active ? items.length : 0);
          return (
            <button
              key={t.id}
              type="button"
              className={active ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => setTab(t.id)}
            >
              <Icon size={16} />
              {t.label}
              <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>({n})</span>
            </button>
          );
        })}
      </div>

      {data?.fcfsEnabled === false && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem', borderColor: 'var(--warning-200)', background: 'var(--warning-50)' }}>
          <p style={{ margin: 0, color: 'var(--warning-800)' }}>
            FCFS is disabled for this campus in college rules. All students remain visible to every employer.
          </p>
        </div>
      )}

      {!tenantId ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary" style={{ margin: 0 }}>Choose a campus to load unavailable candidates.</p>
        </div>
      ) : isLoading ? (
        <PageLoading />
      ) : error ? (
        <div className="card" style={{ padding: '1.5rem', borderColor: 'var(--danger-200)' }}>
          <p style={{ color: 'var(--danger-700)', margin: 0 }}>{error.message}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <UserX size={40} style={{ opacity: 0.25, margin: '0 auto 1rem' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>No unavailable candidates on this tab</p>
          <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
            When another employer confirms a student first, they appear here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th>Student</th>
                  <th>Roll</th>
                  <th>Confirmed by</th>
                  <th>Opening</th>
                  <th>Via</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.studentProfileId}>
                    <td style={{ fontWeight: 600 }}>{row.studentName}</td>
                    <td className="font-mono text-sm">{row.rollNumber || '—'}</td>
                    <td>{row.claimingEmployerName}</td>
                    <td className="text-sm text-secondary">{row.openingTitle || '—'}</td>
                    <td>
                      <span className="badge badge-gray">{row.source === 'assessment' ? 'Assessment' : 'Applications'}</span>
                    </td>
                    <td className="text-sm text-secondary">
                      {row.claimedAt ? formatDate(row.claimedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-tertiary" style={{ marginTop: '1.25rem' }}>
        Manage active pipelines under{' '}
        <Link href="/dashboard/employer/applications">Applications</Link>,{' '}
        <Link href="/dashboard/employer/assessment-update-online">Assessment update online</Link>, and{' '}
        <Link href="/dashboard/employer/assessment-uploads">CSV uploads</Link>.
      </p>
    </div>
  );
}
