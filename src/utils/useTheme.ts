import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'simak-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  
  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  
  return 'light';
}

let globalTheme: ThemeMode = getInitialTheme();
const listeners = new Set<(theme: ThemeMode) => void>();

function applyThemeToDOM(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#0f172a');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#1e3a8a');
  }
}

// Initial application immediately on script load
applyThemeToDOM(globalTheme);

export function setGlobalTheme(newTheme: ThemeMode) {
  globalTheme = newTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  } catch {
    // Ignore quota errors
  }
  applyThemeToDOM(newTheme);
  listeners.forEach((listener) => listener(newTheme));
}

// Set up MutationObserver to sync if external scripts modify the class directly
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => {
    const isDarkNow = document.documentElement.classList.contains('dark');
    const currentMode = isDarkNow ? 'dark' : 'light';
    if (currentMode !== globalTheme) {
      globalTheme = currentMode;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, currentMode);
      } catch {
        // Ignore quota errors
      }
      listeners.forEach((listener) => listener(currentMode));
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
}

export function useTheme() {
  const [theme, setLocalTheme] = useState<ThemeMode>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : globalTheme;
    }
    return globalTheme;
  });

  useEffect(() => {
    // Ensure initial local state matches actual DOM
    const isDarkNow = document.documentElement.classList.contains('dark');
    const actualTheme: ThemeMode = isDarkNow ? 'dark' : 'light';
    if (actualTheme !== theme) {
      setLocalTheme(actualTheme);
    }

    const handleChange = (t: ThemeMode) => {
      setLocalTheme(t);
    };

    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const next = isCurrentlyDark ? 'light' : 'dark';
    setGlobalTheme(next);
  };

  const setTheme = (t: ThemeMode) => {
    setGlobalTheme(t);
  };

  const isDark = theme === 'dark';

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  };
}
