import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User, Building2, Sun, Moon, Menu, X, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusConfigProvider } from '@/components/shared/StatusConfigContext';
import RepairerNotifications from '@/components/repairer/RepairerNotifications';
import PortalProfileModal from '@/components/shared/PortalProfileModal';

import { signOut } from '@/lib/signOut';
export default function RepairerLayout({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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

  const { data: bodyshop } = useQuery({
    queryKey: ['bodyshop', currentUser?.linked_bodyshop_id],
    queryFn: () => base44.entities.Bodyshop.get(currentUser.linked_bodyshop_id),
    enabled: !!currentUser?.linked_bodyshop_id,
  });

  const { data: appConfigs = [] } = useQuery({
    queryKey: ['appConfigs'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const companyLogo = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

  return (
    <StatusConfigProvider>
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* The portal's own style names, taken from the app's shared colours so the
           portal follows light and dark like everything else. It no longer overwrites
           the app's core colours (background, text, border, accent), which made every
           shared card, border and button lose its colour while the portal was open. */
        :root {
          --surface: hsl(var(--card));
          --surface-elevated: hsl(var(--popover));
          --surface-hover: hsl(var(--fm-surface-hover));
          --foreground-muted: hsl(var(--muted-foreground));
          --foreground-subtle: hsl(var(--fm-ink-subtle));
          --border-strong: hsl(var(--input));
          --portal-accent: hsl(var(--fm-brand-green));
          --portal-accent-fg: #ffffff;
          --accent-hover: hsl(var(--fm-brand-green) / 0.85);
          --glass-bg: hsl(var(--card) / 0.85);
          --glass-border: hsl(var(--border));
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08);
          --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        [data-theme="dark"] {
          --portal-accent-fg: #04120b;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }

        .header-glass {
          background: #151d44;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          box-shadow: var(--shadow-lg);
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
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
        }

        .neomorph-inset {
          background: var(--surface);
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .glass-button {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
          cursor: pointer;
          color: rgba(255,255,255,0.9) !important;
        }

        .glass-button:hover {
          background: rgba(255,255,255,0.16);
          border-color: rgba(255,255,255,0.25);
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
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-base font-bold text-primary-foreground">
                        {currentUser.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{currentUser.full_name || 'User'}</p>
                      <p className="text-xs text-foreground-muted truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(true); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg glass-button text-sm font-medium"
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </button>
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
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass-button text-danger-fg font-medium"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="header-glass mx-2 md:mx-3 mt-2 md:mt-3 px-3 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Burger (mobile) + Logo */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Mobile Burger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="glass-button w-10 h-10 flex items-center justify-center flex-shrink-0 md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Company Logo + App Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-auto flex-shrink-0">
                      <img 
                        src={companyLogo} 
                        alt="RCM Automotive" 
                        className="h-full w-auto object-contain"
                      />
                    </div>
              <div className="flex items-baseline gap-1">
                <span style={{ fontFamily: "'Palatino Linotype', serif", fontSize: '1.1rem' }} className="md:text-xl">
                  <span style={{ color: 'var(--portal-accent)' }}>R</span>
                  <span>CM</span>
                  <span style={{ color: 'var(--portal-accent)' }}>A</span>
                </span>
                <span style={{ fontWeight: 300 }} className="text-lg md:text-xl">utomotive</span>
              </div>
            </div>

          </div>
          
          {/* Right: Bodyshop Name */}
          {bodyshop && (
            <div className="hidden lg:flex items-center gap-1.5 text-sm text-foreground-subtle">
              <Building2 className="w-4 h-4" />
              <span>{bodyshop.name}</span>
            </div>
          )}

          {/* Right: Desktop controls */}
          <div className="hidden md:flex items-center gap-2">
            <RepairerNotifications />

            <button
              onClick={toggleTheme}
              className="glass-button w-10 h-10 flex items-center justify-center"
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
                  onClick={() => setProfileOpen(true)}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer text-danger-fg"
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
      <main className="px-2 md:px-3 pt-2 pb-2 md:pb-3 flex-1 overflow-y-auto min-h-0">
        <div className="max-w-full mx-auto h-full">
          {children}
        </div>
      </main>
      </div>
      <PortalProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </StatusConfigProvider>
  );
}