'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { getDashboardNavItemKey } from '@/config/dashboardMenu';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (res.status === 401) {
    return { active: false, color: '#FF0000', itemKeys: [] };
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load menu highlight');
  return json;
};

const HIGHLIGHT_ROLES = new Set(['college_admin', 'employer', 'student']);

/**
 * Shared via SWR cache key — safe to call from layout, hub, and mobile menu.
 */
export function useMenuHighlight() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const enabled = status === 'authenticated' && HIGHLIGHT_ROLES.has(role);

  const { data } = useSWR(enabled ? '/api/menu-highlight' : null, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return useMemo(() => {
    const active = Boolean(data?.active);
    const color = data?.color || '#FF0000';
    const itemKeys = Array.isArray(data?.itemKeys) ? data.itemKeys : [];
    return {
      active,
      color,
      itemKeys,
      getItemStyle: (item) => {
        if (!active || !itemKeys.length) return undefined;
        const key = getDashboardNavItemKey(item);
        if (!itemKeys.includes(key)) return undefined;
        return { color };
      },
    };
  }, [data]);
}

/** @deprecated No longer required — useMenuHighlight uses SWR directly. */
export function MenuHighlightProvider({ children }) {
  return children;
}
