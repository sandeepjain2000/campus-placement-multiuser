'use client';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';
import MobileHeader from '@/components/mobile/MobileHeader';
import CompanyNameLink from '@/components/CompanyNameLink';
import { Trophy, FlaskConical, Palette, Banknote, FileCheck2, Download, Mail } from 'lucide-react';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load sponsorship opportunities');
  return json;
};

const settingsFetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
  return json;
};

const categoryMeta = {
  'Campus Infrastructure': { icon: <Trophy size={20} />, color: '#3b82f6' },
  'Research & Labs': { icon: <FlaskConical size={20} />, color: '#10b981' },
  'Alumni Mentorship': { icon: <Palette size={20} />, color: '#a855f7' },
};

function formatPaymentStatus(status, method) {
  const s = String(status || '');
  if (s === 'completed') return 'Paid online';
  if (s === 'cheque_mailed') return 'Cheque mailed';
  if (s === 'bank_transfer_submitted') return 'Bank transfer';
  return `${s} · ${method || ''}`;
}

export default function mb_Sponsorships() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('opportunities');
  const [activeCat, setActiveCat] = useState('All Categories');
  const { data, error, isLoading, mutate } = useSWR('/api/college/sponsorships', fetcher);
  const [sendingReceiptFor, setSendingReceiptFor] = useState(null);
  const { data: settingsData } = useSWR('/api/college/settings', settingsFetcher);

  const sponsorshipLevels = useMemo(() => (Array.isArray(data?.categories) ? data.categories : []), [data]);
  const payments = useMemo(() => (Array.isArray(data?.payments) ? data.payments : []), [data]);
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
      addToast(`Receipt sent to ${json.toEmail || 'employer'}.`, 'success');
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
    window.location.href = `mailto:${encodeURIComponent(placementEmail)}?subject=${encodeURIComponent(`Sponsorship discussion with ${collegeName}`)}`;
  };

  const tabs = useMemo(() => ['All Categories', ...sponsorshipLevels.map((s) => s.category)], [sponsorshipLevels]);
  const visibleLevels = useMemo(() => sponsorshipLevels.filter((s) => activeCat === 'All Categories' || s.category === activeCat), [activeCat, sponsorshipLevels]);

  return (
    <>
      <MobileHeader 
        title="Sponsorships" 
        action={
          <button className="btn btn-ghost btn-sm" onClick={downloadGuide} style={{ padding: '0.4rem', color: 'var(--primary-600)' }}>
            <Download size={18} />
          </button>
        } 
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        {/* Mobile Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          {[{ id: 'opportunities', label: 'Packages' }, { id: 'payments', label: 'Payments' }].map(({ id, label }) => (
            <button 
              key={id} 
              type="button" 
              onClick={() => setActiveTab(id)} 
              style={{ flex: 1, padding: '0.65rem 0', borderRadius: '8px', border: 'none', background: activeTab === id ? 'var(--primary-600)' : 'transparent', color: activeTab === id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === id ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'opportunities' && (
          <>
            <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', paddingBottom: '0.75rem', marginBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {tabs.map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveCat(tab)}
                  className={`btn ${activeCat === tab ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: '999px', whiteSpace: 'nowrap', padding: '0.4rem 1rem', fontSize: '0.8rem', flexShrink: 0, border: activeCat !== tab ? '1px solid var(--border-default)' : 'none' }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: '12px' }} />)}
              </div>
            ) : error ? (
              <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--danger-600)', margin: 0 }}>Failed to load sponsorship opportunities.</p>
              </div>
            ) : visibleLevels.length === 0 ? (
              <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No opportunities found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {visibleLevels.map((level, i) => {
                  const meta = categoryMeta[level.category] || { icon: <Trophy size={20} />, color: '#3b82f6' };
                  return (
                    <div key={i} className="card" style={{ padding: '1rem', borderTop: `4px solid ${meta.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ background: `${meta.color}15`, color: meta.color, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {meta.icon}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{level.category}</h3>
                        </div>
                      </div>
                      {level.description && (
                        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{level.description}</p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {level.tiers.map((tier, ti) => (
                          <div key={ti} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-default)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{tier.name}</h4>
                              {tier.label && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{tier.label}</span>}
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{tier.price}</div>
                            <ul style={{ padding: 0, listStyle: 'none', margin: 0, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {tier.benefits.map((b, bi) => (
                                <li key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                  <span style={{ color: meta.color, flexShrink: 0 }}>✓</span> <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <button className="btn btn-secondary" onClick={scheduleMeeting} style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Mail size={16} /> Discuss with Placement Office
            </button>
          </>
        )}

        {activeTab === 'payments' && (
          <>
            <div style={{ background: 'var(--info-50)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--info-200)', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--info-800)', lineHeight: 1.4 }}>
              <strong>Info:</strong> Employer payment activity and tax receipt generation.
            </div>

            {isLoading ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: '12px' }} />)}
             </div>
            ) : payments.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Banknote size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>No payments recorded</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {payments.map((p) => (
                  <div key={p.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        <CompanyNameLink name={p.companyName} website={p.companyWebsite} />
                      </div>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{formatPaymentStatus(p.status, p.method)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {p.tierName} <span style={{ opacity: 0.6 }}>({p.category})</span>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--success-600)' }}>{p.amountLabel}</div>
                    </div>

                    {(p.billingLegalName || p.billingPan || p.billingGstNumber) && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        {p.billingLegalName && <div>Legal: {p.billingLegalName}</div>}
                        {p.billingPan && <div>PAN: {p.billingPan}</div>}
                        {p.billingGstNumber && <div>GSTIN: {p.billingGstNumber}</div>}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                      {p.receiptSent ? (
                        <span style={{ color: 'var(--success-600)', fontWeight: 500 }}>
                          Receipt Sent
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={sendingReceiptFor === p.id}
                          onClick={() => void sendTaxReceipt(p.id)}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                        >
                          <FileCheck2 size={12} style={{ marginRight: 4 }} />
                          {sendingReceiptFor === p.id ? 'Sending…' : 'Send receipt'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </>
  );
}
