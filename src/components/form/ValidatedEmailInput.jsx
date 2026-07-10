'use client';

import { useCallback, useState } from 'react';
import { validateEmail } from '@/lib/validators';

/**
 * Email input with inline format validation on change and blur.
 */
export default function ValidatedEmailInput({
  value,
  onChange,
  className = 'form-input',
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
    <div style={wrapperStyle}>
      <input
        type="email"
        className={`${className}${error ? ' input-error' : ''}`}
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
      {error ? (
        <p className="text-xs" style={{ color: 'var(--danger-600)', marginTop: '0.35rem' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
