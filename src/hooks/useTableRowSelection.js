'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Checkbox multi-select for data tables.
 * @param {{ getRowId?: (row: { id?: string }) => string }} [options]
 */
export function useTableRowSelection(options = {}) {
  const getRowId = options.getRowId || ((row) => String(row?.id ?? ''));

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const toggle = useCallback(
    (row) => {
      const id = getRowId(row);
      if (!id) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [getRowId],
  );

  const toggleAll = useCallback(
    (rows) => {
      const ids = (rows || []).map(getRowId).filter(Boolean);
      if (!ids.length) return;
      setSelectedIds((prev) => {
        const allOnPage = ids.every((id) => prev.has(id));
        if (allOnPage) {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        }
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    },
    [getRowId],
  );

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const isSelected = useCallback((row) => selectedIds.has(getRowId(row)), [getRowId, selectedIds]);

  const selectedRows = useCallback(
    (rows) => (rows || []).filter((row) => selectedIds.has(getRowId(row))),
    [getRowId, selectedIds],
  );

  const allSelected = useCallback(
    (rows) => {
      const ids = (rows || []).map(getRowId).filter(Boolean);
      return ids.length > 0 && ids.every((id) => selectedIds.has(id));
    },
    [getRowId, selectedIds],
  );

  const someSelected = useCallback(
    (rows) => {
      const ids = (rows || []).map(getRowId).filter(Boolean);
      return ids.some((id) => selectedIds.has(id)) && !allSelected(rows);
    },
    [allSelected, getRowId, selectedIds],
  );

  const count = selectedIds.size;

  return useMemo(
    () => ({
      selectedIds,
      toggle,
      toggleAll,
      clear,
      isSelected,
      selectedRows,
      allSelected,
      someSelected,
      count,
      setSelectedIds,
    }),
    [allSelected, clear, count, isSelected, selectedIds, selectedRows, someSelected, toggle, toggleAll],
  );
}

/**
 * Drop selections that are no longer visible after filter/search changes.
 */
const defaultGetRowId = (row) => String(row?.id ?? '');

export function usePruneRowSelection(selection, visibleRows, options = {}) {
  const getRowId = options.getRowId || defaultGetRowId;
  const { setSelectedIds } = selection;

  useEffect(() => {
    const visible = new Set((visibleRows || []).map(getRowId).filter(Boolean));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleRows, setSelectedIds, getRowId]);
}
