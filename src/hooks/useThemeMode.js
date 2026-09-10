import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vitra_theme_mode';

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
}

export default function useThemeMode() {
  const [themeMode, setThemeMode] = useState(readStoredTheme);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    document.documentElement.dataset.theme = themeMode;
    document.documentElement.classList.toggle('theme-dark', themeMode === 'dark');
    document.documentElement.classList.toggle('theme-light', themeMode === 'light');
    window.localStorage.setItem(STORAGE_KEY, themeMode);
    window.dispatchEvent(new CustomEvent('vitra-themechange', { detail: themeMode }));

    return undefined;
  }, [themeMode]);

  useEffect(() => {
    const syncTheme = () => setThemeMode(readStoredTheme());

    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        syncTheme();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('vitra-themechange', syncTheme);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('vitra-themechange', syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    setThemeMode((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return {
    themeMode,
    setThemeMode,
    toggleTheme,
    isDark: themeMode === 'dark',
  };
}