'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Send, FileUp, Plus } from 'lucide-react';
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import MobileHeader from '@/components/mobile/MobileHeader';
import CompanyNameLink from '@/components/CompanyNameLink';
import { validateCollegeOfferPayload } from '@/lib/apiInputValidation';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

const STATUS_OPTIONS = ['pending', 'accepted', 'rejected', 'expired', 'revoked'];

export default function MbCollegeOffers() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/offers', fetcher);
  const { data: studentsRaw } = useSWR('/api/college/students', fetcher);

  const offers = Array.isArray(data?.offers) ? data.offers : [];
  const summary = data?.summary || { total: 0, accepted: 0, pending: 0, rejected: 0, avgSalary: 0 };
  const students = useMemo(() => {
    const list = Array.isArray(studentsRaw?.students)
      ? studentsRaw.students
      : Array.isArray(studentsRaw)
        ? studentsRaw
        : [];
    return list.map((s) => ({ id: s.id, label: `${s.name || '—'} (${s.roll || 'no roll'})` }));
  }, [studentsRaw]);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    reportedCompanyName: '',
    jobTitle: '',
    salary: '',
    location: '',
    deadline: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({
      studentId: '',
      reportedCompanyName: '',
      jobTitle: '',
      salary: '',
      location: '',
      deadline: '',
      status: 'pending',
    });
  };

  const submitAdd = async () => {
    if (!form.studentId || !form.reportedCompanyName.trim() || !form.jobTitle.trim()) {
      addToast('Student, company name, and job title are required.', 'warning');
      return;
    }
    const offerErr = validateCollegeOfferPayload({
      salary: form.salary,
      deadline: form.deadline,
      joiningDate: form.joiningDate,
    });
    if (offerErr) {
      addToast(offerErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: form.studentId,
          reportedCompanyName: form.reportedCompanyName.trim(),
          jobTitle: form.jobTitle.trim(),
          salary: Number(form.salary || 0),
          location: form.location.trim() || null,
          deadline: form.deadline || null,
          status: form.status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Offer added.', 'success');
      setShowAdd(false);
      resetForm();
      await mutate();
    } catch (err) {
      addToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeOffer = async (id) => {
    if (!confirm('Delete this offer?')) return;
    try {
      const res = await fetch('/api/college/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      addToast('Offer removed.', 'success');
      await mutate();
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  return (
    <>
      <MobileHeader 
        title="Offers" 
        action={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} /> {showAdd ? 'Cancel' : 'New'}
          </button>
        } 
      />
      
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        {error && (
          <div className="card" style={{ padding: '1.25rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{error.message || 'Could not load offers.'}</p>
          </div>
        )}

        {/* Add Form */}
        {showAdd && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--primary-300)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Add Offer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select className="form-select" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}>
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <input className="form-input" placeholder="Company Name" value={form.reportedCompanyName} onChange={(e) => setForm((p) => ({ ...p, reportedCompanyName: e.target.value }))} />
              <input className="form-input" placeholder="Role / Job Title" value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
              <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_OFFER_SALARY} placeholder="Salary (INR annual)" value={form.salary} onChange={(v) => setForm((p) => ({ ...p, salary: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input className="form-input" placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_OFFER_DEADLINE} value={form.deadline} onChange={(v) => setForm((p) => ({ ...p, deadline: v }))} />
              </div>
              <select className="form-select" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={submitAdd} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Create Offer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>{summary.total}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Offers</div>
          </div>
          <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success-600)' }}>{summary.accepted}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Accepted</div>
          </div>
          <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning-600)' }}>{summary.pending}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pending</div>
          </div>
          <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger-600)' }}>{summary.rejected}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rejected</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Accepted Salary</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success-600)', marginTop: '0.25rem' }}>{summary.avgSalary ? formatCurrency(summary.avgSalary) : '—'}</div>
        </div>

        {/* CSV Note */}
        <div style={{ background: 'var(--info-50)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--info-200)', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--info-800)', lineHeight: 1.4 }}>
          <strong>Tip:</strong> Bulk CSV import is available on the Desktop version. Use the mobile app for quick additions.
        </div>

        {/* Offers List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: '12px' }} />)}
          </div>
        ) : offers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Send size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <div style={{ fontWeight: 600 }}>No offers recorded</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Showing {offers.length} offer{offers.length !== 1 ? 's' : ''}
            </div>
            {offers.map((offer) => (
              <div key={offer.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{offer.student_name}</div>
                    {offer.roll_number && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{offer.roll_number}</div>}
                  </div>
                  <span className={`badge badge-${getStatusColor(offer.status)} badge-dot`} style={{ fontSize: '0.7rem' }}>{formatStatus(offer.status)}</span>
                </div>
                
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <CompanyNameLink name={offer.company_name} website={offer.company_website} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{offer.job_title || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <span>{offer.salary ? formatCurrency(Number(offer.salary)) : '—'}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{offer.location || '—'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  <span>Deadline: {offer.deadline ? formatDate(offer.deadline) : '—'}</span>
                  <button className="btn btn-ghost btn-sm text-danger-600" onClick={() => removeOffer(offer.id)} style={{ padding: '0.25rem 0.5rem' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}
