import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusConfigProvider } from '../shared/StatusConfigContext';

export default function ReferrerLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <StatusConfigProvider>
      <div className="h-full flex overflow-hidden bg-gray-100 dark:bg-gray-950">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 bg-[#131d47] text-white flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
            <img 
              src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg" 
              alt="RCM" 
              className="h-8 w-auto object-contain" 
            />
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1">Portal</p>
              <div className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-white/10 text-white border border-white/15">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Referrer Portal</span>
              </div>
            </div>
          </nav>

          {/* User footer */}
          <div className="border-t border-white/10 px-3 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 group cursor-pointer w-full hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {currentUser?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{currentUser?.full_name || 'User'}</p>
                    <p className="text-xs text-white/40 truncate">{currentUser?.email || ''}</p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-[9999] w-56 bg-[#131d47] text-white lg:hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <img 
                  src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg" 
                  alt="RCM" 
                  className="h-6 w-auto object-contain" 
                />
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="py-4 px-2">
                <div className="px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1">Portal</p>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-white/10 text-white border border-white/15">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Referrer Portal</span>
                  </div>
                </div>
              </nav>
              <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3">
                <button
                  onClick={() => base44.auth.logout()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile header */}
          <div className="lg:hidden bg-[#131d47] text-white px-4 py-2.5 border-b border-white/10 flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 hover:bg-white/10 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">Referrer Portal</span>
          </div>

          {/* Content */}
          <main className="flex-1 overflow-hidden p-3 lg:p-4">
            {children}
          </main>
        </div>
      </div>
    </StatusConfigProvider>
  );
}