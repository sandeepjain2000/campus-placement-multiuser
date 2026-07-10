#!/usr/bin/env node
/**
 * Quick contrast audit for theme tokens (light + dark).
 * Run: node scripts/audit-theme-contrast.mjs
 *
 * Flags pairs below WCAG 2.1 AA (4.5:1 normal text, 3:1 large/UI).
 */
function luminance(hex) {
  const h = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(fg, bg) {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const light = {
  name: 'light',
  bg: '#ffffff',
  bgSecondary: '#f9fafb',
  pairs: [
    ['text-primary', '#111827'],
    ['text-secondary', '#374151'],
    ['text-tertiary', '#6b7280'],
    ['primary-700 on white (tabs)', '#52525b'],
    ['banner-btn ink', '#1e1b4b'],
  ],
};

const dark = {
  name: 'dark',
  bg: '#1e293b',
  bgSecondary: '#0f172a',
  pairs: [
    ['text-primary', '#f8fafc'],
    ['text-secondary', '#e2e8f0'],
    ['text-tertiary', '#94a3b8'],
    ['primary-300 (sidebar active)', '#a5b4fc'],
    ['banner-btn ink', '#0f172a'],
  ],
};

for (const theme of [light, dark]) {
  console.log(`\n=== ${theme.name} (on ${theme.bg}) ===`);
  for (const [label, fg] of theme.pairs) {
    const ratio = contrast(fg, theme.bg);
    const ok = ratio >= 4.5 ? 'OK' : 'LOW';
    console.log(`  ${ok} ${ratio.toFixed(2)}:1  ${label}`);
  }
}

console.log('\nTip: use var(--text-secondary) for labels, var(--text-tertiary) only for hints/icons.\n');
