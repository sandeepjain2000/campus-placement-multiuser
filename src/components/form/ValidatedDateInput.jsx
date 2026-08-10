'use client';

import { useCallback, useState } from 'react';
import { validateField, validateFieldWithConfirm } from '@/lib/inputConstraints';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Date field — AdminCN Input type="date".
 * Do not paint a left calendar icon: the native date control already provides
 * the picker affordance (left icon overlaps the value in Chromium).
 */
export default function ValidatedDateInput({
  fieldId,
  value,
  onChange,
  onValidatedChange,
  context = {},
  className,
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

  const handleChange = (e) => {
    const next = e.target.value || '';
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
    <Field data-invalid={Boolean(error)} data-disabled={disabled || undefined}>
      <Input
        id={id}
        type="date"
        value={value || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        disabled={disabled}
        min={min}
        max={max}
        // showPicker kept for API compat; native date UI owns the calendar control
        data-show-picker={showPicker ? 'true' : 'false'}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
