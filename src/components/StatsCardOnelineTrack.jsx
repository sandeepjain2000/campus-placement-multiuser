'use client';

import { useEffect, useRef } from 'react';

/**
 * Horizontally scrollable row for stats-card--oneline listings.
 * Maps vertical mouse wheel to horizontal scroll when content overflows.
 */
export default function StatsCardOnelineTrack({ className = '', children, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={ref}
      className={['stats-card-oneline-track', className].filter(Boolean).join(' ')}
      tabIndex={0}
      role="region"
      aria-label="Listing details"
      {...props}
    >
      {children}
    </div>
  );
}
