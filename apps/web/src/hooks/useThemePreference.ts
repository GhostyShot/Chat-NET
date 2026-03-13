import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useThemePreference(): [Theme, React.Dispatch<React.SetStateAction<Theme>>] {
  const [theme, setTheme] = useState<Theme>(() => {
    // 1. Explicit user preference
    const stored = localStorage.getItem('chatnet-theme') as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    // 2. System preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chatnet-theme', theme);
  }, [theme]);

  // Listen for system changes (only if user hasn't set explicit preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('chatnet-theme');
      if (!stored) setTheme(e.matches ? 'light' : 'dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setThemeWithPersist: React.Dispatch<React.SetStateAction<Theme>> = (value) => {
    setTheme(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('chatnet-theme', next); // explicit override
      return next;
    });
  };

  return [theme, setThemeWithPersist];
}
