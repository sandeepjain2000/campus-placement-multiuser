'use client';

import useSWR from 'swr';
import { ClipboardList } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load applications');
  return json;
};

export default function CollegeApplicationsPage() {
  const { data, isLoading, error } = useSWR('/api/college/applications', fetcher);
  const applications = Array.isArray(data?.applications) ? data.applications : [];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={22} aria-hidden /> Applications
          </h1>
          <p className="text-secondary" style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
            Review student applications across drives.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        {isLoading ? <p className="text-secondary" style={{ margin: 0 }}>Loading applications...</p> : null}
        {error ? <p style={{ margin: 0, color: 'var(--danger-600)' }}>{error.message || 'Could not load applications.'}</p> : null}
        {!isLoading && !error ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll</th>
                  <th>Department</th>
                  <th>Company</th>
                  <th>Drive</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.student_name || '—'}</td>
                    <td className="text-sm font-mono">{a.roll_number || '—'}</td>
                    <td>{a.department || '—'}</td>
                    <td>{a.company_name || '—'}</td>
                    <td>{a.drive_title || '—'}</td>
                    <td><span className={`badge badge-${getStatusColor(a.status)} badge-dot`}>{formatStatus(a.status)}</span></td>
                    <td>{a.applied_at ? formatDate(a.applied_at) : '—'}</td>
                  </tr>
                ))}
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-secondary">No applications found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
