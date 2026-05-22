import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark, mounted]);

  const toggle = () => {
    setDark(d => {
      const next = !d;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Always expose dark=false until mounted so SSR and client first-render match
  return (
    <ThemeContext.Provider value={{ dark: mounted ? dark : false, mounted, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// Drop-in toggle button — renders nothing on server, correct emoji after mount
export function ThemeToggleButton({ style, className }) {
  const { dark, mounted, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title="Toggle theme"
      suppressHydrationWarning
      className={className}
      style={style}
    >
      {mounted ? (dark ? '☀️' : '🌙') : '🌙'}
    </button>
  );
}
