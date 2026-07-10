'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Plus, Trash2, CalendarRange } from 'lucide-react';
import { parseAcademicYearLabel } from '@/lib/academicYearTenant';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateAcademicYearsList } from '@/lib/apiInputValidation';
import SemesterRolloverPanel from '@/components/college/SemesterRolloverPanel';

function emptyYear(sequenceNumber = 1) {
  return {
    id: null,
    label: '',
    sequenceNumber,
    periodStart: '',
    periodEnd: '',
    semesterCount: 2,
    semesters: [
      { sequenceNumber: 1, periodStart: '', periodEnd: '' },
      { sequenceNumber: 2, periodStart: '', periodEnd: '' },
    ],
  };
}

function syncSemesterSlots(year) {
  const count = Number(year.semesterCount) || 2;
  const existing = Array.isArray(year.semesters) ? year.semesters : [];
  const semesters = [];
  for (let i = 1; i <= count; i++) {
    const found = existing.find((s) => Number(s.sequenceNumber) === i);
    semesters.push(
      found || { sequenceNumber: i, periodStart: '', periodEnd: '' },
    );
  }
  return { ...year, semesterCount: count, semesters };
}

export default function AcademicYearsEditor({ compact = false }) {
  const { addToast } = useToast();
  const [years, setYears] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/college/academic-years');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setYears(Array.isArray(json.years) ? json.years : []);
      setCurrent(json.current || null);
    } catch (e) {
      const msg = e.message || 'Failed to load academic years';
      setLoadError(msg);
      addToast(msg, 'error');
      setYears([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateYear = (index, patch) => {
    setYears((prev) => {
      const next = [...prev];
      let row = { ...next[index], ...patch };
      if ('semesterCount' in patch) row = syncSemesterSlots(row);
      next[index] = row;
      return next;
    });
  };

  const updateSemester = (yearIndex, semIndex, patch) => {
    setYears((prev) => {
      const next = [...prev];
      const semesters = [...(next[yearIndex].semesters || [])];
      semesters[semIndex] = { ...semesters[semIndex], ...patch };
      next[yearIndex] = { ...next[yearIndex], semesters };
      return next;
    });
  };

  const addYear = () => {
    setYears((prev) => [...prev, emptyYear(prev.length + 1)]);
  };

  const removeYear = (index) => {
    setYears((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    for (const y of years) {
      const p = parseAcademicYearLabel(y.label);
      if (!p.valid) {
        addToast(p.error || 'Invalid academic year label', 'error');
        return;
      }
    }
    const yearsErr = validateAcademicYearsList(years);
    if (yearsErr) {
      addToast(yearsErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/academic-years', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json?.details?.[0]?.errors?.join(' ') || json?.error;
        throw new Error(detail || 'Save failed');
      }
      setYears(json.years || []);
      setCurrent(json.current || null);
      addToast('Academic years saved.', 'success');
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: compact ? '1rem' : '2rem' }}>Loading academic years…</div>;
  }

  if (loadError) {
    return (
      <div style={{ padding: compact ? '1rem' : '2rem' }}>
        <p style={{ color: 'var(--danger-600)', marginBottom: '0.75rem' }}>{loadError}</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          If this is a fresh database, run migration <code>051_tenant_academic_years.sql</code>, then retry.
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: compact ? '1rem' : '2.5rem' }}>
      {!compact && (
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              Academic years & semesters
            </h1>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '42rem' }}>
              Map each session to a date range (non-overlapping). Semesters must sit inside the year period.
              Labels: <strong>YYYY</strong> or <strong>YYYY-YY</strong> (e.g. 2025-26). Default: 2 semesters per year.
            </p>
            {current?.label && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                System date falls in: <strong>{current.label}</strong>
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={addYear}>
              <Plus size={16} aria-hidden /> Add year
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save all'}
            </button>
          </div>
        </header>
      )}

      {compact && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addYear}>
            <Plus size={14} /> Add
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {years.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <CalendarRange size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '0.75rem' }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No academic years defined yet.</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={addYear}>
            Add first academic year
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {years.map((year, yi) => (
            <article key={year.id || `new-${yi}`} className="card" style={{ padding: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Sequence {year.sequenceNumber}
                  {year.label ? ` · ${year.label}` : ''}
                </h2>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeYear(yi)}
                  aria-label="Remove academic year"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Label (YYYY or YYYY-YY)</label>
                  <input
                    className="form-input"
                    placeholder="2025-26"
                    value={year.label}
                    onChange={(e) => updateYear(yi, { label: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sequence</label>
                  <ValidatedNumberInput
                    fieldId={FIELD_IDS.COLLEGE_ACAD_YEAR_SEQ}
                    className="form-input"
                    value={year.sequenceNumber}
                    onChange={(v) => updateYear(yi, { sequenceNumber: v === '' ? '' : Number(v) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Period start</label>
                  <ValidatedDateInput
                    fieldId={FIELD_IDS.COLLEGE_ACAD_PERIOD_START}
                    value={year.periodStart}
                    onChange={(v) => updateYear(yi, { periodStart: v })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Period end</label>
                  <ValidatedDateInput
                    fieldId={FIELD_IDS.COLLEGE_ACAD_PERIOD_END}
                    context={{ dateFrom: year.periodStart }}
                    value={year.periodEnd}
                    onChange={(v) => updateYear(yi, { periodEnd: v })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Semesters per year</label>
                  <select
                    className="form-input"
                    value={year.semesterCount}
                    onChange={(e) => updateYear(yi, { semesterCount: Number(e.target.value) })}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2 (default)</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              </div>

              <h3
                style={{
                  margin: '1.25rem 0 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-tertiary)',
                }}
              >
                Semester periods
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(year.semesters || []).map((sem, si) => (
                  <div
                    key={sem.sequenceNumber}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ fontWeight: 600, alignSelf: 'center' }}>Semester {sem.sequenceNumber}</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Start</label>
                      <ValidatedDateInput
                        fieldId={FIELD_IDS.PROJECT_START}
                        className="form-input"
                        value={sem.periodStart}
                        onChange={(v) => updateSemester(yi, si, { periodStart: v })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">End</label>
                      <ValidatedDateInput
                        fieldId={FIELD_IDS.PROJECT_END}
                        context={{ dateFrom: sem.periodStart }}
                        className="form-input"
                        value={sem.periodEnd}
                        onChange={(v) => updateSemester(yi, si, { periodEnd: v })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <SemesterRolloverPanel />
    </div>
  );
}
