'use client';

import { useLayoutEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

function getIsMobileSync() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export default function ResponsiveWrapper({ desktopView, mobileView }) {
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    setIsMobile(getIsMobileSync());
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile ? mobileView : desktopView;
}
