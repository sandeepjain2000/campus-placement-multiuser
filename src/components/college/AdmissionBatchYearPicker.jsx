'use client';

import { useMemo } from 'react';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { listAdmissionBatchYears } from '@/lib/admissionBatchYear';

/**
 * Selectable table of admission batch years (YYYY), oldest → newest.
 */
export default function AdmissionBatchYearPicker({ value, onChange, error, id = 'admission-batch-year' }) {
  const years = useMemo(() => listAdmissionBatchYears(), []);
  const selected = String(value || '').trim();

  return (
    <AdminFilterSelect
      id={id}
      className="w-full"
      value={selected}
      onValueChange={onChange}
      items={[
        { label: 'Select batch year…', value: 'all' },
        ...years.map((year) => ({ label: String(year), value: String(year) })),
      ]}
    />
  );
}
