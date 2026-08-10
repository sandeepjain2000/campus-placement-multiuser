'use client';

import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { formatIndianAmountInWords } from '@/lib/amountInWords';
import { FieldDescription } from '@/components/ui/field';

/**
 * INR amount field with non-overlapping ₹ prefix and amount-in-words helper.
 */
export default function CurrencyAmountInput({
  fieldId,
  value,
  onChange,
  context,
  className,
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
    <div className="flex flex-col gap-2">
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
        prefix={showSymbol ? '₹' : undefined}
        confirmWarnings={confirmWarnings}
      />
      {words ? (
        <FieldDescription aria-live="polite">
          {words}
        </FieldDescription>
      ) : null}
    </div>
  );
}
