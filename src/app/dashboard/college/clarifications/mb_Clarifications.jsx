'use client';
import { useCallback, useEffect, useState } from 'react';
import { loadClarifications } from '@/lib/demoClarifications';
import { useToast } from '@/components/ToastProvider';
import MobileHeader from '@/components/mobile/MobileHeader';
import { MessageSquare, ChevronDown, ChevronUp, Building2, Search } from 'lucide-react';

export default function mb_Clarifications() {
  const { addToast } = useToast();
  const [data, setData] = useState({ batches: [] });
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [openBatchIds, setOpenBatchIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return String(d).slice(0, 10);
    }
  };

  const refresh = useCallback(async () => {
    try {
      const payload = await loadClarifications();
      setData({ batches: Array.isArray(payload?.batches) ? payload.batches : [] });
    } catch (e) {
      addToast(e.message || 'Failed to load clarifications', 'error');
      setData({ batches: [] });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    const batches = Array.isArray(data.batches) ? data.batches : [];
    let results = q
      ? batches.filter(
          (b) =>
            String(b.company || '').toLowerCase().includes(q) ||
            (Array.isArray(b.questions) &&
              b.questions.some((qn) => String(qn.text || '').toLowerCase().includes(q))),
        )
      : [...batches];

    results = results.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    setFiltered(results);
  }, [search, data.batches]);

  const toggleBatch = (id) => {
    setOpenBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <MobileHeader title="Clarifications" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            className="form-input" 
            placeholder="Search companies or questions..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ width: '100%', borderRadius: '999px', paddingLeft: '2.25rem', background: 'var(--surface-2)' }} 
          />
        </div>

        <div style={{ background: 'var(--warning-50)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--warning-200)', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--warning-800)', lineHeight: 1.4 }}>
          <strong>Note:</strong> Read-only view for college admins. Students and companies post from their respective accounts.
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: '12px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <div style={{ fontWeight: 600 }}>No threads found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((batch) => {
              const isOpen = openBatchIds.has(batch.id);
              const questions = Array.isArray(batch.questions) ? batch.questions : [];
              const answeredCount = questions.filter((q) => q.answer).length;
              
              return (
                <div key={batch.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => toggleBatch(batch.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '1rem',
                      background: isOpen ? 'var(--primary-50)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{batch.company}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(batch.postedAt)}</div>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={18} color="var(--text-tertiary)" /> : <ChevronDown size={18} color="var(--text-tertiary)" />}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingLeft: '2.75rem' }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{questions.length} Qs</span>
                      {answeredCount > 0 && (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{answeredCount} Answered</span>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-default)', background: 'var(--surface)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {questions.map((q, idx) => (
                          <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0 12px 12px 12px', border: '1px solid var(--border-default)' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Q{idx + 1} · {batch.postedBy}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{q.text}</div>
                            </div>

                            {q.answer ? (
                              <div style={{ background: 'var(--primary-50)', padding: '0.75rem', borderRadius: '12px 0 12px 12px', border: '1px solid var(--primary-200)', marginLeft: '1rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary-700)', marginBottom: '0.25rem', textAlign: 'right' }}>
                                  {q.answeredBy || batch.company} · Answer
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{q.answer}</div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic', paddingLeft: '1rem' }}>
                                ⏳ Awaiting response
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
