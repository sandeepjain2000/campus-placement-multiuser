'use client';

import { useCallback, useState } from 'react';
import { validateField, validateFieldWithConfirm } from '@/lib/inputConstraints';
import SegmentedDateInput from '@/components/form/SegmentedDateInput';

/**
 * Date input with shared constraints (DD / MM / YYYY segments) and optional calendar picker.
 */
export default function ValidatedDateInput({
  fieldId,
  value,
  onChange,
  onValidatedChange,
  context = {},
  className = 'form-input',
  confirmWarnings = true,
  disabled = false,
  id,
  min,
  max,
  showPicker = true,
  'aria-label': ariaLabel,
}) {
  const [error, setError] = useState('');

  const runValidation = useCallback(
    (raw, { confirm = false } = {}) => {
      const v = raw || '';
      if (confirm && confirmWarnings) {
        const r = validateFieldWithConfirm(fieldId, v, context);
        if (!r.proceed) {
          setError(r.error || '');
          return false;
        }
        setError('');
        return true;
      }
      const r = validateField(fieldId, v, context);
      if (!r.ok) {
        setError(r.error || 'Invalid date.');
        return false;
      }
      setError('');
      return true;
    },
    [fieldId, context, confirmWarnings],
  );

  const handleChange = (next) => {
    onChange(next);
    if (!next) {
      setError('');
      return;
    }
    runValidation(next, { confirm: false });
  };

  const handleBlur = () => {
    const v = value || '';
    if (!v) {
      setError('');
      return;
    }
    if (runValidation(v, { confirm: confirmWarnings })) {
      onValidatedChange?.(v);
    }
  };

  return (
    <div>
      <SegmentedDateInput
        id={id}
        value={value || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`${className}${error ? ' input-error' : ''}`}
        disabled={disabled}
        min={min}
        max={max}
        showPicker={showPicker}
        aria-label={ariaLabel}
      />
      {error ? (
        <p className="text-xs" style={{ color: 'var(--danger-600)', marginTop: '0.35rem' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
