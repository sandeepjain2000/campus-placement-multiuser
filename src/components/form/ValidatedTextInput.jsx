'use client';

import { useCallback, useState } from 'react';
import { validateField, validateFieldWithConfirm } from '@/lib/inputConstraints';

/**
 * Text input with shared constraints (e.g. board name must include a letter).
 */
export default function ValidatedTextInput({
  fieldId,
  value,
  onChange,
  onValidatedChange,
  context = {},
  className = 'form-input',
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
    <div>
      <input
        id={id}
        type="text"
        className={`${className}${error ? ' input-error' : ''}`}
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
      {error ? (
        <p className="text-xs" style={{ color: 'var(--danger-600)', marginTop: '0.35rem' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
