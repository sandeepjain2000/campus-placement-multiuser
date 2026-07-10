'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  TIE_UP_REVOKE_DISABLED_TITLE,
  TIE_UP_REVOKE_ENABLED,
  TIE_UP_REVOKE_MESSAGES,
} from '@/lib/employerTieUpShared';
import { labelEmployerCompanyType } from '@/lib/employerCompanyTypeLabels';
import { Building2, Globe, Users, Shield, Star, ExternalLink, X, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  if (data?.employers && Array.isArray(data.employers)) return data;
  if (Array.isArray(data)) return { employers: data, staffDirectory: [] };
  throw new Error(data.error || 'Invalid response');
};

const STATUS_META = {
  pending:   { label: 'Pending',   badgeClass: 'badge-amber', icon: Clock },
  approved:  { label: 'Approved',  badgeClass: 'badge-green', icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  badgeClass: 'badge-red',   icon: XCircle },
  revoked:   { label: 'Revoked',   badgeClass: 'badge-gray',  icon: AlertCircle },
};

function getStatusMeta(status) {
  return STATUS_META[status] || { label: formatStatus(status), badgeClass: 'badge-gray', icon: AlertCircle };
}

function StatusPill({ status }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.badgeClass}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
      <Icon size={11} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

export default function MobileEmployers() {
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
    if (!pocModal) { setPocStaffSelection([]); return; }
    const ids = pocModal.coordination_poc_user_ids;
    setPocStaffSelection(Array.isArray(ids) ? ids.map((id) => String(id)) : []);
  }, [pocModal]);

  const handleRevoke = async (employerId) => {
    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId, confirmed: true }),
      });
      const data = await res.json();
      if (res.ok) { await mutate(); addToast(data.message || 'Tie-up revoked.', 'success'); }
      else addToast(data.error || 'Failed to revoke tie-up.', 'error');
    } catch { addToast('Network error while revoking tie-up.', 'error'); }
    finally { setProcessingId(null); }
  };

  const handleReinstate = async (employerId) => {
    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/reinstate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId }),
      });
      const data = await res.json();
      if (res.ok) { await mutate(); addToast(data.message || 'Tie-up restored.', 'success'); }
      else addToast(data.error || 'Failed to restore tie-up.', 'error');
    } catch { addToast('Network error.', 'error'); }
    finally { setProcessingId(null); }
  };

  if (isLoading) return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="skeleton" style={{ height: 72, borderRadius: '12px', marginBottom: '2rem' }} />
      <div className="skeleton skeleton-card" style={{ height: 300 }} />
    </div>
  );

  if (error) return (
    <div className="animate-fadeIn" style={{ padding: '2rem' }}>
      <div className="card" style={{ borderColor: 'var(--danger-200)', background: 'var(--danger-50)', padding: '1.5rem' }}>
        <p style={{ color: 'var(--danger-700)', fontWeight: 600, margin: '0 0 0.5rem' }}>{error.message || 'Could not load employers.'}</p>
        <p className="text-sm text-secondary" style={{ margin: 0 }}>Confirm you are signed in as a college admin, then try again.</p>
      </div>
    </div>
  );

  const pendingCount = list.filter(e => e.status === 'pending').length;

  return (
    <>
      <MobileHeader title="Employers" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {list.length} tie-up records
          </span>
          {pendingCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
              <AlertCircle size={12} /> {pendingCount} pending
            </span>
          )}
        </div>
        {pendingCount > 0 && (
          <Link href="/dashboard/college/employers/requests" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            Review
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed var(--border-default)', borderRadius: '12px' }}>
          <Building2 size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No employer tie-ups yet</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
            When an employer requests access to your campus, they appear here.
          </p>
          <Link href="/dashboard/college/employers/requests" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>Review pending requests →</Link>
        </div>
      ) : (
        <>


          {/* Mobile cards — shown only on small screens */}
          <div className="employers-mobile-cards">
            {list.map((emp) => {
              const rating = emp.reliability_score != null ? Number(emp.reliability_score) : null;
              const pocNames = (emp.coordination_poc_user_ids || []).map((uid) => staffDirectory.find((s) => String(s.id) === String(uid))?.name).filter(Boolean);
              return (
                <div key={emp.approval_id} style={{ border: '1px solid var(--border-default)', borderRadius: '12px', padding: '1.25rem', background: 'var(--bg-elevated)', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                    <EntityLogo name={emp.name} website={emp.website} size="sm" shape="rounded" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        <CompanyNameLink name={emp.name} website={emp.website} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{emp.industry || '—'}</div>
                    </div>
                    <StatusPill status={emp.status} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    {[
                      { label: 'Type', value: labelEmployerCompanyType(emp.company_type) },
                      { label: 'Rating', value: rating ? `★ ${rating.toFixed(1)}` : '—' },
                      { label: 'Hires', value: emp.past_hires ?? 0 },
                      { label: 'Drives', value: emp.drives_count ?? 0 },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {pocNames.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={12} /> {pocNames.join(', ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {emp.website && (
                      <a href={emp.website.startsWith('http') ? emp.website : `https://${emp.website}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                        <ExternalLink size={13} /> Website
                      </a>
                    )}
                    {emp.status === 'pending' && <Link href="/dashboard/college/employers/requests" className="btn btn-primary btn-sm">Review</Link>}
                    {emp.status === 'approved' && (
                      <>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPocModal(emp)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid var(--border-default)', fontSize: '0.8rem' }}>
                          <Users size={13} /> POCs
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)', border: '1px solid var(--danger-500)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', opacity: TIE_UP_REVOKE_ENABLED ? 1 : 0.45 }} onClick={() => TIE_UP_REVOKE_ENABLED && setRevokeTarget({ id: emp.employer_id, name: emp.name })} disabled={!TIE_UP_REVOKE_ENABLED || processingId === emp.employer_id} title={TIE_UP_REVOKE_ENABLED ? 'Revoke tie-up' : TIE_UP_REVOKE_DISABLED_TITLE}>
                          <X size={13} /> Revoke
                        </button>
                      </>
                    )}
                    {emp.status === 'revoked' && (
                      <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem', color: 'var(--success-700)', border: '1px solid var(--success-500)' }} onClick={() => handleReinstate(emp.employer_id)} disabled={processingId === emp.employer_id}>
                        Restore tie-up
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* POC Modal */}
      {pocModal && (
        <div className="modal-overlay" role="presentation" style={{ overflowY: 'auto', alignItems: 'flex-start' }} onClick={(e) => { if (e.target === e.currentTarget) setPocModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" style={{ borderRadius: '12px', overflow: 'hidden', maxWidth: 520, margin: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Assign Campus POCs</h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Coordinating with <strong>{pocModal.name}</strong></p>
              </div>
              <button type="button" onClick={() => setPocModal(null)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Select College Staff</label>
                {staffDirectory.length === 0 ? (
                  <p className="text-sm text-secondary">No placement coordinators found. Add college admin accounts for your team first.</p>
                ) : (
                  <select className="form-select" multiple style={{ height: `${Math.min(220, 36 + staffDirectory.length * 28)}px` }} value={pocStaffSelection} onChange={(e) => setPocStaffSelection(Array.from(e.target.selectedOptions).map((o) => o.value))}>
                    {staffDirectory.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                  </select>
                )}
                <p className="text-xs text-tertiary" style={{ marginTop: '0.4rem' }}>Hold Ctrl/Cmd to select multiple staff members.</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPocModal(null)} disabled={pocSaving}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={pocSaving || staffDirectory.length === 0} onClick={async () => {
                setPocSaving(true);
                try {
                  const res = await fetch(`/api/college/employers/${pocModal.employer_id}/poc`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffUserIds: pocStaffSelection }) });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) { addToast(json.error || 'Could not save POC assignment.', 'error'); return; }
                  await mutate(); addToast('Campus POCs saved.', 'success'); setPocModal(null);
                } catch { addToast('Network error while saving.', 'error'); }
                finally { setPocSaving(false); }
              }}>
                <Shield size={15} /> {pocSaving ? 'Saving…' : 'Save POCs'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title={TIE_UP_REVOKE_MESSAGES.collegeConfirmTitle}
        message={revokeTarget ? TIE_UP_REVOKE_MESSAGES.collegeConfirmBody(revokeTarget.name) : ''}
        confirmLabel="Revoke tie-up & notify"
        confirmTone="danger"
        onCancel={() => setRevokeTarget(null)}
        onConfirm={async () => { if (!revokeTarget) return; const targetId = revokeTarget.id; setRevokeTarget(null); await handleRevoke(targetId); }}
        loading={Boolean(revokeTarget && processingId === revokeTarget.id)}
      />

      </div>
    </>
  );
}
