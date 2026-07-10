'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadClarifications } from '@/lib/demoClarifications';
import { useToast } from '@/components/ToastProvider';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Building2,
  Download,
  FileText,
  Lightbulb,
} from 'lucide-react';

/**
 * Read-only clarifications browser — same layout as /dashboard/student/clarifications
 * but college admins only view Q&A (no posting).
 */
export default function CollegeClarificationsPage() {
  const { addToast } = useToast();
  const [data, setData] = useState({ batches: [] });
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [openBatchIds, setOpenBatchIds] = useState(new Set());

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

    if (sortBy === 'name') {
      results = results.sort((a, b) => String(a.company || '').localeCompare(String(b.company || '')));
    } else {
      results = results.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    }
    setFiltered(results);
  }, [search, sortBy, data.batches]);

  const toggleBatch = (id) => {
    setOpenBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportAsText = (batch) => {
    const lines = [`Clarifications — ${batch.company}`, `Posted by: ${batch.postedBy}`, `Date: ${batch.postedAt}`, ''];
    (batch.questions || []).forEach((q, i) => {
      lines.push(`Q${i + 1}: ${q.text}`);
      lines.push(`A: ${q.answer || 'Awaiting company response.'}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(batch.company).replace(/\s+/g, '_')}_clarifications.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCsv = (batch) => {
    const rows = [['Question', 'Answer', 'Answered By']];
    (batch.questions || []).forEach((q) => {
      rows.push([`"${q.text}"`, `"${q.answer || 'Awaiting response'}"`, `"${q.answeredBy || ''}"`]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(batch.company).replace(/\s+/g, '_')}_clarifications.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--primary-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={18} color="var(--primary-600)" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Clarifications</h1>
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>
            Same view as students see — read only here. To publish official batches, use your placement tools; students post
            follow-ups from their Clarifications page.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--gray-400)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies or questions…"
            style={{ paddingLeft: '2.5rem', borderRadius: '999px', background: 'var(--surface-2)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>Sort:</span>
          <button
            type="button"
            onClick={() => setSortBy('date')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 500,
              border: '1px solid',
              cursor: 'pointer',
              background: sortBy === 'date' ? 'var(--primary-600)' : 'var(--surface-2)',
              color: sortBy === 'date' ? '#fff' : 'var(--gray-600)',
              borderColor: sortBy === 'date' ? 'var(--primary-600)' : 'var(--gray-300)',
              transition: 'all 0.15s',
            }}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setSortBy('name')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 500,
              border: '1px solid',
              cursor: 'pointer',
              background: sortBy === 'name' ? 'var(--primary-600)' : 'var(--surface-2)',
              color: sortBy === 'name' ? '#fff' : 'var(--gray-600)',
              borderColor: sortBy === 'name' ? 'var(--primary-600)' : 'var(--gray-300)',
              transition: 'all 0.15s',
            }}
          >
            A–Z
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray-400)' }}>
            <MessageSquare size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No clarification threads found{search ? ` for "${search}"` : ''}.</p>
          </div>
        ) : (
          filtered.map((batch) => {
            const isOpen = openBatchIds.has(batch.id);
            const questions = Array.isArray(batch.questions) ? batch.questions : [];
            const answeredCount = questions.filter((q) => q.answer).length;
            return (
              <div
                key={batch.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: isOpen ? '1px solid var(--primary-300)' : '1px solid var(--gray-200)',
                  transition: 'border-color 0.2s',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleBatch(batch.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: isOpen ? 'var(--primary-50)' : 'var(--surface)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--primary-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={18} color="var(--primary-600)" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-900)', marginBottom: '0.2rem' }}>
                      {batch.company}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{formatDate(batch.postedAt)}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span
                      style={{
                        padding: '0.2rem 0.7rem',
                        borderRadius: '999px',
                        background: 'var(--gray-100)',
                        color: 'var(--gray-600)',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                      }}
                    >
                      {questions.length} Q{questions.length !== 1 ? 's' : ''}
                    </span>
                    {answeredCount > 0 && (
                      <span
                        style={{
                          padding: '0.2rem 0.7rem',
                          borderRadius: '999px',
                          background: 'var(--success-100, #dcfce7)',
                          color: 'var(--success-700, #15803d)',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                        }}
                      >
                        {answeredCount} Answered
                      </span>
                    )}
                    {isOpen ? <ChevronUp size={18} color="var(--primary-600)" /> : <ChevronDown size={18} color="var(--gray-400)" />}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding: '1.25rem', borderTop: '1px solid var(--gray-200)', background: 'var(--surface)' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => exportAsText(batch)}
                      >
                        <FileText size={14} /> Export Text
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => exportAsCsv(batch)}
                      >
                        <Download size={14} /> Export CSV
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {questions.map((q, idx) => (
                        <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: 'var(--gray-200)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--gray-600)',
                              }}
                            >
                              Q{idx + 1}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                background: 'var(--gray-50)',
                                border: '1px solid var(--gray-200)',
                                borderRadius: '0 12px 12px 12px',
                                padding: '0.75rem 1rem',
                              }}
                            >
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '0.3rem' }}>
                                {batch.postedBy}
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--gray-800)', lineHeight: '1.5' }}>{q.text}</div>
                            </div>
                          </div>

                          {q.answer ? (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', paddingLeft: '2rem' }}>
                              <div
                                style={{
                                  flex: 1,
                                  background: 'var(--primary-50)',
                                  border: '1px solid var(--primary-200)',
                                  borderRadius: '12px 12px 12px 0',
                                  padding: '0.75rem 1rem',
                                }}
                              >
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-600)', marginBottom: '0.3rem' }}>
                                  {q.answeredBy || batch.company} · Official Answer
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--gray-800)', lineHeight: '1.5' }}>{q.answer}</div>
                              </div>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  background: 'var(--primary-100)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Building2 size={14} color="var(--primary-600)" />
                              </div>
                            </div>
                          ) : (
                            <div style={{ paddingLeft: '3.75rem' }}>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--gray-400)',
                                  fontStyle: 'italic',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                }}
                              >
                                ⏳ Awaiting response from {batch.company}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'var(--warning-50, #fffbeb)',
          border: '1px solid var(--warning-200, #fde68a)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <Lightbulb size={18} color="var(--warning-500, #f59e0b)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--warning-800, #92400e)', lineHeight: '1.6' }}>
          <strong>College view:</strong> Browse and export threads only. Student questions and placement-office batches appear
          here for transparency; posting is done from the student or employer flows.
        </p>
      </div>
    </div>
  );
}
