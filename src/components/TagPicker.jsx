'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Tag input: type and press Enter or comma to add; Backspace on empty removes last tag.
 * @param {{ tags: string[], onChange: (tags: string[]) => void, placeholder?: string, disabled?: boolean, className?: string }} props
 */
export default function TagPicker({ tags, onChange, placeholder = 'Type and press Enter…', disabled = false, className = '' }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const addTag = (val) => {
    if (disabled) return;
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag) => {
    if (disabled) return;
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div
      className={className}
      onClick={() => !disabled && inputRef.current?.focus()}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
        alignItems: 'center',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
        minHeight: '2.5rem',
        cursor: disabled ? 'default' : 'text',
        background: 'var(--bg-primary)',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'var(--primary-50)',
            color: 'var(--primary-700)',
            border: '1px solid var(--primary-200)',
            borderRadius: '6px',
            padding: '0.15rem 0.4rem 0.15rem 0.6rem',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--primary-500)',
                display: 'flex',
                lineHeight: 1,
              }}
            >
              <X size={11} />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        disabled={disabled}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!disabled && input.trim()) addTag(input);
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          minWidth: 120,
          flex: 1,
        }}
      />
    </div>
  );
}
