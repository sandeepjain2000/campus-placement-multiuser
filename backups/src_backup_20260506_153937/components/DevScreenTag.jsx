'use client';

import { usePathname } from 'next/navigation';
import { getDevScreenId } from '@/config/devScreenIds';

function showDevScreenTag(pathname) {
  if (process.env.NEXT_PUBLIC_SHOW_DEV_SCREEN_IDS === 'false') return false;
  if (process.env.NEXT_PUBLIC_SHOW_DEV_SCREEN_IDS === 'true') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  const p = pathname || '';
  return p.startsWith('/dashboard') || p.startsWith('/data-entry');
}

export default function DevScreenTag() {
  const pathname = usePathname();
  const id = getDevScreenId(pathname);
  if (!showDevScreenTag(pathname) || !id) return null;
  return (
    <span
      className="dev-screen-id-tag"
      title={`Dev reference: ${id} — ${pathname}`}
      aria-label={`Development screen id ${id}`}
    >
      {id}
    </span>
  );
}
