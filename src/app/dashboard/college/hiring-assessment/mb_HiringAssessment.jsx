'use client';
import { useEffect, useMemo, useState } from 'react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';
import { buildAssessmentSummary } from '@/lib/assessmentHiringViewShared';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { ClipboardList, Users, Upload, Download, Search, Building2 } from 'lucide-react';
import { HiringResultBreakdown } from '@/components/assessment/HiringResultBreakdown';

export default function mb_HiringAssessment() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch('/api/college/hiring-assessment-view');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        setLoadError(e?.message || 'Could not load assessment data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const displayRows = useMemo(() => pickRepresentativeAssessmentRows(rows), [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return displayRows.slice(0, 50);
    return displayRows.filter(r =>
      (r.candidate_name && r.candidate_name.toLowerCase().includes(q)) ||
      (r.roll_number && r.roll_number.toLowerCase().includes(q)) ||
      (r.employer_company && r.employer_company.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [displayRows, searchQuery]);

  const summary = payload?.summary || buildAssessmentSummary(rows);

  const downloadOffersImportStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('Template downloaded successfully.', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'results', label: 'Results' },
    { id: 'students', label: 'Students' }
  ];

  return (
    <>
      <MobileHeader
        title="Hiring Assessment"
        action={
          <button className="btn btn-ghost btn-sm" onClick={downloadOffersImportStarter} style={{ padding: '0.4rem', color: 'var(--primary-600)' }}>
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

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="skeleton" style={{ height: 100, borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: 100, borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: 100, borderRadius: '12px' }} />
          </div>
        ) : loadError ? (
          <div className="card" style={{ padding: '1rem', borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }}>
            <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600, fontSize: '0.9rem' }}>{loadError}</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{summary.uniqueStudentCount ?? 0}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>Total Students</div>
                    {summary.totalResultRows > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{summary.totalResultRows} upload row(s)</div>}
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(2,132,199,0.08)', color: 'var(--info-600)' }}>
                    <Upload size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{summary.uploadsCount}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>Upload Batches</div>
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(217,119,6,0.08)', color: 'var(--warning-600)' }}>
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{summary.withHiringResult ?? 0}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>With hiring result</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'results' && (
              <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <HiringResultBreakdown summary={summary} />
              </div>
            )}

            {activeTab === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    className="form-input"
                    placeholder="Search name, roll, or company..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem', borderRadius: '999px', background: 'var(--surface)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredRows.map((r) => {
                    const result = String(r.hiring_result || '').trim() || 'No decision';
                    const lk = result.toLowerCase();
                    const isSuccess = lk.includes('select') || lk.includes('shortlist');
                    const isFail = lk.includes('reject') || lk.includes('decline') || lk.includes('withdraw');
                    const badgeClass = isSuccess ? 'badge-success' : isFail ? 'badge-danger' : 'badge-primary';

                    return (
                      <div key={r.id} className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.candidate_name || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{r.roll_number}</div>
                          </div>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>
                            {result}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          <Building2 size={12} style={{ opacity: 0.7 }} />
                          <span style={{ fontWeight: 500 }}>{r.employer_company || '—'}</span>
                        </div>

                        {r.remarks && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>Remarks:</span> {r.remarks}
                          </div>
                        )}

                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-default)', fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                          From: {r.original_file_name || '—'}
                        </div>
                      </div>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      No assessment records found.
                    </div>
                  )}
                  {filteredRows.length === 50 && (
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Showing first 50 results. Use search to find specific students.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </>
  );
}
