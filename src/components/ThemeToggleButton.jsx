'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';

/**
 * Light/dark theme toggle — uses `placementhub_theme` in localStorage (same as dashboard).
 */
export default function ThemeToggleButton({ className, size: _size, ...rest }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggleTheme}
      title="Toggle theme"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      {...rest}
    >
      {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </Button>
  );
}
