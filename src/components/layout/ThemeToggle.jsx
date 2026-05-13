import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const theme = savedTheme || 'dark';
    setIsDark(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="glass-button w-10 h-10 flex items-center justify-center"
      style={{ color: 'var(--foreground)' }}
    >
      {isDark ? <Sun className="w-4 h-4" style={{ color: 'var(--foreground)' }} /> : <Moon className="w-4 h-4" style={{ color: 'var(--foreground)' }} />}
    </button>
  );
}