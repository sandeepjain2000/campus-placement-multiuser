'use client';

import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { formatIndianAmountInWords } from '@/lib/amountInWords';

/**
 * INR amount field with non-overlapping ₹ prefix and amount-in-words helper.
 */
export default function CurrencyAmountInput({
  fieldId,
  value,
  onChange,
  context,
  className = 'form-input',
  placeholder,
  disabled = false,
  id,
  step,
  confirmWarnings,
  onValidatedChange,
  showSymbol = true,
  wordsSuffix = 'Rupees',
  hideWords = false,
}) {
  const words = hideWords ? '' : formatIndianAmountInWords(value, { suffix: wordsSuffix });

  return (
    <div className="currency-amount-input">
      <div className={showSymbol ? 'currency-amount-input__row' : undefined}>
        {showSymbol ? (
          <span className="currency-amount-input__prefix" aria-hidden="true">
            ₹
          </span>
        ) : null}
        <div className="currency-amount-input__control">
          <ValidatedNumberInput
            fieldId={fieldId}
            value={value}
            onChange={onChange}
            onValidatedChange={onValidatedChange}
            context={context}
            className={className}
            placeholder={placeholder}
            disabled={disabled}
            id={id}
            step={step}
            confirmWarnings={confirmWarnings}
          />
        </div>
      </div>
      {words ? (
        <p className="currency-amount-input__words" aria-live="polite">
          {words}
        </p>
      ) : null}
    </div>
  );
}
