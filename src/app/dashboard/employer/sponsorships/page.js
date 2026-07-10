'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Trophy, School, CreditCard, Building2, Landmark, X, Eye, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

/** Demo-only checkout — values are illustrative (Stripes-123 is not a real processor). */
const DEMO_CHECKOUT = {
  cardNumber: '4242 4242 4242 4242',
  expiry: '12 / 34',
  cvc: '123',
  nameOnCard: 'Anita Desai',
  line1: '42 Tech Park Road',
  line2: '4th Floor, Block B',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal: '560001',
  country: 'India',
};

const PAY_TABS = [
  { id: 'online', label: 'Pay online', icon: CreditCard },
  { id: 'cheque', label: 'Cheque', icon: Building2 },
  { id: 'bank', label: 'Bank transfer', icon: Landmark },
];

function flattenOpportunities(colleges) {
  const rows = [];
  for (const college of colleges) {
    for (const level of college.sponsorshipLevels || []) {
      for (const tier of level.tiers || []) {
        rows.push({
          opportunityId: tier.id,
          collegeId: college.id,
          collegeName: college.name,
          collegeLocation: college.location,
          category: level.category,
          categoryDescription: level.description,
          tierName: tier.name,
          price: tier.price,
          priceInr: tier.priceInr,
          benefits: tier.benefits,
          label: tier.label,
          canPayAnother: tier.canPayAnother,
        });
      }
    }
  }
  return rows;
}

