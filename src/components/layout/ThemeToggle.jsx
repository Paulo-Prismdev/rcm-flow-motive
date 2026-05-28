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
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setIsDark(savedTheme === 'dark');
    applyTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center touch-manipulation"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}