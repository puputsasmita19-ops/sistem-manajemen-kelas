import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../utils/useTheme';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      type="button"
      id="btn-theme-toggle"
      onClick={toggleTheme}
      whileTap={{ scale: 0.88 }}
      className={`relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 shadow-2xs flex items-center justify-center overflow-hidden cursor-pointer select-none ${className}`}
      title={isDark ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'}
      aria-label={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="dark-sun"
            initial={{ rotate: -75, scale: 0.45, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 75, scale: 0.45, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex items-center justify-center text-amber-400"
          >
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="light-moon"
            initial={{ rotate: 75, scale: 0.45, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -75, scale: 0.45, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
    </motion.button>
  );
};
