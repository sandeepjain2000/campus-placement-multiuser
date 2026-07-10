'use client';
import { useMemo, useState } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';

import { Trophy, FlaskConical, Palette, Banknote, FileCheck2 } from 'lucide-react';
import CompanyNameLink from '@/components/CompanyNameLink';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load sponsorship opportunities');
  return json;
};

const categoryMeta = {
  'Campus Infrastructure': { icon: <Trophy size={24} />, color: '#3b82f6' },
  'Research & Labs': { icon: <FlaskConical size={24} />, color: '#10b981' },
  'Alumni Mentorship': { icon: <Palette size={24} />, color: '#a855f7' },
};

const settingsFetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
  return json;
};

function formatPaymentStatus(status, method) {
  const s = String(status || '');
  if (s === 'completed') return 'Paid online (demo gateway)';
  if (s === 'cheque_mailed') return 'Cheque mailed (employer confirmed)';
  if (s === 'bank_transfer_submitted') return 'Bank transfer reported';
  return `${s} · ${method || ''}`;
}

export default function CollegeSponsorshipsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('All Categories');
  const { data, error, mutate } = useSWR('/api/college/sponsorships', fetcher);
  const [sendingReceiptFor, setSendingReceiptFor] = useState(null);
  const { data: settingsData } = useSWR('/api/college/settings', settingsFetcher);

  const sponsorshipLevels = useMemo(() => (Array.isArray(data?.categories) ? data.categories : []), [data]);
  const payments = useMemo(() => (Array.isArray(data?.payments) ? data.payments : []), [data]);
  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayPayments,
    filteredCount,
    totalCount: paymentsTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(payments, {
    getSearchText: (p) =>
      [p.companyName, p.tierName, p.method, p.status, p.billingLegalName, p.reference].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });
  const collegeName = data?.collegeName || 'Your Institution';
  const placementEmail = String(settingsData?.placementOfficer?.email || '').trim();

  const downloadGuide = () => {
    const lines = sponsorshipLevels.flatMap((level) => [
      `${level.category}`,
      `${level.description || ''}`,
      ...level.tiers.map((tier) => `- ${tier.name}: ${tier.price} (${(tier.benefits || []).join('; ')})`),
      '',
    ]);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'college_sponsorship_guide.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast('Sponsorship guide downloaded.', 'success');
  };

  const sendTaxReceipt = async (paymentId) => {
    setSendingReceiptFor(paymentId);
    try {
      const res = await fetch('/api/college/sponsorships/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        addToast(json.error || 'Receipt already sent.', 'info');
        await mutate();
        return;
      }
      if (!res.ok) {
        addToast(json.error || 'Could not send receipt', 'warning');
        return;
      }
      addToast(
        `Receipt ${json.receiptNumber || ''} emailed to ${json.toEmail || 'employer'}.`,
        'success',
      );
      await mutate();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSendingReceiptFor(null);
    }
  };

  const scheduleMeeting = () => {
    if (!placementEmail) {
      addToast('Add a placement officer email in Settings, then try again.', 'warning');
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(placementEmail)}?subject=${encodeURIComponent(
      `Sponsorship discussion with ${collegeName}`,
    )}`;
  };

  const tabs = useMemo(
    () => ['All Categories', ...sponsorshipLevels.map((s) => s.category)],
    [sponsorshipLevels]
  );

  const visibleLevels = useMemo(
    () => sponsorshipLevels.filter((s) => activeTab === 'All Categories' || s.category === activeTab),
    [activeTab, sponsorshipLevels]
  );

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>
            Invest in the <span style={{ color: 'rgba(255,255,255,0.75)' }}>Future</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', maxWidth: 560, margin: '0 auto 1.75rem' }}>
            Live sponsorship opportunities for {collegeName}. Use this as your college-facing catalog of active sponsor tiers.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn banner-cta-solid" onClick={downloadGuide}>Download Guide</button>
            <button className="btn" onClick={scheduleMeeting} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}>Schedule Meeting</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Banknote size={20} aria-hidden="true" />
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Employer payment activity</h2>
        </div>
        <p className="text-sm text-secondary" style={{ margin: '0 0 1rem' }}>
          Cheque mailed confirmations, bank transfer reports (with optional screenshot flag), and Stripes-123 demo payments
          appear here. Employers automatically receive <strong>two separate emails</strong> when they record a payment: a
          thank-you from your institution, then a formal receipt (template-based). Employer-submitted{' '}
          <strong>legal name, PAN, and GSTIN</strong> appear under each company. Use <strong>Tax receipt</strong> only if
          the automatic receipt did not go out (e.g. SMTP was off); it is disabled once a receipt is logged.
        </p>
        {paymentsTotalCount === 0 ? (
          <p className="text-sm text-secondary" style={{ margin: 0 }}>No payments recorded yet.</p>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search employer, tier, or status…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={paymentsTotalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
              style={{ marginBottom: '1rem' }}
            />
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Employer</th>
                  <th>Tier</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Ref / #</th>
                  <th style={{ width: 1 }}>Tax receipt</th>
                </tr>
              </thead>
              <tbody>
                {displayPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary">
                      No payments match your search.
                    </td>
                  </tr>
                ) : null}
                {displayPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="text-sm">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
                    <td>
                      <div>
                        <CompanyNameLink name={p.companyName} website={p.companyWebsite} />
                      </div>
                      {(p.billingLegalName || p.billingPan || p.billingGstNumber) ? (
                        <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem', lineHeight: 1.4 }}>
                          {p.billingLegalName ? <div>Legal: {p.billingLegalName}</div> : null}
                          {p.billingPan ? <div>PAN: {p.billingPan}</div> : null}
                          {p.billingGstNumber ? <div>GSTIN: {p.billingGstNumber}</div> : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-sm">{p.tierName} <span className="text-tertiary">({p.category})</span></td>
                    <td>{p.method}</td>
                    <td className="text-sm">{formatPaymentStatus(p.status, p.method)}</td>
                    <td>{p.amountLabel}</td>
                    <td className="text-sm text-tertiary">
                      {p.gatewayReference || `Seq ${p.paymentSequence}`}
                      {p.hasProof ? ' · proof attached' : ''}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {p.receiptSent ? (
                        <span className="text-xs text-secondary" title={p.receiptNumber || ''}>
                          Sent
                          {p.receiptSentAt ? ` · ${new Date(p.receiptSentAt).toLocaleDateString('en-IN')}` : ''}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={sendingReceiptFor === p.id}
                          title="Email donation/sponsorship receipt to employer"
                          onClick={() => void sendTaxReceipt(p.id)}
                        >
                          <FileCheck2 size={14} style={{ marginRight: 4 }} aria-hidden />
                          {sendingReceiptFor === p.id ? 'Sending…' : 'Send receipt'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <div className="text-center" style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Sponsorship Opportunities</h2>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '2rem' }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {visibleLevels.map((level, i) => {
          const meta = categoryMeta[level.category] || { icon: <Trophy size={24} />, color: '#3b82f6' };
          return (
          <div key={i} className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ 
                background: meta.color, 
                width: '50px', 
                height: '50px', 
                borderRadius: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: 'white'
              }}>
                {meta.icon}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{level.category}</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{level.description}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {level.tiers.map((tier, ti) => (
                <div key={ti} style={{ 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '1rem', 
                  padding: '1.5rem',
                  borderLeft: `4px solid ${meta.color}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>{tier.name}</h4>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb' }}>{tier.price}</div>
                    </div>
                    {tier.label && <span className="badge badge-primary">{tier.label}</span>}
                  </div>
                  <ul style={{ padding: 0, listStyle: 'none', margin: 0, fontSize: '0.875rem' }}>
                    {tier.benefits.map((b, bi) => (
                      <li key={bi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: meta.color }}>✓</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )})}
      </div>

      {error && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="text-secondary">Failed to load sponsorship opportunities.</p>
        </div>
      )}
      {!error && sponsorshipLevels.length === 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="text-secondary">No active sponsorship opportunities found.</p>
        </div>
      )}

      <style jsx>{`
        .btn-white {
          background: white;
          color: #2563eb;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-white:hover {
          background: #f8fafc;
          transform: translateY(-2px);
        }
        .btn-outline-white {
          background: transparent;
          color: white;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          border: 2px solid white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline-white:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
