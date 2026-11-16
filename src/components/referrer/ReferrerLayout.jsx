import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Menu, X, Search, RefreshCw, FileText, LayoutDashboard, User } from 'lucide-react';
import { StatusConfigProvider } from '../shared/StatusConfigContext';
import GlobalSearch from '../layout/GlobalSearch';
import Notifications from '../layout/Notifications';
import ThemeToggle from '../layout/ThemeToggle';
import PortalProfileModal from '../shared/PortalProfileModal';

import { signOut } from '@/lib/signOut';
export default function ReferrerLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);

  React.useEffect(() => {
    const handleNav = (e) => {
      if (e.detail === 'claims') setActiveTab('claims');
      if (e.detail === 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('referrer-nav', handleNav);
    return () => window.removeEventListener('referrer-nav', handleNav);
  }, []);

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
    <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} portalPage="ReferrerPortal" />
    <div className="flex overflow-hidden app-height">
      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[9999] flex flex-col
        w-56 fm-glass-chrome text-white
        transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex-shrink-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <img src="/rcm-logo.png" alt="RCM" className="h-8 w-auto object-contain" />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('referrer-nav', { detail: 'dashboard' }));
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span>Dashboard</span>
          </a>
          <a
            href="#claims"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('referrer-nav', { detail: 'claims' }));
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'claims'
                ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]'
                : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>Claims</span>
          </a>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {(currentUser?.display_name || currentUser?.full_name)?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser?.display_name || currentUser?.full_name || 'User'}</p>
              <p className="text-xs text-white/40 truncate">{currentUser?.email || ''}</p>
            </div>
            <button
              onClick={() => setProfileOpen(true)}
              title="My profile" aria-label="My profile"
              className="text-white/40 hover:text-white transition-colors flex-shrink-0">
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={() => signOut()}
              title="Sign out" aria-label="Sign out"
              className="text-white/40 hover:text-red-400 transition-colors flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen &&
        <div data-overlay-dismiss
          className="fixed inset-0 z-[9998] fm-scrim lg:hidden"
          onClick={() => setMobileMenuOpen(false)} />
      }

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR */}
        <header className="hidden lg:flex flex-shrink-0 fm-glass-bar items-center gap-3 px-5 relative z-30" style={{ height: '48px', minHeight: '48px' }}>
          {/* Left: Referrer Name + Portal Label */}
          <div className="flex items-center gap-2">
            {referrer && (
              <>
                <span className="text-sm font-medium text-muted-foreground">
                  {referrer.name}
                </span>
                <span className="text-sm font-medium text-success-fg">
                  Referrer Portal
                </span>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Search">
              <Search className="w-4 h-4" />
            </button>
            <div className="p-1.5 rounded-lg">
              <ThemeToggle />
            </div>
            <div className="p-1.5 rounded-lg">
              <Notifications />
            </div>
          </div>
        </header>

        {/* Mobile bottom tab bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-2 safe-area-inset-bottom" style={{ height: '60px', zIndex: 1000 }}>
          <button onClick={() => setMobileMenuOpen((prev) => !prev)} className={`flex flex-col items-center justify-center gap-0.5 p-3 touch-manipulation min-w-[44px] min-h-[44px] ${
            mobileMenuOpen ? 'text-info-fg' : 'text-muted-foreground'
          }`}>
            <Menu className="w-5 h-5" />
            <span className="text-xs">Menu</span>
          </button>
          <button onClick={() => setSearchOpen(true)} className="flex flex-col items-center justify-center gap-0.5 p-3 text-muted-foreground touch-manipulation min-w-[44px] min-h-[44px]">
            <Search className="w-5 h-5" />
            <span className="text-xs">Search</span>
          </button>
          <button onClick={() => window.location.reload()} className="flex flex-col items-center justify-center gap-0.5 p-3 text-muted-foreground touch-manipulation min-w-[44px] min-h-[44px]">
            <RefreshCw className="w-5 h-5" />
            <span className="text-xs">Refresh</span>
          </button>
          <div className="flex flex-col items-center justify-center gap-0.5 p-3 text-muted-foreground touch-manipulation min-w-[44px] min-h-[44px]">
            <ThemeToggle />
            <span className="text-xs">Theme</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 p-3 text-muted-foreground touch-manipulation min-w-[44px] min-h-[44px]">
            <Notifications />
            <span className="text-xs">Alerts</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-hidden p-3 lg:p-4 min-h-0 relative lg:pb-4 pb-16" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'auto' }}>

          {children}
        </main>
      </div>
    </div>
    <PortalProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </StatusConfigProvider>
  );
}