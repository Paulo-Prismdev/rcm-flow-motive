import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Follows the device's light or dark setting until someone chooses one here.
    let savedTheme = null;
    try { savedTheme = localStorage.getItem('theme'); } catch { /* storage blocked */ }
    if (!savedTheme) {
      savedTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setIsDark(savedTheme === 'dark');
    applyTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    applyTheme(newTheme);
    try { localStorage.setItem('theme', newTheme); } catch { /* storage blocked */ }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center touch-manipulation text-current"
    >
      {isDark ? <Sun className="w-5 h-5 md:w-4 md:h-4" /> : <Moon className="w-5 h-5 md:w-4 md:h-4" />}
    </button>
  );
}