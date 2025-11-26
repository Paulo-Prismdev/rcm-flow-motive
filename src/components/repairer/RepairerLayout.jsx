import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusConfigProvider } from '../shared/StatusConfigContext';

export default function RepairerLayout({ children }) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bodyshop } = useQuery({
    queryKey: ['bodyshop', currentUser?.linked_bodyshop_id],
    queryFn: () => base44.entities.Bodyshop.get(currentUser.linked_bodyshop_id),
    enabled: !!currentUser?.linked_bodyshop_id,
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
      `}</style>

      {/* Header */}
      <header className="neomorph mb-2 mx-2 md:mx-3 mt-2 md:mt-3 p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {bodyshop?.logo_url ? (
              <img 
                src={bodyshop.logo_url} 
                alt={bodyshop.name} 
                className="h-10 md:h-12 max-w-[200px] object-contain"
              />
            ) : (
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: "'Palatino Linotype', serif", fontSize: '1.5rem' }}>
                  <span style={{ color: 'var(--accent)' }}>A</span>
                  <span>RTEC</span>
                  <span style={{ color: 'var(--accent)' }}>H</span>
                </span>
                <span style={{ fontWeight: 300, fontSize: '1.5rem' }}>One</span>
              </div>
            )}
            <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent font-medium">
              Repairer Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {bodyshop && (
              <div className="hidden md:flex items-center gap-2 text-sm text-foreground-muted">
                <Building2 className="w-4 h-4" />
                {bodyshop.name}
              </div>
            )}

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