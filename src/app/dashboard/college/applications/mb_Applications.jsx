'use client';

import useSWR from 'swr';
import { ClipboardList, Building2, GraduationCap } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import MobileHeader from '@/components/mobile/MobileHeader';
import CompanyNameLink from '@/components/CompanyNameLink';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load applications');
  return json;
};

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

export default function mb_Applications() {
  const { data, isLoading, error } = useSWR('/api/college/applications', fetcher);
  const applications = Array.isArray(data?.applications) ? data.applications : [];
  const counts = data?.counts || { drives: 0, programs: 0, total: 0 };

  return (
    <>
      <MobileHeader title="Applications" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: '12px' }} />)}
          </div>
        )}
        
        {error && (
          <div className="card" style={{ padding: '1.25rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{error.message || 'Could not load applications.'}</p>
          </div>
        )}

        {!isLoading && !error && applications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-default)' }}>
            <ClipboardList size={40} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No applications yet</div>
            <p style={{ color: 'var(--text-secondary)', margin: '0', fontSize: '0.9rem' }}>
              Students apply from Placement Drives, Jobs, Internships, and Projects on their dashboard.
            </p>
          </div>
        )}

        {!isLoading && !error && applications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              {counts.total || applications.length} applications · {counts.drives || 0} drives · {counts.programs || 0} programs
            </div>
            {applications.map((a) => {
              const initials = (a.student_name || 'S').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={`${a.source_kind}-${a.id}`} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, border: '1px solid var(--primary-300)' }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{a.student_name || '—'}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.roll_number || '—'}</div>
                      </div>
                    </div>
                    <span className={`badge badge-${getStatusColor(a.status)} badge-dot`} style={{ fontSize: '0.7rem' }}>
                      {formatStatus(a.status)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <GraduationCap size={14} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.department || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Building2 size={14} style={{ flexShrink: 0 }} />
                      <CompanyNameLink name={a.company_name} website={a.company_website} style={{ fontWeight: 500, color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span>{applicationKindLabel(a)} · {openingLabel(a)}</span>
                    <span>{a.applied_at ? formatDate(a.applied_at) : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
