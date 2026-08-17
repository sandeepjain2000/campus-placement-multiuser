'use client';

import { useCallback, useState } from 'react';
import { validateEmail } from '@/lib/validators';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * Email input with inline format validation on change and blur.
 */
export default function ValidatedEmailInput({
  value,
  onChange,
  className,
  placeholder = 'email@example.com',
  style,
  wrapperStyle,
  required = false,
  errorMessage = 'Enter a valid email address (e.g. name@example.com).',
  disabled = false,
}) {
  const [error, setError] = useState('');

  const runValidation = useCallback(
    (raw) => {
      const v = String(raw ?? '').trim();
      if (!v) {
        if (required) {
          setError('Email is required.');
          return false;
        }
        setError('');
        return true;
      }
      if (!validateEmail(v)) {
        setError(errorMessage);
        return false;
      }
      setError('');
      return true;
    },
    [required, errorMessage],
  );

  return (
    <Field data-invalid={Boolean(error)} style={wrapperStyle}>
      <Input
        type="email"
        className={className}
        aria-invalid={Boolean(error)}
        style={style}
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          runValidation(e.target.value);
        }}
        onBlur={() => runValidation(value)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
