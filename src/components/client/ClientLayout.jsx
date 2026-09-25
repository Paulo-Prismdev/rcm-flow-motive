import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, Search, RefreshCw, Menu, FileText, LayoutDashboard, LogOut, User } from 'lucide-react';
import { StatusConfigProvider } from '../shared/StatusConfigContext';
import GlobalSearch from '../layout/GlobalSearch';
import Notifications from '../layout/Notifications';
import ThemeToggle from '../layout/ThemeToggle';
import PortalProfileModal from '../shared/PortalProfileModal';

export default function ClientLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);

  React.useEffect(() => {
    const handleNav = (e) => {
      if (e.detail === 'claims') setActiveTab('claims');
      if (e.detail === 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('client-nav', handleNav);
    return () => window.removeEventListener('client-nav', handleNav);
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <StatusConfigProvider>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <div className="flex overflow-hidden bg-gray-100 dark:bg-gray-950 app-height">
        {/* SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 z-[9999] flex flex-col
          w-56 bg-[#131d47] text-white
          transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex-shrink-0
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
            <img src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg" alt="RCM" className="h-8 w-auto object-contain" />
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
                window.dispatchEvent(new CustomEvent('client-nav', { detail: 'dashboard' }));
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </a>
            <a
              href="#claims"
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('client-nav', { detail: 'claims' }));
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-all ${
                activeTab === 'claims'
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              }`}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>My Claims</span>
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
                title="My Profile"
                className="text-white/40 hover:text-white transition-colors flex-shrink-0">
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={() => base44.auth.logout()}
                title="Log Out"
                className="text-white/40 hover:text-red-400 transition-colors flex-shrink-0">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen &&
          <div
            className="fixed inset-0 z-[9998] bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)} />
        }

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* TOP BAR */}
          <header className="hidden lg:flex flex-shrink-0 dark:bg-gray-900/95 border-b border-gray-100 dark:border-gray-800/80 items-center gap-3 px-5 relative z-30 backdrop-blur-sm bg-[hsl(var(--background))]" style={{ height: '48px', minHeight: '48px' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {currentUser?.display_name || currentUser?.full_name || ''}
              </span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Client Portal
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="p-1.5 rounded-[10px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-1.5 rounded-[10px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                title="Search">
                <Search className="w-4 h-4" />
              </button>
              <div className="p-1.5 rounded-[10px]">
                <ThemeToggle />
              </div>
              <div className="p-1.5 rounded-[10px]">
                <Notifications />
              </div>
            </div>
          </header>

          {/* Mobile bottom tab bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 safe-area-inset-bottom" style={{ height: '60px', zIndex: 1000 }}>
            <button onClick={() => setMobileMenuOpen(prev => !prev)} className={`flex flex-col items-center justify-center gap-0.5 p-3 touch-manipulation min-w-[44px] min-h-[44px] ${mobileMenuOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
              <Menu className="w-5 h-5" />
              <span className="text-[9px]">Menu</span>
            </button>
            <button onClick={() => setSearchOpen(true)} className="flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
              <Search className="w-5 h-5" />
              <span className="text-[9px]">Search</span>
            </button>
            <button onClick={() => window.location.reload()} className="flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
              <RefreshCw className="w-5 h-5" />
              <span className="text-[9px]">Refresh</span>
            </button>
            <div className="flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
              <ThemeToggle />
              <span className="text-[9px]">Theme</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
              <Notifications />
              <span className="text-[9px]">Alerts</span>
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