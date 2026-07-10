'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

/**
 * Light/dark theme toggle — uses `placementhub_theme` in localStorage (same as dashboard).
 */
export default function ThemeToggleButton({ className = 'btn btn-ghost btn-icon', size = 18, ...rest }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      title="Toggle theme"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      {...rest}
    >
      {theme === 'light' ? <Moon size={size} aria-hidden="true" /> : <Sun size={size} aria-hidden="true" />}
    </button>
  );
}
