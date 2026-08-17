'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * AdminCN Select for list/filter/sort chrome (BUG-004).
 * Matches admincn filters-datatable / user-table-toolbar — not native <select>.
 *
 * @param {object} props
 * @param {{ label: string, value: string }[]} props.items
 * @param {string} [props.value] current value; empty/`allValue` maps to the all sentinel
 * @param {(next: string) => void} props.onValueChange
 * @param {string} [props.allValue='all'] sentinel for “all / empty” filters
 * @param {boolean} [props.emptyMapsToAll=true] treat '' as allValue when controlling filters
 */
export default function AdminFilterSelect({
  id,
  items,
  value,
  onValueChange,
  allValue = 'all',
  emptyMapsToAll = true,
  className,
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const selectValue =
    emptyMapsToAll && (value == null || value === '')
      ? allValue
      : value != null
        ? String(value)
        : allValue;

  return (
    <Select
      items={items}
      value={selectValue}
      disabled={disabled}
      onValueChange={(next) => {
        if (next == null) return;
        onValueChange(emptyMapsToAll && next === allValue ? '' : next);
      }}
    >
      <SelectTrigger id={id} className={cn(className)} aria-label={ariaLabel} disabled={disabled}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="p-1">
        {items.map((item) => (
          <SelectItem key={item.value} value={String(item.value)}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
