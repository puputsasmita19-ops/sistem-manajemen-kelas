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
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function applyThemeToDOM(theme: ThemeMode, withTransition: boolean = false) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Trigger smooth transition class temporarily for 280ms on toggle
  if (withTransition) {
    root.classList.add('theme-transitioning');
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 280);
  }

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

// Initial application immediately on script load (without transition)
applyThemeToDOM(globalTheme, false);

export function setGlobalTheme(newTheme: ThemeMode) {
  globalTheme = newTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  } catch {
    // Ignore quota errors
  }
  applyThemeToDOM(newTheme, true);
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
