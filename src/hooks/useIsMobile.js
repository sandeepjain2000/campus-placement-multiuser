'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Initial check
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkMobile();

    // Event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}
