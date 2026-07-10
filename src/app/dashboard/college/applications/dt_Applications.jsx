'use client';

import useSWR from 'swr';
import { ClipboardList, Search, Building2, GraduationCap } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import ApplicationDetailModal from './ApplicationDetailModal';
import { useState, useMemo } from 'react';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load applications');
  return json;
};

const TABLE_COLUMNS = [
  'Student',
  'Roll No.',
  'Department',
  'Company',
  'Type',
  'Opening',
  'Status',
  'Applied',
  'Actions',
];

function openingLabel(a) {
  return a.opening_title || a.drive_title || '—';
}

function applicationKindLabel(a) {
  if (a.source_kind === 'drive') return 'Placement drive';
  const jt = String(a.job_type || '').toLowerCase();
  if (jt === 'internship') return 'Internship';
  if (jt === 'short_project' || jt === 'hackathon') return 'Project';
  if (jt === 'full_time' || jt === 'part_time' || jt === 'contract') return 'Job';
  return 'Program';
}

export default function DtCollegeApplications() {
  const { data, isLoading, error } = useSWR('/api/college/applications', fetcher);
  const applications = Array.isArray(data?.applications) ? data.applications : [];
  const counts = data?.counts || { drives: 0, programs: 0, total: 0 };
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [viewRow, setViewRow] = useState(null);

  const filtered = useMemo(
    () =>
      applications.filter((a) => {
        const haystack = [
          a.student_name,
          a.roll_number,
          a.department,
          a.company_name,
          a.drive_title,
          a.opening_title,
          applicationKindLabel(a),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchSearch = !search || haystack.includes(search.toLowerCase());
        const matchStatus = !statusFilter || a.status === statusFilter;
        const matchKind =
          !kindFilter ||
          (kindFilter === 'drive' && a.source_kind === 'drive') ||
          (kindFilter === 'program' && a.source_kind === 'program');
        return matchSearch && matchStatus && matchKind;
      }),
    [applications, search, statusFilter, kindFilter],
  );

  const statuses = useMemo(
    () => [...new Set(applications.map((a) => a.status).filter(Boolean))],
    [applications],
  );

  const summaryLine = isLoading
    ? 'Loading applications…'
    : error
      ? 'Could not load counts'
      : `${counts.total || applications.length} applications · ${counts.drives || 0} placement drives · ${counts.programs || 0} jobs & programs`;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem', minWidth: 0, maxWidth: '100%' }}>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 0.35rem',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ClipboardList size={24} aria-hidden />
            Applications
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>{summaryLine}</p>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="form-input"
            placeholder="Search student, roll, company, opening…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
            disabled={isLoading && !applications.length}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', padding: '0.65rem 2rem 0.65rem 1rem' }}
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          disabled={isLoading && !applications.length}
        >
          <option value="">All types</option>
          <option value="drive">Placement drives</option>
          <option value="program">Jobs & programs</option>
        </select>
        <select
          className="form-select"
          style={{ width: 'auto', padding: '0.65rem 2rem 0.65rem 1rem' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          disabled={isLoading && !applications.length}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {formatStatus(s)}
            </option>
          ))}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {isLoading && !applications.length ? '—' : `${filtered.length} of ${applications.length}`}
        </span>
      </div>

      {error ? (
        <div
          className="card"
          role="alert"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            background: 'var(--danger-50)',
            border: '1px solid var(--danger-200)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>
            {error.message || 'Could not load applications.'}
          </p>
        </div>
      ) : null}

      <div className="card card-table-shell" style={{ border: '1px solid var(--border-default)', minWidth: 0, maxWidth: '100%' }}>
        <div
          className="table-container"
          style={{ border: 'none', borderRadius: 'inherit', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          <table className="data-table college-applications-table">
            <colgroup>
              <col className="college-applications-col-student" />
              <col className="college-applications-col-roll" />
              <col className="college-applications-col-dept" />
              <col className="college-applications-col-company" />
              <col className="college-applications-col-type" />
              <col className="college-applications-col-opening" />
              <col className="college-applications-col-status" />
              <col className="college-applications-col-applied" />
              <col className="college-applications-col-actions" />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {TABLE_COLUMNS.map((col, i) => (
                  <th
                    key={col}
                    style={
                      i === 0
                        ? { paddingLeft: '1.5rem' }
                        : i === TABLE_COLUMNS.length - 1
                          ? { textAlign: 'right', paddingRight: '1.5rem', width: 1 }
                          : undefined
                    }
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && !applications.length ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} style={{ padding: '2rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 40, borderRadius: 'var(--radius-md)' }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isLoading &&
                !error &&
                filtered.map((a) => {
                  const initials = (a.student_name || 'S')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <tr key={`${a.source_kind}-${a.id}`}>
                      <td style={{ paddingLeft: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'var(--primary-100)',
                              color: 'var(--primary-700)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              flexShrink: 0,
                              border: '1px solid var(--primary-200)',
                            }}
                          >
                            {initials}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{a.student_name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {a.roll_number || '—'}
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <GraduationCap size={13} style={{ flexShrink: 0 }} aria-hidden />
                          {a.department || '—'}
                        </div>
                      </td>
                      <td className="cell-truncate" title={a.company_name || undefined}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            minWidth: 0,
                          }}
                        >
                          <Building2 size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} aria-hidden />
                          <span className="cell-truncate" style={{ display: 'block' }}>
                            <CompanyNameLink name={a.company_name} website={a.company_website} />
                          </span>
                        </div>
                      </td>
                      <td className="text-sm text-secondary cell-truncate" title={applicationKindLabel(a)}>
                        {applicationKindLabel(a)}
                      </td>
                      <td className="text-sm text-secondary cell-truncate" title={openingLabel(a)}>
                        {openingLabel(a)}
                      </td>
                      <td>
                        <span className={`badge badge-${getStatusColor(a.status)} badge-dot`} style={{ fontSize: '0.75rem' }}>
                          {formatStatus(a.status)}
                        </span>
                      </td>
                      <td className="text-sm text-secondary cell-truncate" title={a.applied_at ? formatDate(a.applied_at) : undefined}>
                        {a.applied_at ? formatDate(a.applied_at) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.5rem', whiteSpace: 'nowrap' }}>
                        <StandardTableIconAction action="view" showLabel={false} onClick={() => setViewRow(a)} />
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && !error && filtered.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <ClipboardList size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25 }} aria-hidden />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {applications.length === 0 ? 'No applications yet' : 'No applications match your filters'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {applications.length === 0
                        ? 'Students apply from placement drives, jobs, internships, and projects on their dashboard.'
                        : 'Try clearing search or filters.'}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <ApplicationDetailModal row={viewRow} onClose={() => setViewRow(null)} />
    </div>
  );
}
