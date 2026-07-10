'use client';
import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { auditReportsFetcher } from '@/lib/auditReportsFetcher';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { Mail, Download, History, ShieldAlert } from 'lucide-react';

const swrQuiet = { shouldRetryOnError: false, revalidateOnFocus: false };

function toYmd(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AuditReportsMobile() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), []);
  const [from, setFrom] = useState(toYmd(thirtyDaysAgo));
  const [to, setTo] = useState(toYmd(today));
  const [email, setEmail] = useState(session?.user?.email || '');
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  const setPresetDays = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    setFrom(toYmd(start));
    setTo(toYmd(end));
  };

  const logsUrl = useMemo(() => `/api/audit/logs?from=${from}&to=${to}&limit=50`, [from, to]);

  const { data: logsData, isLoading: logsLoading, mutate: mutateLogs } = useSWR(
    logsUrl,
    auditReportsFetcher,
    swrQuiet,
  );
  const { data: exportsData, isLoading: exportsLoading, mutate: mutateExports } = useSWR(
    '/api/audit/reports?limit=20',
    auditReportsFetcher,
    swrQuiet,
  );
  const logs = logsData?.logs || [];
  const exportsList = exportsData?.exports || [];

  const runExport = async () => {
    if (!from || !to) { addToast('Select from/to dates first.', 'warning'); return; }
    if (!email.trim()) { addToast('Email is required.', 'warning'); return; }
    
    setExporting(true);
    try {
      const res = await fetch('/api/audit/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, email: email.trim() }),
      });
      if (!res.ok) {
        addToast('Could not start export. Please try again.', 'error');
        return;
      }
      addToast('Export started. Link will be emailed.', 'success');
      setActiveTab('exports');
      await Promise.all([mutateExports(), mutateLogs()]);
    } catch {
      addToast('Could not start export. Please try again.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { id: 'logs', label: 'Audit Logs' },
    { id: 'exports', label: 'Export Jobs' }
  ];

  return (
    <>
      <MobileHeader title="Audit Reports" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-default)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Filter & Export</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="text-xs text-secondary mb-1 block">From Date</label>
              <ValidatedDateInput
                fieldId={FIELD_IDS.DATE_RANGE_FROM}
                context={{ dateTo: to, maxSpanYears: 10 }}
                value={from}
                onChange={setFrom}
                aria-label="From date"
              />
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">To Date</label>
              <ValidatedDateInput
                fieldId={FIELD_IDS.DATE_RANGE_TO}
                context={{ dateFrom: from, maxSpanYears: 10 }}
                value={to}
                onChange={setTo}
                aria-label="To date"
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => setPresetDays(7)}>7 Days</button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => setPresetDays(30)}>30 Days</button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => setPresetDays(90)}>90 Days</button>
          </div>

          <div className="form-group mb-0">
            <label className="text-xs text-secondary mb-1 block">Email for Export Link</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '2rem' }} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={runExport} disabled={exporting} style={{ width: '100%', marginTop: '1rem' }}>
            <Download size={16} style={{ marginRight: '0.5rem' }} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          {tabs.map(({ id, label }) => (
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

        {activeTab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logsLoading ? (
              <div className="skeleton" style={{ height: 100, borderRadius: '12px' }} />
            ) : logs.length === 0 ? (
              <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <History size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No logs found for selected date range.</p>
              </div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{l.action || '—'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{l.created_at ? new Date(l.created_at).toLocaleString('en-IN') : '—'}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ width: '40px', fontWeight: 600 }}>Entity:</span>
                      <span>{l.entity_type || '—'} {l.entity_id ? `(${String(l.entity_id).slice(0, 8)}...)` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ width: '40px', fontWeight: 600 }}>User:</span>
                      <span>{l.user_id ? String(l.user_id).slice(0, 8) : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ width: '40px', fontWeight: 600 }}>IP:</span>
                      <span>{l.ip_address || '—'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'exports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {exportsLoading ? (
              <div className="skeleton" style={{ height: 100, borderRadius: '12px' }} />
            ) : exportsList.length === 0 ? (
              <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <ShieldAlert size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No export jobs run recently.</p>
              </div>
            ) : (
              exportsList.map((r) => (
                <div key={r.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{r.from_date} → {r.to_date}</span>
                    <span className={`badge badge-${r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}`} style={{ fontSize: '0.65rem' }}>
                      {r.status}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={12} style={{ opacity: 0.6 }} /> <span>{r.emailed_to || '—'}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                      {r.s3_key || (r.error_message ? `Error: ${r.error_message}` : '—')}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-default)', fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                    {r.created_at ? formatDate(r.created_at) : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </>
  );
}
