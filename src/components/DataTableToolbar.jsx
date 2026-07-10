'use client';

import { Search, X } from 'lucide-react';

/**
 * Shared search + filter + sort bar for data-table screens.
 */
export default function DataTableToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filter = '',
  onFilterChange,
  filterOptions = [],
  filterLabel = 'Filter',
  sort = '',
  onSortChange,
  sortOptions = [],
  sortLabel = 'Sort',
  filteredCount,
  totalCount,
  hasActiveFilters = false,
  onClear,
  children,
  style,
}) {
  const showCount =
    typeof filteredCount === 'number' && typeof totalCount === 'number';

  return (
    <div
      className={`card data-table-toolbar${hasActiveFilters ? ' is-filtered' : ''}`}
      style={{
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        border: '1px solid var(--border-default)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {onSearchChange ? (
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              className="form-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              aria-label="Search table"
            />
          </div>
        ) : null}

        {filterOptions.length > 0 && onFilterChange ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-sm text-secondary" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
              {filterLabel}:
            </span>
            <select
              className="form-select"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              style={{ width: 'auto', minWidth: 140, padding: '0.55rem 2rem 0.55rem 0.75rem', fontSize: '0.9rem' }}
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {sortOptions.length > 0 && onSortChange ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-sm text-secondary" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
              {sortLabel}:
            </span>
            <select
              className="form-select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              style={{ width: 'auto', minWidth: 160, padding: '0.55rem 2rem 0.55rem 0.75rem', fontSize: '0.9rem' }}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {children}

        {hasActiveFilters && onClear ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClear}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--danger-600)' }}
          >
            <X size={14} /> Clear
          </button>
        ) : null}

        {showCount ? (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {filteredCount} of {totalCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}
