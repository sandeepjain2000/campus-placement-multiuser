'use client';

import { useCallback, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { validateField, validateFieldWithConfirm, FIELD_IDS } from '@/lib/inputConstraints';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

/**
 * Number input with shared constraints (no negatives; zero policy per field).
 * @param {{
 *   fieldId: string,
 *   value: string | number,
 *   onChange: (value: string) => void,
 *   onValidatedChange?: (value: string) => void,
 *   context?: Record<string, unknown>,
 *   className?: string,
 *   confirmWarnings?: boolean,
 *   step?: string | number,
 *   stepperStep?: number,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   id?: string,
 *   min?: never,
 *   max?: never,
 * }} props — do not pass HTML min/max; use fieldId in inputConstraints.
 */
export default function ValidatedNumberInput({
  fieldId,
  value,
  onChange,
  onValidatedChange,
  context = {},
  className,
  confirmWarnings = true,
  step,
  stepperStep,
  placeholder,
  disabled = false,
  id,
  prefix,
}) {
  const [error, setError] = useState('');

  const runValidation = useCallback(
    (raw, { confirm = false } = {}) => {
      const v = raw === '' || raw == null ? '' : String(raw);
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

  const handleChange = (e) => {
    const v = e.target.value;
    if (v !== '' && v !== '-' && Number.isFinite(Number(v)) && Number(v) < 0) {
      setError('Value cannot be negative.');
      return;
    }
    onChange(v);
    if (v === '' || v === '-') {
      setError('');
      return;
    }
    runValidation(v, { confirm: false });
  };

  const handleBlur = () => {
    const v = value === '' || value == null ? '' : String(value);
    if (v === '') {
      setError('');
      return;
    }
    if (runValidation(v, { confirm: confirmWarnings })) {
      onValidatedChange?.(v);
    }
  };

  const adjustByStepper = (direction) => {
    if (disabled || stepperStep == null || !Number.isFinite(Number(stepperStep))) return;
    const delta = Number(stepperStep) * direction;
    const raw = value === '' || value == null ? '' : String(value);
    const current = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(current)) return;
    const next = Math.max(0, Math.floor(current + delta));
    const nextValue = next === 0 && raw === '' ? '' : String(next);
    onChange(nextValue);
    if (nextValue === '') {
      setError('');
      return;
    }
    runValidation(nextValue, { confirm: false });
  };

  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled || undefined}>
      {stepperStep != null || prefix ? (
        <InputGroup data-disabled={disabled || undefined}>
          {prefix ? <InputGroupAddon aria-hidden="true">{prefix}</InputGroupAddon> : null}
          <InputGroupInput
            id={id}
            type="number"
            className={className}
            aria-invalid={Boolean(error)}
            value={value === '' || value == null ? '' : value}
            onChange={handleChange}
            onBlur={handleBlur}
            step={step ?? (stepperStep != null ? stepperStep : undefined)}
            placeholder={placeholder}
            disabled={disabled}
          />
          {stepperStep != null ? <InputGroupAddon align="inline-end" aria-label="Adjust value">
            <InputGroupButton
              size="icon-xs"
              disabled={disabled}
              aria-label="Decrease by one"
              onClick={() => adjustByStepper(-1)}
            >
              <Minus aria-hidden />
            </InputGroupButton>
            <InputGroupButton
              size="icon-xs"
              disabled={disabled}
              aria-label="Increase by one"
              onClick={() => adjustByStepper(1)}
            >
              <Plus aria-hidden />
            </InputGroupButton>
          </InputGroupAddon> : null}
        </InputGroup>
      ) : (
        <Input
          id={id}
          type="number"
          className={className}
          aria-invalid={Boolean(error)}
          value={value === '' || value == null ? '' : value}
          onChange={handleChange}
          onBlur={handleBlur}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export { FIELD_IDS };
