'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import MobileHeader from '@/components/mobile/MobileHeader';
import { getCurrentAcademicYear } from '@/lib/academicYear';
import { BarChart2, TrendingUp, DollarSign, Building2, Trophy, Search, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load reports');
  return json;
};

export default function mb_Reports() {
  const { addToast } = useToast();
  const { data, isLoading, error } = useSWR('/api/college/reports', fetcher);
  const [activeTab, setActiveTab] = useState('overview');
  const [studentReportSearch, setStudentReportSearch] = useState('');
  const [currentAcademicYear, setCurrentAcademicYear] = useState(getCurrentAcademicYear());

  const DEPT_PLACEMENT = Array.isArray(data?.deptPlacement) ? data.deptPlacement : [];
  const SALARY_DIST = Array.isArray(data?.salaryDist) ? data.salaryDist : [];
  const TOP_RECRUITERS = Array.isArray(data?.topRecruiters) ? data.topRecruiters : [];
  const YOY = Array.isArray(data?.yoy) ? data.yoy : [];
  const STUDENT_COMPANY_EVENTS = Array.isArray(data?.studentCompanyEvents) ? data.studentCompanyEvents : [];
  const summary = data?.summary || { placementRate: 0, avgPackage: 0, highestPackage: 0, companiesVisited: 0 };

  const previousAcademicYear = useMemo(() => {
    const startYear = Number(currentAcademicYear.split('-')[0]);
    if (!Number.isFinite(startYear)) return '';
    const prevStart = startYear - 1;
    const prevEnd = String((prevStart + 1) % 100).padStart(2, '0');
    return `${prevStart}-${prevEnd}`;
  }, [currentAcademicYear]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncYear = () => { const saved = window.sessionStorage.getItem('activeAcademicYear'); if (saved) setCurrentAcademicYear(saved); };
    syncYear();
    window.addEventListener('placementhub-academic-year', syncYear);
    return () => window.removeEventListener('placementhub-academic-year', syncYear);
  }, []);

  const filteredStudentEvents = useMemo(() => {
    const q = studentReportSearch.trim().toLowerCase();
    if (!q) return STUDENT_COMPANY_EVENTS.slice(0, 50); // Limit initial view
    return STUDENT_COMPANY_EVENTS.filter((r) => 
      r.student.toLowerCase().includes(q) || r.roll.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || r.eventType.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [STUDENT_COMPANY_EVENTS, studentReportSearch]);

  const handleExportMobile = () => {
    addToast('Use the desktop view to download comprehensive CSV reports.', 'info');
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'charts', label: 'Stats' },
    { id: 'events', label: 'Events' }
  ];

  return (
    <>
      <MobileHeader 
        title="Reports" 
        action={
          <button className="btn btn-ghost btn-sm" onClick={handleExportMobile} style={{ padding: '0.4rem', color: 'var(--primary-600)' }}>
            <Download size={18} />
          </button>
        } 
      />
      
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
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

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: '12px' }} />)}
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: '1rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{error.message}</p>
          </div>
        )}

        {!isLoading && !error && activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Placement Rate', value: `${summary.placementRate}%`, icon: TrendingUp, color: 'var(--success-600)', bg: 'rgba(5,150,105,0.08)' },
              { label: 'Avg Package', value: summary.avgPackage ? `₹${(summary.avgPackage / 100000).toFixed(1)}L` : '—', icon: DollarSign, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
              { label: 'High Package', value: summary.highestPackage ? `₹${(summary.highestPackage / 100000).toFixed(1)}L` : '—', icon: TrendingUp, color: 'var(--warning-600)', bg: 'rgba(217,119,6,0.08)' },
              { label: 'Companies', value: summary.companiesVisited || 0, icon: Building2, color: 'var(--info-600)', bg: 'rgba(2,132,199,0.08)' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ padding: '0.5rem', borderRadius: '50%', background: bg, color }}><Icon size={20} /></div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>{label}</div>
                </div>
              </div>
            ))}

            {/* Top Recruiters mobile view */}
            <div className="card" style={{ gridColumn: '1 / -1', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Trophy size={18} style={{ color: 'var(--warning-500)' }} />
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Top Recruiters</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {TOP_RECRUITERS.map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, color: i === 0 ? 'var(--warning-500)' : 'var(--text-tertiary)' }}>#{i + 1}</span>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--success-600)' }}>{c.ctc}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{c.hires} hires</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && activeTab === 'charts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1rem' }}>Dept Placement</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {DEPT_PLACEMENT.map(d => (
                  <div key={d.dept}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{d.dept}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: d.pct >= 80 ? 'var(--success-600)' : d.pct >= 50 ? 'var(--warning-600)' : 'var(--danger-600)' }}>{d.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.pct}%`, background: d.pct >= 80 ? 'var(--success-500)' : d.pct >= 50 ? 'var(--warning-500)' : 'var(--danger-500)', borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1rem' }}>Salary Spread</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {SALARY_DIST.map(d => (
                  <div key={d.range}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{d.range}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, d.pct * 2.5)}%`, background: 'var(--primary-500)', borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1rem' }}>YoY Comparison</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {YOY.map(r => (
                  <div key={r.metric} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.metric}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{r.prev} → {r.curr}</div>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: r.up ? 'var(--success-600)' : 'var(--danger-600)' }}>
                      {r.up ? '↑' : '↓'} {r.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && activeTab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                className="form-input" 
                placeholder="Search students or companies..." 
                value={studentReportSearch} 
                onChange={e => setStudentReportSearch(e.target.value)} 
                style={{ paddingLeft: '2.5rem', borderRadius: '999px', background: 'var(--surface)' }} 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredStudentEvents.map((r, idx) => (
                <div key={idx} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.student}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{r.roll}</div>
                    </div>
                    <span className={`badge ${r.attended === 'Yes' ? 'badge-green' : r.attended === 'No' ? 'badge-gray' : 'badge-indigo'}`} style={{ fontSize: '0.65rem' }}>
                      {r.attended === 'Yes' ? 'Attended' : r.attended === 'No' ? 'Missed' : r.attended}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span><Building2 size={12} style={{ display: 'inline', marginRight: '4px' }}/>{r.company}</span>
                    <span>{r.eventType}</span>
                  </div>
                  
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{formatDate(r.eventDate)}</span>
                    <span style={{ fontWeight: 600, color: r.outcome.includes('Selected') ? 'var(--success-600)' : 'var(--text-primary)' }}>{r.outcome}</span>
                  </div>
                </div>
              ))}
              {filteredStudentEvents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No events found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
