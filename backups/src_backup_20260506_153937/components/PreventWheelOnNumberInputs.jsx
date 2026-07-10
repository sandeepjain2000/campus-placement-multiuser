'use client';

import { useEffect } from 'react';

/**
 * Stops the mouse wheel from changing <input type="number"> while focused
 * (browser default increments/decrements and steals page scroll).
 */
export default function PreventWheelOnNumberInputs() {
  useEffect(() => {
    const onWheel = (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement && t.type === 'number' && document.activeElement === t) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', onWheel, { capture: true });
  }, []);
  return null;
}
