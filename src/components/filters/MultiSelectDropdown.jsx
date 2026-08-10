'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * @param {{
 *   label: string;
 *   options: { value: string; label?: string }[];
 *   selected: string[];
 *   onChange: (values: string[]) => void;
 *   emptyLabel?: string;
 *   minWidth?: number | string;
 * }} props
 */
export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  emptyLabel,
  minWidth = 180,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const allLabel = emptyLabel || `All ${label}`;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const triggerLabel = (() => {
    if (!selected.length) return allLabel;
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt?.label || selected[0];
    }
    return `${selected.length} selected`;
  })();

  const isActive = selected.length > 0;

  return (
    <div
      ref={rootRef}
      className="relative"
      style={{ minWidth }}
    >
      <Button
        type="button"
        variant="outline"
        className={cn('w-full justify-between', isActive && 'border-primary/40 bg-primary/5')}
        style={{
          minWidth,
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-pressed={isActive}
        data-filter-active={isActive ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </Button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute inset-x-0 top-[calc(100%+4px)] z-50 max-h-[min(280px,50vh)] min-w-[max(100%,220px)] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          style={{
            minWidth: 'max(100%, 220px)',
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            onClick={() => onChange([])}
            className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted', selected.length === 0 && 'bg-muted font-medium')}
          >
            <span
              className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded border', selected.length === 0 && 'border-primary bg-primary text-primary-foreground')}
            >
              {selected.length === 0 && <Check className="size-3" strokeWidth={3} />}
            </span>
            {allLabel}
          </button>

          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(opt.value)}
                className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted', checked && 'bg-primary/5')}
              >
                <span
                  className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded border', checked && 'border-primary bg-primary text-primary-foreground')}
                >
                  {checked && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="text-left">{opt.label || opt.value}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
