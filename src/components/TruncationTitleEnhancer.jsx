'use client';

import { useEffect } from 'react';

/** Elements that visually clip with ellipsis (Tailwind + legacy table cells). */
const SELECTOR = '.truncate, .cell-truncate, .line-clamp-1, .line-clamp-2, .line-clamp-3';

function isOverflowing(el) {
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}

function fullText(el) {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * When truncated text shows “…”, set native `title` so hover reveals the full string.
 * Runs across the app; skips nodes that already have a hand-authored title.
 */
export default function TruncationTitleEnhancer() {
  useEffect(() => {
    let frame = 0;

    const syncOne = (el) => {
      if (!(el instanceof HTMLElement)) return;
      if (!el.matches(SELECTOR)) return;

      const text = fullText(el);
      if (!text) {
        if (el.dataset.truncTitle === '1') {
          el.removeAttribute('title');
          delete el.dataset.truncTitle;
        }
        return;
      }

      const overflowing = isOverflowing(el);
      const owned = el.dataset.truncTitle === '1';
      const existing = el.getAttribute('title');

      if (overflowing) {
        if (!existing || owned) {
          if (existing !== text) el.setAttribute('title', text);
          el.dataset.truncTitle = '1';
        }
      } else if (owned) {
        el.removeAttribute('title');
        delete el.dataset.truncTitle;
      }
    };

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach(syncOne);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    };

    scan();

    const mo = new MutationObserver(schedule);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return null;
}
