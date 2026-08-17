'use client';

import { useCallback, useState } from 'react';
import { validateField, validateFieldWithConfirm } from '@/lib/inputConstraints';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * Text input with shared constraints (e.g. board name must include a letter).
 */
export default function ValidatedTextInput({
  fieldId,
  value,
  onChange,
  onValidatedChange,
  context = {},
  className,
  confirmWarnings = true,
  placeholder,
  disabled = false,
  id,
}) {
  const [error, setError] = useState('');

  const runValidation = useCallback(
    (raw, { confirm = false } = {}) => {
      const v = raw ?? '';
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
        setError(r.error || 'Invalid value.');
        return false;
      }
      setError('');
      return true;
    },
    [fieldId, context, confirmWarnings],
  );

  return (
    <Field data-invalid={Boolean(error)}>
      <Input
        id={id}
        type="text"
        className={className}
        aria-invalid={Boolean(error)}
        value={value ?? ''}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value === '') {
            setError('');
            return;
          }
          runValidation(e.target.value, { confirm: false });
        }}
        onBlur={() => {
          if (runValidation(value, { confirm: confirmWarnings })) {
            onValidatedChange?.(value);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
