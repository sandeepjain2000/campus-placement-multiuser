'use client';

import { useCallback, useState, useMemo } from 'react';
import useSWR from 'swr';
import { RotateCcw, CheckCircle, Clock, XCircle, Search, Mail, Send, FileText } from 'lucide-react';
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '@/lib/utils';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateEmployerOfferPayload } from '@/lib/apiInputValidation';
import EmployerListFormLayout from '@/components/employer/EmployerListFormLayout';
import BulkOfferGeneratePanel from '@/components/employer/BulkOfferGeneratePanel';
import OfferEventTypeTabs from '@/components/employer/OfferEventTypeTabs';
import AppPageHeader from '@/components/layout/AppPageHeader';
import AppStatCard from '@/components/layout/AppStatCard';
import AppContentCard from '@/components/layout/AppContentCard';
import {
  classifyOfferEventType,
  countOfferEventTypes,
  templateMatchesEventTab,
} from '@/lib/offerEventType';

const emptyOfferForm = {
  studentId: '',
  driveId: '',
  jobTitle: '',
  salary: '',
  location: '',
  joiningDate: '',
  deadlineAt: '',
  offerLetterUrl: '',
};

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load offers');
  return data;
};

export default function EmployerOffersPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/offers', fetcher);
  const { data: optionsData } = useSWR('/api/employer/offers/options', fetcher);
  const { data: templatesData } = useSWR('/api/employer/offer-templates', fetcher);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  const [eventTab, setEventTab] = useState('drive');
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState(emptyOfferForm);
  const [editForm, setEditForm] = useState({
    driveId: '',
    jobTitle: '',
    salary: '',
    location: '',
    joiningDate: '',
    deadlineAt: '',
  });

  const offers = Array.isArray(data?.offers) ? data.offers : [];
  const students = Array.isArray(optionsData?.students) ? optionsData.students : [];
  const drives = Array.isArray(optionsData?.drives) ? optionsData.drives : [];
  const internships = Array.isArray(optionsData?.internships) ? optionsData.internships : [];
  const templates = Array.isArray(templatesData?.templates) ? templatesData.templates : [];

  const eventCounts = useMemo(
    () => countOfferEventTypes(offers, classifyOfferEventType),
    [offers],
  );

  const tabOffers = useMemo(
    () => offers.filter((o) => classifyOfferEventType(o) === eventTab),
    [offers, eventTab],
  );

  const driveTemplates = useMemo(
    () => templates.filter((t) => templateMatchesEventTab(t, 'drive')),
    [templates],
  );

  const internshipTemplates = useMemo(
    () => templates.filter((t) => templateMatchesEventTab(t, 'internship')),
    [templates],
  );

  const filteredOffers = useMemo(() => {
    const result = tabOffers.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = [o.student_name, o.college_name, o.job_title, o.location].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortOption === 'date_desc') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortOption === 'date_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortOption === 'salary_desc') return (Number(b.salary) || 0) - (Number(a.salary) || 0);
      if (sortOption === 'name_asc') return (a.student_name || '').localeCompare(b.student_name || '');
      return 0;
    });
  }, [tabOffers, search, statusFilter, sortOption]);

  const submitCreateOffer = async () => {
    if (!form.studentId || !form.jobTitle.trim()) {
      addToast('Student and job title are required.', 'warning');
      return;
    }
    const offerErr = validateEmployerOfferPayload({
      salary: form.salary,
      deadline: form.deadlineAt,
      joiningDate: form.joiningDate,
    });
    if (offerErr) {
      addToast(offerErr, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salary: Number(form.salary || 0),
          deadlineAt: form.deadlineAt ? new Date(`${form.deadlineAt}T23:59:59`).toISOString() : null,
          offerLetterUrl: form.offerLetterUrl.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to create offer');
      setShowCreate(false);
      setForm(emptyOfferForm);
      await mutate();
      addToast('Offer created successfully.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to create offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const revokeOffer = async (id) => {
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'revoked' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to revoke offer');
      await mutate();
      addToast('Offer revoked.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to revoke offer', 'error');
    }
  };

  const reopenOffer = async (id) => {
    if (!confirm('Reopen this offer as pending? Clears acceptance / decline timestamps so the student can respond again.')) {
      return;
    }
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'pending' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to reopen offer');
      await mutate();
      addToast('Offer set back to pending.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to reopen offer', 'error');
    }
  };

  const openEdit = (offer) => {
    setEditId(offer.id);
    setShowCreate(false);
    setViewRow(null);
    setEditForm({
      driveId: offer.drive_id || '',
      jobTitle: offer.job_title || '',
      salary: offer.salary != null ? String(offer.salary) : '',
      location: offer.location || '',
      joiningDate: offer.joining_date ? String(offer.joining_date).slice(0, 10) : '',
      deadlineAt: offer.deadline_at ? String(offer.deadline_at).slice(0, 10) : '',
      offerLetterUrl: offer.offer_letter_url || '',
    });
  };

  const submitEditOffer = async () => {
    if (!editId) return;
    const offerErr = validateEmployerOfferPayload({
      salary: editForm.salary,
      deadline: editForm.deadlineAt,
      joiningDate: editForm.joiningDate,
    });
    if (offerErr) {
      addToast(offerErr, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          driveId: editForm.driveId || null,
          jobTitle: editForm.jobTitle.trim(),
          salary: Number(editForm.salary || 0),
          location: editForm.location.trim() || null,
          joiningDate: editForm.joiningDate || null,
          deadlineAt: editForm.deadlineAt ? new Date(`${editForm.deadlineAt}T23:59:59`).toISOString() : null,
          offerLetterUrl: editForm.offerLetterUrl.trim() || null,
          syncReportedCompanyFromProfile: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to update offer');
      setEditId(null);
      await mutate();
      addToast('Offer updated.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteOffer = async (id) => {
    if (!confirm('Delete this offer row permanently?')) return;
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to delete offer');
      if (editId === id) setEditId(null);
      if (viewRow?.id === id) setViewRow(null);
      await mutate();
      addToast('Offer removed.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to delete offer', 'error');
    }
  };

  const resendOfferEmail = async (id) => {
    try {
      const res = await fetch(`/api/employer/offers/${id}/resend`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to resend email');
      addToast(json.message || 'Offer email sent again.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to resend email', 'error');
    }
  };

  const getOffersCsv = useCallback((_scope) => {
    const list = _scope === 'current' ? filteredOffers : tabOffers;
    const headers = ['Student', 'College', 'Role', 'Salary_INR', 'Salary_display', 'Location', 'Deadline', 'Status', 'Created'];
    const rows = list.map((o) => [
      o.student_name || '—',
      o.college_name || '—',
      o.job_title || '—',
      String(Number(o.salary) || 0),
      formatCurrency(Number(o.salary) || 0),
      o.location || '—',
      o.deadline_at || '',
      o.status || '',
      o.created_at || '',
    ]);
    return { headers, rows };
  }, [tabOffers, filteredOffers]);

  if (isLoading) {
    return (
      <div className="app-page-shell">
        <div className="skeleton skeleton-card" style={{ height: 120 }} />
        <div className="app-stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 104 }} />
          ))}
        </div>
        <div className="skeleton skeleton-card" style={{ height: 320 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-page-shell">
        <AppContentCard title="Could not load offers">
          <p style={{ margin: 0, color: 'var(--danger-600)' }}>{error.message || 'Could not load offers.'}</p>
          <p className="text-sm text-secondary" style={{ margin: '0.5rem 0 0' }}>
            Confirm you are signed in as an employer, then reload or contact support if this continues.
          </p>
        </AppContentCard>
      </div>
    );
  }

  const acceptedCount = tabOffers.filter((offer) => offer.status === 'accepted').length;
  const pendingCount = tabOffers.filter((offer) => offer.status === 'pending').length;
  const declinedCount = tabOffers.filter((offer) => ['rejected', 'declined'].includes(offer.status)).length;

  const closeCreateForm = () => {
    setShowCreate(false);
    setForm(emptyOfferForm);
  };

  const closeEditForm = () => setEditId(null);

  if (showCreate) {
    return (
      <EmployerListFormLayout
        title="Create offer"
        subtitle="Creates a pending offer the student can accept or decline on My Offers."
        onBack={closeCreateForm}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" disabled={submitting} onClick={closeCreateForm}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitCreateOffer} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Offer'}
            </button>
          </div>
        }
      >
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Student</label>
            <select className="form-select" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}>
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.collegeName ? ` — ${s.collegeName}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Drive (optional)</label>
            <select className="form-select" value={form.driveId} onChange={(e) => setForm((p) => ({ ...p, driveId: e.target.value }))}>
              <option value="">Not linked</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>{d.title} {d.drive_date ? `(${formatDate(d.drive_date)})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Job title</label>
            <input className="form-input" value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Salary (INR annual)</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_OFFER_SALARY} value={form.salary} onChange={(v) => setForm((p) => ({ ...p, salary: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Joining date</label>
            <ValidatedDateInput fieldId={FIELD_IDS.EMPLOYER_OFFER_JOINING} context={{ deadline: form.deadlineAt }} value={form.joiningDate} onChange={(v) => setForm((p) => ({ ...p, joiningDate: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Response deadline</label>
            <ValidatedDateInput fieldId={FIELD_IDS.EMPLOYER_OFFER_DEADLINE} value={form.deadlineAt} onChange={(v) => setForm((p) => ({ ...p, deadlineAt: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Offer letter URL (optional)</label>
            <input className="form-input" placeholder="https://..." value={form.offerLetterUrl} onChange={(e) => setForm((p) => ({ ...p, offerLetterUrl: e.target.value }))} />
          </div>
        </div>
      </EmployerListFormLayout>
    );
  }

  if (editId) {
    return (
      <EmployerListFormLayout
        title="Edit offer"
        subtitle="Updates terms for this row. Use Reopen to pending on the list to roll back status."
        onBack={closeEditForm}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary" onClick={submitEditOffer} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={closeEditForm} disabled={submitting}>
              Cancel
            </button>
          </div>
        }
      >
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Drive (optional)</label>
            <select className="form-select" value={editForm.driveId} onChange={(e) => setEditForm((p) => ({ ...p, driveId: e.target.value }))}>
              <option value="">Not linked</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>{d.title} {d.drive_date ? `(${formatDate(d.drive_date)})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Job title</label>
            <input className="form-input" value={editForm.jobTitle} onChange={(e) => setEditForm((p) => ({ ...p, jobTitle: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Salary (INR annual)</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_OFFER_SALARY} value={editForm.salary} onChange={(v) => setEditForm((p) => ({ ...p, salary: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Joining date</label>
            <ValidatedDateInput fieldId={FIELD_IDS.EMPLOYER_OFFER_JOINING} context={{ deadline: editForm.deadlineAt }} value={editForm.joiningDate} onChange={(v) => setEditForm((p) => ({ ...p, joiningDate: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Response deadline</label>
            <ValidatedDateInput fieldId={FIELD_IDS.EMPLOYER_OFFER_DEADLINE} value={editForm.deadlineAt} onChange={(v) => setEditForm((p) => ({ ...p, deadlineAt: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Offer letter URL (optional)</label>
            <input className="form-input" placeholder="https://..." value={editForm.offerLetterUrl} onChange={(e) => setEditForm((p) => ({ ...p, offerLetterUrl: e.target.value }))} />
          </div>
        </div>
      </EmployerListFormLayout>
    );
  }

  const tabLabel =
    eventTab === 'internship' ? 'Internship' : eventTab === 'alumni_jobs' ? 'Alumni jobs' : 'Drive';

  return (
    <div className="app-page-shell animate-fadeIn">
      <AppPageHeader
        title="Offers"
        description="Issue formal offer letters after selection. Bulk-generate from drive or internship selections, or create a single offer for special cases."
        actions={
          <>
            <ExportCsvSplitButton
              filenameBase="placement_offers"
              currentCount={filteredOffers.length}
              fullCount={tabOffers.length}
              getRows={getOffersCsv}
            />
            <StandardTableIconAction
              action="add"
              variant="primary"
              onClick={() => {
                setShowCreate(true);
                setEditId(null);
              }}
            />
          </>
        }
      />

      <div className="app-stat-grid">
        <AppStatCard
          label={`${tabLabel} offers`}
          value={tabOffers.length}
          hint="In this tab"
          icon={Send}
          tone="indigo"
        />
        <AppStatCard label="Accepted" value={acceptedCount} icon={CheckCircle} tone="green" />
        <AppStatCard label="Pending response" value={pendingCount} icon={Clock} tone="amber" />
        <AppStatCard label="Declined / rejected" value={declinedCount} icon={XCircle} tone="rose" />
      </div>

      <OfferEventTypeTabs activeTab={eventTab} onTabChange={setEventTab} counts={eventCounts} />

      {eventTab === 'drive' ? (
        <BulkOfferGeneratePanel scope="drive" postings={drives} templates={driveTemplates} onGenerated={mutate} />
      ) : null}

      {eventTab === 'internship' ? (
        <>
          <BulkOfferGeneratePanel
            scope="internship"
            postings={internships}
            templates={internshipTemplates}
            onGenerated={mutate}
          />
          <AppContentCard
            title="PPO (full-time after internship)"
            description={
              <>
                Pre-Placement Offers are separate from internship selection offers. Confirm PPO on or after internship
                start, then generate from{' '}
                <a href="/dashboard/employer/internship-ppo" className="link-inline" style={{ fontWeight: 600 }}>
                  Internship PPO
                </a>
                .
              </>
            }
          />
        </>
      ) : null}

      {eventTab === 'alumni_jobs' ? (
        <AppContentCard
          title="Alumni job offers"
          description="One-off offers for alumni job selections — use Create offer without linking a placement drive."
        />
      ) : null}

      <details className="app-help-disclosure">
        <summary>How offers work on PlacementHub</summary>
        <div className="app-help-disclosure__body">
          <p>
            <strong>Bulk generate</strong> creates pending offers for selected students who do not have one yet. Students
            accept or decline on <strong>My Offers</strong>.
          </p>
          <p>
            <strong>Resend email</strong> if a student did not receive the letter. Each row is one student — five students
            with the same package means five rows.
          </p>
        </div>
      </details>

      <AppContentCard title="Offer register" description={`${tabLabel} offers issued to students.`} padding={false}>
        <div style={{ padding: '1.25rem 1.5rem 0' }}>
          <div className="app-table-toolbar">
            <div className="app-table-toolbar__search">
              <Search size={15} className="app-table-toolbar__search-icon" aria-hidden />
              <input
                className="form-input"
                placeholder="Search student, college, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="rejected">Rejected</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
            <select className="form-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="salary_desc">Highest salary</option>
              <option value="name_asc">Name (A–Z)</option>
            </select>
            <span className="app-table-toolbar__meta">
              {filteredOffers.length} of {tabOffers.length} shown
            </span>
          </div>
        </div>

        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Role</th>
                  <th>Salary</th>
                  <th>Location</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.length > 0 ? (
                  filteredOffers.map((offer) => (
                    <tr key={offer.id}>
                      <td>
                        <div className="app-table-primary">{offer.student_name || '—'}</div>
                        <div className="app-table-secondary">{offer.college_name || '—'}</div>
                      </td>
                      <td>{offer.job_title || '—'}</td>
                      <td className="font-bold">{formatCurrency(Number(offer.salary) || 0)}</td>
                      <td>{offer.location || '—'}</td>
                      <td className="text-sm">{offer.deadline_at ? formatDate(offer.deadline_at) : '—'}</td>
                      <td>
                        <span className={`badge badge-${getStatusColor(offer.status)} badge-dot`}>
                          {formatStatus(offer.status || 'unknown')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                          <StandardTableIconAction
                            action="view"
                            showLabel={false}
                            onClick={() => {
                              setViewRow(offer);
                            }}
                          />
                          <StandardTableIconAction action="edit" showLabel={false} onClick={() => openEdit(offer)} />
                          {['accepted', 'rejected', 'revoked', 'expired'].includes(offer.status) && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon btn-sm"
                              title="Restore pending offer"
                              aria-label="Restore pending offer"
                              onClick={() => reopenOffer(offer.id)}
                            >
                              <RotateCcw size={16} strokeWidth={2} aria-hidden />
                            </button>
                          )}
                          {offer.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon btn-sm"
                                title="Resend offer email"
                                aria-label="Resend offer email"
                                onClick={() => resendOfferEmail(offer.id)}
                              >
                                <Mail size={16} strokeWidth={2} aria-hidden />
                              </button>
                              <StandardTableIconAction
                                action="archive"
                                variant="danger"
                                showLabel={false}
                                onClick={() => revokeOffer(offer.id)}
                              />
                            </>
                          )}
                          <StandardTableIconAction
                            action="delete"
                            variant="danger"
                            showLabel={false}
                            onClick={() => deleteOffer(offer.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : null}
                {tabOffers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem 1rem' }}>
                      <div className="empty-state-container" style={{ textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
                        <FileText size={32} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', marginBottom: '0.75rem' }} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                          No {eventTab === 'internship' ? 'internship' : eventTab === 'alumni_jobs' ? 'alumni job' : 'drive'} offers yet
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: 0, lineHeight: 1.5 }}>
                          {eventTab === 'drive'
                            ? 'Mark students selected on a drive, create a Drive template, then use Generate offers above — or Create offer for one student.'
                            : eventTab === 'internship'
                              ? 'Mark students selected on Applications → Internships, create an Internship template, then use Generate internship offers above. PPO is a separate step after the internship.'
                              : 'Use Create offer for alumni selections that are not tied to a campus placement drive.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AppContentCard>

      {viewRow ? (
        <AppContentCard
          title="Offer detail"
          actions={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewRow(null)}>
              Close
            </button>
          }
        >
          <div className="text-sm" style={{ lineHeight: 1.7 }}>
            <div><strong>Student:</strong> {viewRow.student_name}</div>
            <div><strong>College:</strong> {viewRow.college_name || '—'}</div>
            <div><strong>Role:</strong> {viewRow.job_title || '—'}</div>
            <div><strong>Salary:</strong> {formatCurrency(Number(viewRow.salary) || 0)}</div>
            <div><strong>Location:</strong> {viewRow.location || '—'}</div>
            <div><strong>Joining:</strong> {viewRow.joining_date ? formatDate(viewRow.joining_date) : '—'}</div>
            <div><strong>Deadline:</strong> {viewRow.deadline_at ? formatDate(viewRow.deadline_at) : '—'}</div>
            <div><strong>Status:</strong> {formatStatus(viewRow.status)}</div>
            {viewRow.offer_letter_url ? (
              <div>
                <strong>Offer letter:</strong>{' '}
                <a href={viewRow.offer_letter_url} target="_blank" rel="noopener noreferrer" className="link-inline">
                  View document
                </a>
              </div>
            ) : null}
          </div>
        </AppContentCard>
      ) : null}
    </div>
  );
}
