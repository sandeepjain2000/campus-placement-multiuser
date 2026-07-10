'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { labelEmployerCompanyType } from '@/lib/employerCompanyTypeLabels';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  if (data?.employers && Array.isArray(data.employers)) {
    return data;
  }
  if (Array.isArray(data)) {
    return { employers: data, staffDirectory: [] };
  }
  throw new Error(data.error || 'Invalid response');
};

export default function CollegeEmployersPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/college/employers', fetcher);
  const [processingId, setProcessingId] = useState(null);
  const [pocModal, setPocModal] = useState(null);
  const [pocStaffSelection, setPocStaffSelection] = useState([]);
  const [pocSaving, setPocSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const { addToast } = useToast();

  const list = data?.employers || [];
  const staffDirectory = data?.staffDirectory || [];

  useEffect(() => {
    if (!pocModal) {
      setPocStaffSelection([]);
      return;
    }
    const ids = pocModal.coordination_poc_user_ids;
    setPocStaffSelection(Array.isArray(ids) ? ids.map((id) => String(id)) : []);
  }, [pocModal]);

  const handleRevoke = async (employerId) => {
    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId }),
      });
      const data = await res.json();

      if (res.ok) {
        await mutate();
        addToast('Employer access blocked.', 'success');
      } else {
        addToast(data.error || 'Failed to block employer.', 'error');
      }
    } catch {
      addToast('Network error while blocking access.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="skeleton skeleton-card" style={{ height: 280, margin: '2rem' }} />;
  }

  if (error) {
    return (
      <div className="animate-fadeIn" style={{ padding: '2rem', color: 'var(--danger-600)' }}>
        <p>{error.message || 'Could not load employers.'}</p>
        <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
          Confirm you are signed in as a college admin, then try again or contact support if this continues.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🏢 Manage Employers</h1>
          <p>
            Employers appear here after they request a tie-up.{' '}
            <Link href="/dashboard/college/employers/requests" className="text-primary" style={{ fontWeight: 600 }}>
              Review pending requests →
            </Link>
          </p>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Sr No.</th>
              <th>Company</th>
              <th>Industry</th>
              <th>Type</th>
              <th>Past hires</th>
              <th>Drives</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Campus POC</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                  <div style={{ color: 'var(--text-secondary)' }}>No employer tie-ups yet.</div>
                  <div className="text-sm text-tertiary" style={{ marginTop: '0.5rem' }}>
                    When an employer requests access to your campus, they will show up here and under Pending Requests.
                  </div>
                </td>
              </tr>
            ) : (
              list.map((emp, index) => {
                const rating = emp.reliability_score != null ? Number(emp.reliability_score) : null;
                const stars = rating != null && !Number.isNaN(rating) ? Math.min(5, Math.max(0, Math.round(rating))) : 0;
                const pocNames = (emp.coordination_poc_user_ids || [])
                  .map((uid) => staffDirectory.find((s) => String(s.id) === String(uid))?.name)
                  .filter(Boolean);
                return (
                  <tr key={emp.approval_id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <EntityLogo name={emp.name} website={emp.website} size="sm" shape="rounded" />
                        <span className="font-semibold">{emp.name}</span>
                      </div>
                    </td>
                    <td>{emp.industry || '—'}</td>
                    <td>
                      <span className="badge badge-gray">{labelEmployerCompanyType(emp.company_type)}</span>
                    </td>
                    <td>{emp.past_hires ?? 0}</td>
                    <td>{emp.drives_count ?? 0}</td>
                    <td>
                      {stars > 0 ? (
                        <>
                          {'⭐'.repeat(stars)}{' '}
                          <span className="text-sm text-tertiary">{rating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-sm text-tertiary">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(emp.status)} badge-dot`}>{formatStatus(emp.status)}</span>
                    </td>
                    <td className="text-sm text-secondary" style={{ maxWidth: '14rem' }}>
                      {pocNames.length ? pocNames.join(', ') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {emp.website ? (
                          <a
                            href={emp.website.startsWith('http') ? emp.website : `https://${emp.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                          >
                            Website
                          </a>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-sm" disabled title="No website on file">
                            Website
                          </button>
                        )}
                        {emp.status === 'pending' && (
                          <Link href="/dashboard/college/employers/requests" className="btn btn-success btn-sm">
                            Review
                          </Link>
                        )}
                        {emp.status === 'approved' && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPocModal(emp)}>
                            POCs
                          </button>
                        )}
                        {emp.status === 'approved' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger-500)' }}
                            onClick={() => setRevokeTarget({ id: emp.employer_id, name: emp.name })}
                            disabled={processingId === emp.employer_id}
                          >
                            {processingId === emp.employer_id ? 'Blocking...' : 'Block'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {list.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing {list.length} employer{list.length !== 1 ? 's' : ''} with a tie-up record
            </div>
          </div>
        )}
      </div>

      {pocModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="card animate-fadeIn" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Nominate coordination POCs
            </h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '1.5rem' }}>
              Assign active college staff who will coordinate with <strong>{pocModal.name}</strong>. This is saved to your campus records.
            </p>

            <div className="form-group">
              <label className="form-label">College staff</label>
              {staffDirectory.length === 0 ? (
                <p className="text-sm text-secondary">No placement coordinators found. Add college admin accounts for your team first.</p>
              ) : (
                <select
                  className="form-select"
                  multiple
                  style={{ height: `${Math.min(220, 36 + staffDirectory.length * 28)}px` }}
                  value={pocStaffSelection}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setPocStaffSelection(selected);
                  }}
                >
                  {staffDirectory.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                Hold Ctrl/Cmd (or long-press on mobile browsers that support it) to select multiple staff.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPocModal(null)} disabled={pocSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pocSaving || staffDirectory.length === 0}
                onClick={async () => {
                  setPocSaving(true);
                  try {
                    const res = await fetch(`/api/college/employers/${pocModal.employer_id}/poc`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ staffUserIds: pocStaffSelection }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      addToast(json.error || 'Could not save POC assignment.', 'error');
                      return;
                    }
                    await mutate();
                    addToast('Campus POCs saved.', 'success');
                    setPocModal(null);
                  } catch {
                    addToast('Network error while saving.', 'error');
                  } finally {
                    setPocSaving(false);
                  }
                }}
              >
                {pocSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Block employer access?"
        message={
          revokeTarget
            ? `${revokeTarget.name} will lose access to this campus until re-approved.`
            : ''
        }
        confirmLabel="Block employer"
        onCancel={() => setRevokeTarget(null)}
        onConfirm={async () => {
          if (!revokeTarget) return;
          const targetId = revokeTarget.id;
          setRevokeTarget(null);
          await handleRevoke(targetId);
        }}
        loading={Boolean(revokeTarget && processingId === revokeTarget.id)}
      />
    </div>
  );
}
