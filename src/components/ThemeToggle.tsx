import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../utils/useTheme';

export const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      id="btn-theme-toggle"
      onClick={toggleTheme}
      className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs flex items-center justify-center relative group cursor-pointer"
      title={isDark ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 transition-transform group-hover:rotate-45 duration-200" />
      ) : (
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 transition-transform group-hover:-rotate-12 duration-200" />
      )}
      <span className="sr-only">{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
    </button>
  );
};
