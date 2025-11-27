import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User, Briefcase, Sun, Moon, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusConfigProvider } from '../shared/StatusConfigContext';

export default function ReferrerLayout({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: referrer } = useQuery({
    queryKey: ['referrer', currentUser?.linked_referrer_id],
    queryFn: () => base44.entities.Referrer.get(currentUser.linked_referrer_id),
    enabled: !!currentUser?.linked_referrer_id,
  });

  return (
    <StatusConfigProvider>
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --background: #f8f9fa;
          --surface: #ffffff;
          --surface-elevated: #ffffff;
          --surface-hover: #f1f3f5;
          --foreground: #1a1a1a;
          --foreground-muted: #6c757d;
          --foreground-subtle: #adb5bd;
          --accent: #D4AF37;
          --accent-hover: #C19B2B;
          --accent-foreground: #000000;
          --border: #dee2e6;
          --border-strong: #ced4da;
          --glass-bg: rgba(255, 255, 255, 0.85);
          --glass-border: rgba(0, 0, 0, 0.08);
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08);
          --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        [data-theme="dark"] {
          --background: #0f172a;
          --surface: #1e293b;
          --surface-elevated: #334155;
          --surface-hover: #475569;
          --foreground: #f1f5f9;
          --foreground-muted: #cbd5e1;
          --foreground-subtle: #64748b;
          --accent: #fbbf24;
          --accent-hover: #f59e0b;
          --accent-foreground: #000000;
          --border: #334155;
          --border-strong: #475569;
          --glass-bg: rgba(30, 41, 59, 0.85);
          --glass-border: rgba(255, 255, 255, 0.08);
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: var(--background);
          color: var(--foreground);
        }

        .neomorph {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
        }

        .neomorph-flat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
        }

        .neomorph-inset {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .glass-button {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .glass-button:hover {
          background: var(--surface-hover);
          box-shadow: var(--shadow-md);
        }

        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
        }

        .mobile-menu {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 80%;
          max-width: 320px;
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          border-right: 1px solid var(--border-strong);
          box-shadow: var(--shadow-lg);
          z-index: 50;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .mobile-menu.open {
          transform: translateX(0);
        }
      `}</style>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div 
            className="mobile-menu-overlay md:hidden" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className={`mobile-menu md:hidden ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-lg">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="glass-button w-10 h-10 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card */}
            {currentUser && (
              <div className="p-4 border-b border-border">
                <div className="neomorph-flat p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-base font-bold text-accent-foreground">
                        {currentUser.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{currentUser.full_name || 'User'}</p>
                      <p className="text-xs text-foreground-muted truncate">{currentUser.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Theme Toggle */}
            <div className="p-4 border-b border-border">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl glass-button"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>

            {/* Logout Button */}
            <div className="p-4 mt-auto border-t border-border">
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass-button text-red-500 font-medium"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="neomorph mb-2 mx-2 md:mx-3 mt-2 md:mt-3 p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Burger (mobile) + Logo */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            {/* Mobile Burger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="glass-button w-10 h-10 flex items-center justify-center flex-shrink-0 md:hidden"
              style={{ color: 'var(--foreground)' }}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Logo */}
            <div className="flex items-baseline gap-2">
              <span style={{ fontFamily: "'Palatino Linotype', serif", fontSize: '1.25rem' }} className="md:text-2xl">
                <span style={{ color: 'var(--accent)' }}>A</span>
                <span>RTEC</span>
                <span style={{ color: 'var(--accent)' }}>H</span>
              </span>
              <span style={{ fontWeight: 300 }} className="text-xl md:text-2xl">One</span>
            </div>
            <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-accent/20 text-accent font-medium">
              Referrer Portal
            </span>
          </div>
          
          {/* Center: Referrer Logo */}
          {referrer?.logo_url && (
            <img 
              src={referrer.logo_url} 
              alt={referrer.name} 
              className="h-8 md:h-12 max-w-[120px] md:max-w-[200px] object-contain"
            />
          )}

          {/* Right: Desktop controls */}
          <div className="hidden md:flex items-center gap-3">
            {referrer && (
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <Briefcase className="w-4 h-4" />
                {referrer.name}
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="glass-button w-10 h-10 flex items-center justify-center"
              style={{ color: 'var(--foreground)' }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="glass-button w-10 h-10 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="neomorph-flat w-56">
                <div className="p-3 border-b border-border">
                  <p className="font-medium">{currentUser?.full_name}</p>
                  <p className="text-xs text-foreground-muted">{currentUser?.email}</p>
                </div>
                <DropdownMenuItem 
                  onClick={() => base44.auth.logout()}
                  className="cursor-pointer text-red-500"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-2 md:px-3 pb-3 md:pb-4 flex-1 overflow-y-auto min-h-0">
        <div className="max-w-full mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
    </StatusConfigProvider>
  );
}