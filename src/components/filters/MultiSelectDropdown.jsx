'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
      className={`filter-multiselect${isActive ? ' filter-multiselect--active' : ''}`}
      style={{ position: 'relative', minWidth }}
    >
      <button
        type="button"
        className={`form-select filter-multiselect__trigger${isActive ? ' is-filter-active' : ''}`}
        style={{
          width: '100%',
          minWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          textAlign: 'left',
          cursor: 'pointer',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-pressed={isActive}
        data-filter-active={isActive ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="filter-multiselect__label"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            color: isActive ? 'var(--primary-600)' : 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease-out, color 0.15s ease-out',
          }}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="card"
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: 'max(100%, 220px)',
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '0.35rem',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,0.12))',
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            onClick={() => onChange([])}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.65rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: selected.length === 0 ? 'var(--bg-secondary)' : 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selected.length === 0 ? 600 : 400,
              color: 'var(--text-primary)',
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: '1.5px solid var(--border-strong)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: selected.length === 0 ? 'var(--primary-600)' : 'var(--bg-primary)',
                borderColor: selected.length === 0 ? 'var(--primary-600)' : 'var(--border-strong)',
                flexShrink: 0,
              }}
            >
              {selected.length === 0 && <Check size={11} color="#fff" strokeWidth={3} />}
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
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.65rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: checked ? 'var(--primary-50)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: '1.5px solid var(--border-strong)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: checked ? 'var(--primary-600)' : 'var(--bg-primary)',
                    borderColor: checked ? 'var(--primary-600)' : 'var(--border-strong)',
                    flexShrink: 0,
                  }}
                >
                  {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                </span>
                <span style={{ textAlign: 'left' }}>{opt.label || opt.value}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
