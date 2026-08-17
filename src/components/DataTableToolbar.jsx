'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Shared search + filter + sort bar for AdminCN table/list screens.
 * Selects: AdminCN `@/components/ui/select` (filters-datatable / user-table-toolbar) — not native <select>.
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
  className,
  style,
}) {
  const showCount = typeof filteredCount === 'number' && typeof totalCount === 'number';
  const filterItems = filterOptions.map((opt) => ({
    label: opt.label,
    value: String(opt.value),
  }));
  const sortItems = sortOptions.map((opt) => ({
    label: opt.label,
    value: String(opt.value),
  }));

  return (
    <div
      className={cn(
        'bg-card text-card-foreground ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 text-sm shadow-xs ring-1',
        hasActiveFilters && 'ring-primary/25',
        className
      )}
      style={style}
    >
      {/* AdminCN toolbars use gap-4 between controls (user-table-toolbar); gap-2 label→select */}
      <div className="flex flex-wrap items-center gap-4">
        {onSearchChange ? (
          <div className="relative min-w-[200px] flex-1 basis-[220px]">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search table"
            />
          </div>
        ) : null}

        {filterItems.length > 0 && onFilterChange ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{filterLabel}:</span>
            <Select
              items={filterItems}
              value={filter ? String(filter) : filterItems[0]?.value}
              onValueChange={(value) => {
                if (value != null) onFilterChange(value);
              }}
            >
              <SelectTrigger className="min-w-[140px]" aria-label={filterLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-1">
                {filterItems.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {sortItems.length > 0 && onSortChange ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{sortLabel}:</span>
            <Select
              items={sortItems}
              value={sort ? String(sort) : sortItems[0]?.value}
              onValueChange={(value) => {
                if (value != null) onSortChange(value);
              }}
            >
              <SelectTrigger className="min-w-[160px]" aria-label={sortLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-1">
                {sortItems.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {children}

        {hasActiveFilters && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-destructive shrink-0 hover:text-destructive"
          >
            <X data-icon="inline-start" />
            Clear
          </Button>
        ) : null}

        {showCount ? (
          <span className="text-muted-foreground ms-auto shrink-0 text-sm font-semibold whitespace-nowrap">
            {filteredCount} of {totalCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}
