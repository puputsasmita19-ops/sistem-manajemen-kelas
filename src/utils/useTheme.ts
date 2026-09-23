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

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

let globalTheme: ThemeMode = getInitialTheme();
const listeners = new Set<(theme: ThemeMode) => void>();
let isInternalThemeUpdate = false;

function applyThemeToDOM(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';

    // Synchronize smartphone top address/status bar with dark theme
    const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
    metaThemes.forEach((m) => m.setAttribute('content', '#0f172a'));

    const appleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatus) appleStatus.setAttribute('content', 'black-translucent');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';

    // Synchronize smartphone top address/status bar with clean light theme
    const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
    metaThemes.forEach((m) => m.setAttribute('content', '#ffffff'));

    const appleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatus) appleStatus.setAttribute('content', 'default');
  }
}

// Initial application immediately on script load
applyThemeToDOM(globalTheme);

export function setGlobalTheme(newTheme: ThemeMode) {
  if (globalTheme === newTheme) return;
  globalTheme = newTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  } catch {
    // Ignore quota errors
  }
  isInternalThemeUpdate = true;
  applyThemeToDOM(newTheme);
  listeners.forEach((listener) => listener(newTheme));
  setTimeout(() => {
    isInternalThemeUpdate = false;
  }, 50);
}

// Set up MutationObserver only to sync if external scripts modify the class directly
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => {
    if (isInternalThemeUpdate) return;
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
