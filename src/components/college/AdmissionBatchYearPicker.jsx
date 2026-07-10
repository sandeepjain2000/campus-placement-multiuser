'use client';

import { useMemo } from 'react';
import { listAdmissionBatchYears } from '@/lib/admissionBatchYear';

/**
 * Selectable table of admission batch years (YYYY), oldest → newest.
 */
export default function AdmissionBatchYearPicker({ value, onChange, error, id = 'admission-batch-year' }) {
  const years = useMemo(() => listAdmissionBatchYears(), []);
  const selected = String(value || '').trim();

  return (
    <div>
      <div
        className="table-container"
        style={{
          maxHeight: '220px',
          overflow: 'auto',
          border: `1px solid ${error ? 'var(--danger-500)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
        }}
      >
        <table className="data-table" style={{ margin: 0 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', width: '100%' }}>Batch year</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => {
              const label = String(year);
              const active = selected === label;
              return (
                <tr
                  key={year}
                  onClick={() => onChange(label)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(label);
                    }
                  }}
                  tabIndex={0}
                  role="radio"
                  aria-checked={active}
                  style={{
                    cursor: 'pointer',
                    background: active ? 'var(--primary-50)' : undefined,
                  }}
                >
                  <td
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: active ? 700 : 500,
                      color: active ? 'var(--primary-700)' : 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <input type="hidden" id={id} name={id} value={selected} readOnly />
    </div>
  );
}