export default function EmployerSponsorshipsPage() {
  const { addToast } = useToast();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sponsorModal, setSponsorModal] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);
  const [payTab, setPayTab] = useState('online');
  const [submitting, setSubmitting] = useState(false);
  const [proofDataUrl, setProofDataUrl] = useState('');
  /** Legal / tax lines for receipts (saved on payment + employer profile) */
  const [sponsorBilling, setSponsorBilling] = useState({ legalName: '', pan: '', gst: '' });
  /** 'form' | 'processing' | 'success' — demo Stripes-123 checkout only */
  const [stripeDemoStep, setStripeDemoStep] = useState('form');
  const stripeDemoTimerRef = useRef(null);

  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadColleges = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/employer/sponsorships');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load sponsorship data');
      const list = Array.isArray(json.colleges) ? json.colleges : [];
      setColleges(list);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadColleges({ showLoading: true });
      } catch {
        if (!mounted) return;
        setColleges([]);
        setLoading(false);
        addToast('Failed to load sponsorship data', 'error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadColleges, addToast]);

  const allRows = useMemo(() => flattenOpportunities(colleges), [colleges]);

  const collegeOptions = useMemo(() => {
    const m = new Map();
    for (const c of colleges) m.set(c.id, c.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [colleges]);

  const categoryOptions = useMemo(() => {
    const s = new Set();
    for (const r of allRows) s.add(r.category);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (collegeFilter && r.collegeId !== collegeFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (statusFilter === 'available' && !r.canPayAnother) return false;
      if (statusFilter === 'complete' && r.canPayAnother) return false;
      if (q) {
        const hay = `${r.collegeName} ${r.collegeLocation} ${r.category} ${r.tierName} ${r.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, search, collegeFilter, categoryFilter, statusFilter]);

  const remittanceForModal = useMemo(() => {
    if (!sponsorModal?.collegeId) return {};
    const c = colleges.find((x) => x.id === sponsorModal.collegeId);
    return c?.remittance || {};
  }, [sponsorModal?.collegeId, colleges]);

  const closeModal = () => {
    if (stripeDemoTimerRef.current) {
      clearTimeout(stripeDemoTimerRef.current);
      stripeDemoTimerRef.current = null;
    }
    setSponsorModal(null);
    setPayTab('online');
    setProofDataUrl('');
    setSubmitting(false);
    setStripeDemoStep('form');
    setSponsorBilling({ legalName: '', pan: '', gst: '' });
  };

  const submitPayment = async (method) => {
    if (!sponsorModal?.opportunityId) return;
    if (sponsorModal.canPayAnother === false) {
      addToast('Your company already has a recorded payment for this tier.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/sponsorships/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: sponsorModal.opportunityId,
          method,
          proofDataUrl: method === 'bank_transfer' ? proofDataUrl || undefined : undefined,
          billingLegalName: sponsorBilling.legalName,
          billingPan: sponsorBilling.pan,
          billingGstNumber: sponsorBilling.gst,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json.error || 'Could not record payment', 'warning');
        return;
      }
      const se = json.sponsorshipEmails;
      if (se && se.receipt !== 'sent' && se.receipt !== 'already_sent') {
        addToast(
          se.receipt === 'skipped_smtp'
            ? 'Payment recorded. Emails need SMTP to be configured — receipt may not have been sent.'
            : 'Payment recorded. The thank-you email may have been sent, but the receipt email did not complete. Check spam or ask the college to resend from their dashboard.',
          'warning',
        );
      }
      addToast(
        method === 'online'
          ? 'Payment successful via Stripes-123 (demo). You should receive two emails: thank-you and receipt.'
          : method === 'cheque'
            ? 'Recorded. You should receive two emails: thank-you and receipt.'
            : 'Recorded. You should receive two emails: thank-you and receipt.',
        'success',
      );
      await loadColleges();
      closeModal();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onProofFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setProofDataUrl('');
      return;
    }
    if (f.size > 350 * 1024) {
      addToast('Use a smaller image (under ~350KB) for the demo upload.', 'warning');
      e.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = () => setProofDataUrl(String(r.result || ''));
    r.readAsDataURL(f);
  };

  const runDemoStripeAuthorize = () => {
    if (stripeDemoTimerRef.current) clearTimeout(stripeDemoTimerRef.current);
    setStripeDemoStep('processing');
    stripeDemoTimerRef.current = setTimeout(() => {
      stripeDemoTimerRef.current = null;
      setStripeDemoStep('success');
    }, 1400);
  };

  useEffect(() => {
    if (payTab !== 'online') {
      setStripeDemoStep('form');
      if (stripeDemoTimerRef.current) {
        clearTimeout(stripeDemoTimerRef.current);
        stripeDemoTimerRef.current = null;
      }
    }
  }, [payTab]);

  useEffect(() => {
    return () => {
      if (stripeDemoTimerRef.current) clearTimeout(stripeDemoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!sponsorModal?.opportunityId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/employer/profile');
        const json = await res.json().catch(() => ({}));
        if (cancelled || !json.profile) return;
        const pr = json.profile;
        setSponsorBilling({
          legalName:
            String(pr.billing_legal_name || '').trim() || String(pr.company_name || '').trim(),
          pan: String(pr.billing_pan || '').trim(),
          gst: String(pr.billing_gst_number || '').trim(),
        });
      } catch {
        if (!cancelled) setSponsorBilling({ legalName: '', pan: '', gst: '' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsorModal?.opportunityId]);

  const openPay = (row) => {
    setStripeDemoStep('form');
    setPayTab('online');
    setProofDataUrl('');
    setSponsorModal({
      collegeId: row.collegeId,
      collegeName: row.collegeName,
      opportunityId: row.opportunityId,
      category: row.category,
      tierName: row.tierName,
      price: row.price,
      priceInr: row.priceInr,
      canPayAnother: row.canPayAnother,
    });
  };

  const modalBackdrop = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.55)',
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={24} className="text-primary" aria-hidden />
            Sponsorships
          </h1>
          <p>
            Browse tiers across campuses. Each tier is a single sponsorship amount for your company — pay online (demo),
            by cheque, or bank transfer.
          </p>
        </div>
        <Link href="/dashboard/employer/overview" className="btn btn-secondary btn-sm">
          Overview
        </Link>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <School size={16} className="text-secondary" aria-hidden />
            <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
              College
            </span>
            <select
              className="form-select"
              style={{ minWidth: 200 }}
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
            >
              <option value="">All colleges</option>
              {collegeOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
              Category
            </span>
            <select
              className="form-select"
              style={{ minWidth: 180 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
              Payment
            </span>
            <select
              className="form-select"
              style={{ minWidth: 160 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All tiers</option>
              <option value="available">Not paid yet</option>
              <option value="complete">Already paid</option>
            </select>
          </label>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
            <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
              Search
            </span>
            <input
              className="form-input"
              placeholder="College, tier, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="text-xs text-secondary" style={{ marginLeft: 'auto' }}>
            {loading ? 'Loading…' : `Showing ${filteredRows.length} of ${allRows.length}`}
          </span>
        </div>
      </div>

      {loading ? (
        <PageLoading message="Loading sponsorship opportunities…" inline>
          <div className="table-container" aria-hidden="true">
            <table className="data-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th>Category</th>
                  <th>Tier</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <div className="skeleton" style={{ height: 44, borderRadius: 6 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageLoading>
      ) : (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Category</th>
              <th>Tier</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ width: 1 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.opportunityId}>
                <td>
                  <div className="font-semibold">{row.collegeName}</div>
                  <div className="text-xs text-secondary">{row.collegeLocation}</div>
                </td>
                <td className="text-sm">{row.category}</td>
                <td>
                  <div className="font-medium">{row.tierName}</div>
                  {row.label ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="badge badge-primary">{row.label}</span>
                    </div>
                  ) : null}
                </td>
                <td className="font-semibold">{row.price}</td>
                <td>
                  {row.canPayAnother ? (
                    <span className="badge badge-green">Available</span>
                  ) : (
                    <span className="badge badge-gray">Paid</span>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <StandardTableIconAction
                    action="view"
                    variant="ghost"
                    onClick={() => setDetailsRow(row)}
                    tooltip={`View benefits for ${row.tierName}`}
                  />
                  <StandardTableIconAction
                    action="sponsor"
                    variant="primary"
                    style={{ marginLeft: '0.25rem' }}
                    disabled={!row.canPayAnother}
                    onClick={() => openPay(row)}
                    tooltip={row.canPayAnother ? 'Record sponsorship payment' : 'Already paid for this tier'}
                  />
                </td>
              </tr>
            ))}
            {allRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-secondary">
                  No active sponsorship opportunities right now.
                </td>
              </tr>
            ) : null}
            {allRows.length > 0 && filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-secondary">
                  No tiers match your filters. Try clearing search or filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      )}

      {detailsRow ? (
        <div
          style={modalBackdrop}
          role="presentation"
          onClick={() => setDetailsRow(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsor-details-title"
            className="card"
            style={{
              maxWidth: 480,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.25rem',
              position: 'relative',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Close"
              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
              onClick={() => setDetailsRow(null)}
            >
              <X size={18} />
            </button>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              {detailsRow.collegeName}
            </p>
            <h2 id="sponsor-details-title" style={{ fontSize: '1.1rem', margin: '0.35rem 0' }}>
              {detailsRow.tierName}
            </h2>
            <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
              {detailsRow.category} · {detailsRow.price}
            </p>
            {detailsRow.categoryDescription ? (
              <p className="text-sm" style={{ marginBottom: '0.75rem' }}>
                {detailsRow.categoryDescription}
              </p>
            ) : null}
            <strong className="text-sm">Benefits</strong>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {(detailsRow.benefits || []).map((b, bi) => (
                <li key={bi} style={{ marginBottom: '0.35rem' }}>
                  {b}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailsRow(null)}>
                Close
              </button>
              {detailsRow.canPayAnother ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setDetailsRow(null);
                    openPay(detailsRow);
                  }}
                >
                  Sponsor
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {sponsorModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-modal-title"
          style={modalBackdrop}
          onClick={(e) => e.target === e.currentTarget && !submitting && closeModal()}
        >
          <div
            className="card"
            style={{
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.5rem',
              position: 'relative',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={closeModal}
              disabled={submitting}
              aria-label="Close"
              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <span className="badge badge-gray" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>
              Checkout
            </span>
            <h2 id="sponsor-modal-title" style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 800 }}>
              Complete sponsorship
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {sponsorModal.tierName} · {sponsorModal.category} · {sponsorModal.collegeName} ·{' '}
              <strong>{sponsorModal.price}</strong> (full tier amount)
            </p>

            <div
              style={{
                marginBottom: '1rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
              }}
            >
              <p className="text-sm font-semibold" style={{ margin: '0 0 0.35rem' }}>
                Legal &amp; tax details (for college receipts)
              </p>
              <p className="text-xs text-secondary" style={{ margin: '0 0 0.75rem', lineHeight: 1.45 }}>
                Shown on donation/sponsorship acknowledgment emails from the institution. PAN format AAAAA9999A; GSTIN 15
                characters. All optional, but recommended for formal records.
              </p>
              <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                <label className="form-label text-xs">Legal name</label>
                <input
                  className="form-input form-input-sm"
                  value={sponsorBilling.legalName}
                  onChange={(e) => setSponsorBilling((b) => ({ ...b, legalName: e.target.value }))}
                  placeholder="Registered name as on invoice / bank"
                  disabled={submitting}
                  autoComplete="organization"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-xs">PAN</label>
                  <input
                    className="form-input form-input-sm"
                    value={sponsorBilling.pan}
                    onChange={(e) => setSponsorBilling((b) => ({ ...b, pan: e.target.value.toUpperCase() }))}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    disabled={submitting}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-xs">GSTIN</label>
                  <input
                    className="form-input form-input-sm"
                    value={sponsorBilling.gst}
                    onChange={(e) => setSponsorBilling((b) => ({ ...b, gst: e.target.value.toUpperCase() }))}
                    placeholder="15-character GSTIN"
                    maxLength={15}
                    disabled={submitting}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Payment method"
              style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}
            >
              {PAY_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={payTab === id}
                  className={payTab === id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={() => setPayTab(id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  disabled={submitting}
                >
                  <Icon size={16} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>

            {payTab === 'online' && (
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-primary)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  <CreditCard size={18} aria-hidden />
                  Stripes-123 — secure demo checkout
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.9, fontWeight: 500 }}>
                    <Lock size={14} aria-hidden /> Test mode
                  </span>
                </div>

                <div style={{ padding: '1rem' }}>
                  {stripeDemoStep === 'form' && (
                    <>
                      <p className="text-xs text-secondary" style={{ margin: '0 0 1rem' }}>
                        Card and billing below are <strong>prefilled dummies</strong>. This screen is for demos only — no
                        real card is charged.
                      </p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.65rem',
                          marginBottom: '0.65rem',
                        }}
                      >
                        <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                          <label className="form-label">Card number</label>
                          <input className="form-input" readOnly value={DEMO_CHECKOUT.cardNumber} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Expires</label>
                          <input className="form-input" readOnly value={DEMO_CHECKOUT.expiry} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">CVC</label>
                          <input className="form-input" readOnly value={DEMO_CHECKOUT.cvc} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                          <label className="form-label">Name on card</label>
                          <input className="form-input" readOnly value={DEMO_CHECKOUT.nameOnCard} />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-secondary" style={{ margin: '0.75rem 0 0.35rem' }}>
                        Billing address
                      </p>
                      <div style={{ display: 'grid', gap: '0.65rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Address line 1</label>
                          <input className="form-input" readOnly value={DEMO_CHECKOUT.line1} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Address line 2</label>
                          <input className="form-input" readOnly value={DEMO_CHECKOUT.line2} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">City</label>
                            <input className="form-input" readOnly value={DEMO_CHECKOUT.city} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">State</label>
                            <input className="form-input" readOnly value={DEMO_CHECKOUT.state} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Postal code</label>
                            <input className="form-input" readOnly value={DEMO_CHECKOUT.postal} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Country</label>
                            <input className="form-input" readOnly value={DEMO_CHECKOUT.country} />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={submitting}
                        onClick={() => runDemoStripeAuthorize()}
                      >
                        Sponsor — ₹{new Intl.NumberFormat('en-IN').format(sponsorModal.priceInr || 0)} (authorize on Stripes-123)
                      </button>
                    </>
                  )}

                  {stripeDemoStep === 'processing' && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                      <span className="animate-spin-slow" style={{ color: 'var(--primary-600)' }} aria-hidden>
                        <Loader2 size={36} />
                      </span>
                      <p style={{ margin: '1rem 0 0', fontWeight: 600 }}>Contacting Stripes-123…</p>
                      <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0' }}>
                        Validating test card •••• 4242 and billing address (simulated).
                      </p>
                    </div>
                  )}

                  {stripeDemoStep === 'success' && (
                    <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          background: 'var(--success-50, #ecfdf5)',
                          color: 'var(--success-600, #059669)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <CheckCircle2 size={28} aria-hidden />
                      </div>
                      <p style={{ margin: '1rem 0 0', fontWeight: 700, fontSize: '1.05rem' }}>Payment approved</p>
                      <p className="text-sm text-secondary" style={{ margin: '0.5rem 0 0', lineHeight: 1.55 }}>
                        Stripes-123 reports <strong>success</strong>. Your test card ending in <strong>4242</strong> was
                        authorized for{' '}
                        <strong>₹{new Intl.NumberFormat('en-IN').format(sponsorModal.priceInr || 0)}</strong>.
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          margin: '0.75rem 0 0',
                          fontFamily: 'ui-monospace, monospace',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        Reference: STRP-DEMO-{String(sponsorModal.opportunityId || '').slice(0, 8) || 'XXXXXXXX'} ·
                        Auth OK (sandbox)
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1.25rem' }}
                        disabled={submitting}
                        onClick={() => void submitPayment('online')}
                      >
                        {submitting ? 'Recording on campus ledger…' : 'Record payment & notify college'}
                      </button>
                      <p className="text-xs text-tertiary" style={{ margin: '0.65rem 0 0' }}>
                        This final step saves the sponsorship payment to your account (same as before).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {payTab === 'cheque' && (
              <div
                className="wireframe-banner"
                style={{
                  display: 'block',
                  background: 'var(--bg-secondary)',
                  borderStyle: 'solid',
                  borderColor: 'var(--border-default)',
                }}
              >
                <strong>Mail a cheque</strong>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Make cheque payable to{' '}
                  <strong>{remittanceForModal.chequePayableTo || sponsorModal.collegeName}</strong>. Mention{' '}
                  <strong>{sponsorModal.tierName}</strong> on the memo / reverse.
                </p>
                <address
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.875rem',
                    fontStyle: 'normal',
                    lineHeight: 1.6,
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-default)',
                    background: 'var(--bg-primary)',
                  }}
                >
                  Sponsorship Cell — Finance &amp; Accounts
                  <br />
                  {sponsorModal.collegeName}
                  <br />
                  {remittanceForModal.branch ? `Ref: ${remittanceForModal.branch}` : 'See college contact for mailing address'}
                </address>
                <div style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => submitPayment('cheque')}>
                    {submitting ? 'Saving…' : 'Confirm cheque has been mailed'}
                  </button>
                  <p className="text-xs text-tertiary" style={{ marginTop: '0.5rem' }}>
                    The college team will see this confirmation on their sponsorship dashboard.
                  </p>
                </div>
              </div>
            )}

            {payTab === 'bank' && (
              <div
                className="wireframe-banner"
                style={{
                  display: 'block',
                  background: 'var(--bg-secondary)',
                  borderStyle: 'solid',
                  borderColor: 'var(--border-default)',
                }}
              >
                <strong>Bank transfer (NEFT / RTGS / IMPS)</strong>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Use the details below. Reference: your company name + {sponsorModal.tierName}.
                </p>
                <dl
                  style={{
                    margin: '1rem 0 0',
                    display: 'grid',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-default)',
                    background: 'var(--bg-primary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Account name</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{remittanceForModal.accountName || 'Not configured'}</dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Bank</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{remittanceForModal.bankName || 'Not configured'}</dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Account no.</dt>
                    <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                      {remittanceForModal.accountNumber || 'Not configured'}
                    </dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">IFSC</dt>
                    <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>{remittanceForModal.ifsc || 'Not configured'}</dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Branch</dt>
                    <dd style={{ margin: 0 }}>{remittanceForModal.branch || 'Not configured'}</dd>
                  </div>
                </dl>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Transfer receipt screenshot (optional)</label>
                  <input type="file" className="form-input" accept="image/*" onChange={onProofFile} disabled={submitting} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={submitting || !remittanceForModal.accountNumber}
                    onClick={() => submitPayment('bank_transfer')}
                  >
                    {submitting ? 'Saving…' : 'I have completed the bank transfer'}
                  </button>
                  {!remittanceForModal.accountNumber && (
                    <p className="text-xs text-tertiary" style={{ marginTop: '0.5rem' }}>
                      College has not published bank details yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
