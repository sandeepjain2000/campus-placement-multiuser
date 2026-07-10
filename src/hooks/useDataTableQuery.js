'use client';

import { useMemo, useState } from 'react';
import { rowMatchesSearch, sortRows } from '@/lib/dataTableQuery';

/**
 * @template T
 * @param {T[]} items
 * @param {{
 *   getSearchText?: (row: T) => string;
 *   filterFn?: (row: T, filter: string) => boolean;
 *   defaultFilter?: string;
 *   sortOptions?: Array<{ value: string; label: string; compare: (a: T, b: T) => number }>;
 *   defaultSort?: string;
 * }} [options]
 */
export function useDataTableQuery(items, options = {}) {
  const {
    getSearchText = (row) =>
      Object.values(row || {})
        .filter((v) => v != null && typeof v !== 'object')
        .join(' '),
    filterFn,
    defaultFilter = '',
    sortOptions = [],
    defaultSort = sortOptions[0]?.value || 'name_asc',
  } = options;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(defaultFilter);
  const [sort, setSort] = useState(defaultSort);

  const comparators = useMemo(
    () =>
      Object.fromEntries([
        ...sortOptions.map((o) => [o.value, o.compare]),
        ['default', sortOptions[0]?.compare],
      ]),
    [sortOptions],
  );

  const filtered = useMemo(() => {
    let list = Array.isArray(items) ? items : [];
    if (filter && filterFn) {
      list = list.filter((row) => filterFn(row, filter));
    }
    if (String(search).trim()) {
      list = list.filter((row) => rowMatchesSearch(row, getSearchText, search));
    }
    return sortRows(list, sort, comparators);
  }, [items, search, filter, sort, filterFn, getSearchText, comparators]);

  const hasActiveFilters = Boolean(String(search).trim() || (filter && filterFn));

  const clearFilters = () => {
    setSearch('');
    setFilter(defaultFilter);
    setSort(defaultSort);
  };

  return {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered,
    totalCount: Array.isArray(items) ? items.length : 0,
    filteredCount: filtered.length,
    hasActiveFilters,
    clearFilters,
  };
}
