import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Wrench,
  Package,
  Search,
  Archive,
  ChevronDown,
  DollarSign,
  Users,
  Settings,
  Menu,
  X,
  CalendarDays,
  UserCog,
  MessageSquare,
  LogOut,
  Sun,
  Moon,
  BarChart3,
  CheckSquare,
} from "lucide-react";
import GlobalSearch from "./components/layout/GlobalSearch";
import Notifications from "./components/layout/Notifications";
import UserProfile from "./components/layout/UserProfile";
import ThemeToggle from "./components/layout/ThemeToggle";
import FloatingMessenger from "./components/layout/FloatingMessenger";
import RepairerLayout from "./components/repairer/RepairerLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { StatusConfigProvider } from './components/shared/StatusConfigContext';
import UserTypeFixer from './components/shared/UserTypeFixer';

const allDepartments = [
  { name: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, permission: "Dashboard" },
  { name: "Claims", url: createPageUrl("Claims"), icon: FileText, permission: "Claims" },
  { name: "My Tasks", url: createPageUrl("Tasks"), icon: CheckSquare, permission: "Claims" },
  { name: "Estimating", url: createPageUrl("Estimating"), icon: Calculator, permission: "Estimating" },
  { name: "Engineering", url: createPageUrl("Engineering"), icon: Wrench, permission: "Engineering" },
  { name: "Parts", url: createPageUrl("Parts"), icon: Package, permission: "Parts" },
  { name: "Invoicing", url: createPageUrl("Invoicing"), icon: DollarSign, permission: "Invoicing" },
  { name: "Reports", url: createPageUrl("Reports"), icon: BarChart3, permission: "Reports" },
  { name: "Map", url: createPageUrl("BodyshopMap"), icon: Search, permission: "Map" },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const navContainerRef = useRef(null);
  const [hasScrollRight, setHasScrollRight] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const companyLogo = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

  // Simplified messages query - only fetch when messenger is about to open
  // This prevents unnecessary WebSocket connections
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5000),
    refetchInterval: messagesOpen ? 5000 : 60000, // Only refetch frequently when messenger is open
    enabled: !!currentUser && (currentUser.user_type === 'internal' || currentUser.role === 'admin'),
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 1, // Only retry once to avoid connection loops
    retryDelay: 5000, // Wait 5 seconds before retrying
  });

  // Calculate unread messages count
  const unreadMessagesCount = React.useMemo(() => {
    if (!currentUser || !messages.length) return 0;
    
    return messages.filter(msg => {
      // For channels
      if (msg.conversation_type === 'channel' && msg.channel_members?.includes(currentUser.email)) {
        return msg.sender_email !== currentUser.email && !msg.read_by?.includes(currentUser.email);
      }
      // For direct messages
      if (msg.conversation_type === 'direct') {
        const isForMe = msg.sender_email !== currentUser.email && 
                       (msg.channel_members?.includes(currentUser.email) || msg.sender_email === currentUser.email);
        return isForMe && !msg.is_read;
      }
      return false;
    }).length;
  }, [messages, currentUser]);

  const departments = allDepartments.filter(dept => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const userAccess = currentUser.departments_access || [];
    return userAccess.includes(dept.permission);
  });

  const canManagePermissions = currentUser?.role === 'admin' || currentUser?.can_manage_permissions;
  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

  useEffect(() => {
    const checkScroll = () => {
      if (navContainerRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = navContainerRef.current;
        setHasScrollRight(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScroll();

    const currentNavContainer = navContainerRef.current;
    if (currentNavContainer) {
      currentNavContainer.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }

    return () => {
      if (currentNavContainer) {
        currentNavContainer.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      }
    };
  }, [departments]);

  // If user is a bodyshop/repairer and accessing the repairer portal, use the repairer layout
  if (currentUser?.user_type === 'bodyshop' && currentPageName === 'RepairerPortal') {
    return (
      <RepairerLayout>
        {children}
      </RepairerLayout>
    );
  }

  // If user is a bodyshop type, redirect them to RepairerPortal
  if (currentUser?.user_type === 'bodyshop' && currentPageName !== 'RepairerPortal') {
    window.location.href = createPageUrl('RepairerPortal');
    return null;
  }

  // If user is a referrer type and accessing the referrer portal, the page handles its own layout
  if ((currentUser?.user_type === 'referrer' || currentUser?.linked_referrer_id) && 
      !currentUser?.user_type?.includes('internal') && 
      currentUser?.role !== 'admin' &&
      currentPageName === 'ReferrerPortal') {
    return children;
  }

  // If user is a referrer type (or linked to referrer without being internal), redirect them to ReferrerPortal
  if ((currentUser?.user_type === 'referrer' || (currentUser?.linked_referrer_id && !currentUser?.user_type)) && 
      currentUser?.user_type !== 'internal' && 
      currentUser?.role !== 'admin' &&
      currentPageName !== 'ReferrerPortal') {
    window.location.href = createPageUrl('ReferrerPortal');
    return null;
  }

  return (
    <StatusConfigProvider>
      <UserTypeFixer />
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        
        {isInternalUser && (
          <FloatingMessenger 
            currentUser={currentUser} 
            isOpen={messagesOpen}
            onClose={() => setMessagesOpen(false)}
          />
        )}
        
        <style>{`
        /* Import Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* ============================================
           COMPREHENSIVE DESIGN SYSTEM
           ============================================ */

        :root {
          /* Light Mode Colors */
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
          
          /* Glass Effect */
          --glass-bg: rgba(255, 255, 255, 0.85);
          --glass-border: rgba(0, 0, 0, 0.08);
          
          /* Shadows */
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08);
          --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
          
          /* Status Colors */
          --success: #10b981;
          --warning: #f59e0b;
          --error: #ef4444;
          --info: #3b82f6;
        }

        [data-theme="dark"] {
          /* Dark Mode Colors */
          --background: #070d1a;
          --surface: #0f1829;
          --surface-elevated: #182035;
          --surface-hover: #1e2a45;
          
          --foreground: #f1f5f9;
          --foreground-muted: #cbd5e1;
          --foreground-subtle: #64748b;
          
          --accent: #fbbf24;
          --accent-hover: #f59e0b;
          --accent-foreground: #000000;
          
          --border: #334155;
          --border-strong: #475569;
          
          /* Glass Effect */
          --glass-bg: rgba(30, 41, 59, 0.85);
          --glass-border: rgba(255, 255, 255, 0.08);
          
          /* Shadows */
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
          
          /* Status Colors */
          --success: #22c55e;
          --warning: #fbbf24;
          --error: #f87171;
          --info: #60a5fa;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: var(--background);
          color: var(--foreground);
          transition: background-color 0.3s ease, color 0.3s ease;
          line-height: 1.6;
        }

        /* ============================================
           GLASS COMPONENTS
           ============================================ */

        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          color: var(--foreground);
        }

        .glass-flat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          color: var(--foreground);
        }

        .glass-elevated {
          background: var(--surface-elevated);
          border: 1px solid var(--border-strong);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          color: var(--foreground);
        }

        .glass-inset {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
          color: var(--foreground);
        }

        /* glass-button: always used on the dark #151d44 header — always white */
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
          transform: translateY(-1px);
        }

        .glass-button:active {
          transform: translateY(0);
        }

        /* surface-button: used in mobile menu / light-mode areas */
        .surface-button {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
          cursor: pointer;
          color: var(--foreground);
        }

        .surface-button:hover {
          background: var(--surface-hover);
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
        }

        .card-hover {
          transition: all 0.3s ease;
        }

        .card-hover:hover {
          background: var(--surface-hover);
          box-shadow: var(--shadow-lg);
          transform: translateY(-2px);
        }

        /* Neomorph styles (alias for glass) */
        .neomorph {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          color: var(--foreground);
        }

        .neomorph-flat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          color: var(--foreground);
        }

        .neomorph-inset {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
          color: var(--foreground);
        }

        /* Input styling */
        input, textarea, select {
          color: var(--foreground) !important;
          background: var(--surface) !important;
        }

        input::placeholder, textarea::placeholder {
          color: var(--foreground-subtle) !important;
        }

        /* ============================================
           HEADER STYLES
           ============================================ */

        .header-glass {
          background: #151d44;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          box-shadow: var(--shadow-lg);
        }

        .app-title-artura {
                        font-family: 'Palatino Linotype', 'Palatino', 'Book Antiqua', serif;
                        font-weight: 400;
                        font-size: 1.75rem;
                        letter-spacing: 0.02em;
                      }

                      .app-title-artura .gold-letter {
                        color: var(--accent);
                      }

                      .app-title-artura .black-letter {
                        color: var(--foreground);
                      }

                      .app-title-one {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        font-weight: 300;
                        font-size: 1.75rem;
                        color: var(--foreground);
                      }

                      .app-title {
                        display: flex;
                        align-items: baseline;
                        gap: 0.5rem;
                      }

        /* ============================================
           NAVIGATION STYLES
           ============================================ */

        .nav-container {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .nav-container::-webkit-scrollbar {
          display: none;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          white-space: nowrap;
          font-size: 0.875rem;
          font-weight: 500;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
        }

        .nav-button:hover {
          background: rgba(255,255,255,0.14);
          border-color: rgba(255,255,255,0.2);
          box-shadow: var(--shadow-md);
        }

        .nav-button-active {
          background: var(--accent);
          color: var(--accent-foreground);
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }

        .nav-active {
          background: var(--accent);
          color: var(--accent-foreground);
          border-color: var(--accent);
        }

        /* ============================================
           MOBILE MENU
           ============================================ */

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
          -webkit-backdrop-filter: blur(24px);
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

        /* ============================================
           TYPOGRAPHY
           ============================================ */

        h1, h2, h3, h4, h5, h6 {
          color: var(--foreground);
          font-weight: 700;
        }

        .text-foreground {
          color: var(--foreground);
        }

        .text-foreground-muted {
          color: var(--foreground-muted);
        }

        .text-foreground-subtle {
          color: var(--foreground-subtle);
        }

        /* ============================================
           UTILITY CLASSES
           ============================================ */

        .bg-background {
          background-color: var(--background);
        }

        .bg-surface {
          background-color: var(--surface);
        }

        .text-accent {
          color: var(--accent);
        }

        .border-accent {
          border-color: var(--accent);
        }

        .bg-accent {
          background-color: var(--accent);
          color: var(--accent-foreground);
        }

        /* Status Colors */
        .text-success { color: var(--success); }
        .text-warning { color: var(--warning); }
        .text-error { color: var(--error); }
        .text-info { color: var(--info); }

        .bg-success { background-color: var(--success); color: white; }
        .bg-warning { background-color: var(--warning); color: white; }
        .bg-error { background-color: var(--error); color: white; }
        .bg-info { background-color: var(--info); color: white; }

        /* ============================================
           RESPONSIVE
           ============================================ */

        @media (max-width: 768px) {
          .header-glass {
            border-radius: 16px;
            margin: 0.75rem;
          }

          h1 { font-size: 1.5rem; }
          h2 { font-size: 1.25rem; }
          h3 { font-size: 1.1rem; }
        }

        @media (max-width: 640px) {
          .app-title-artura {
            font-size: 1.15rem;
          }

          .app-title-one {
            font-size: 1.15rem;
          }

          .header-glass {
            padding: 0.75rem 0.5rem;
          }

          body {
            font-size: 14px;
          }
        }

        @media (max-width: 400px) {
          .app-title-artura {
            font-size: 1rem;
          }

          .app-title-one {
            font-size: 1rem;
          }
        }

        /* ============================================
           SCROLLBAR STYLING
           ============================================ */

        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: var(--surface);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--foreground-subtle);
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--foreground-muted);
        }
      `}</style>

        {/* NEW HEADER - COMPLETELY REWRITTEN */}
        <header className="header-glass mb-2 mx-2 md:mx-3 mt-2 md:mt-3 p-3 md:p-4 flex-shrink-0">
          <div className="max-w-full mx-auto">
            {/* Top Row - Logo and Actions */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Burger + Logo (Mobile) OR Just Logo (Desktop) */}
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                {/* MOBILE ONLY: Burger Button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="glass-button w-10 h-10 flex items-center justify-center flex-shrink-0 md:hidden"
                >
                  <Menu className="w-4 h-4" />
                </button>

                {/* Company Logo + App Title */}
                <div className="flex items-center gap-3">
                  <div className="h-14 w-auto flex-shrink-0">
                  <img 
                    src={companyLogo} 
                    alt="RCM Automotive" 
                    className="h-full w-auto object-contain"
                  />
                </div>
                  
                </div>
              </div>

              {/* Right Side Actions */}
              {/* MOBILE ONLY: Just Messages */}
              {isInternalUser && (
                <button
                  onClick={() => setMessagesOpen(true)}
                  className="glass-button w-10 h-10 flex items-center justify-center relative flex-shrink-0 md:hidden"
                  title="Messages"
                >
                  <MessageSquare className="w-4 h-4" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
              )}

              {/* DESKTOP ONLY: All Buttons - Now using inline flex instead of class */}
              <div className="hidden md:flex items-center gap-[0.375rem] flex-shrink-0">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="glass-button w-10 h-10 flex items-center justify-center"
                >
                  <Search className="w-4 h-4" />
                </button>

                {isInternalUser && (
                  <button
                    onClick={() => setMessagesOpen(true)}
                    className="glass-button w-10 h-10 flex items-center justify-center relative"
                    title="Messages"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>
                )}

                <ThemeToggle />
                <Notifications />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="glass-button w-10 h-10 flex items-center justify-center">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-elevated w-56" align="end">
                    {isInternalUser && (
                      <>
                        <Link to={createPageUrl("Settings")}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </DropdownMenuItem>
                        </Link>
                        <Link to={createPageUrl("Archive")}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Archive className="mr-2 h-4 w-4" />
                            <span>View Archive</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs font-semibold text-foreground-muted">
                          Employees
                        </div>
                        <Link to={createPageUrl("EmployeeManagement")}>
                          <DropdownMenuItem className="cursor-pointer">
                            <CalendarDays className="mr-2 h-4 w-4" />
                            <span>Employee Management</span>
                          </DropdownMenuItem>
                        </Link>
                        <Link to={createPageUrl("FeedbackHub")}>
                          <DropdownMenuItem className="cursor-pointer">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>Feedback Hub</span>
                          </DropdownMenuItem>
                        </Link>
                        </>
                        )}
                        {canManagePermissions && (
                      <>
                        <Link to={createPageUrl("UserManagement")}>
                          <DropdownMenuItem className="cursor-pointer">
                            <UserCog className="mr-2 h-4 w-4" />
                            <span>User Management</span>
                          </DropdownMenuItem>
                        </Link>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <UserProfile />
              </div>
            </div>

            {/* Desktop Navigation Row */}
            <div className={`hidden md:block nav-container-wrapper mt-5 ${hasScrollRight ? 'has-scroll-right' : ''}`}>
              <nav 
                className="nav-container"
                ref={navContainerRef}
              >
                {departments.map((dept) => {
                  const isActive = location.pathname === dept.url;
                  return (
                    <Link
                      key={dept.name}
                      to={dept.url}
                      className={`nav-button ${isActive ? 'nav-button-active' : ''}`}
                    >
                      <dept.icon />
                      <span>{dept.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <>
            <div 
              className="mobile-menu-overlay md:hidden" 
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className={`mobile-menu md:hidden ${mobileMenuOpen ? 'open' : ''}`}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-bold text-lg">Menu</h2>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Notifications />
                  <button onClick={() => setMobileMenuOpen(false)} className="surface-button w-10 h-10 flex items-center justify-center">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* User Profile Card */}
              {currentUser && (
                <div className="p-4 border-b border-border">
                  <div className="glass-flat p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      {currentUser.profile_picture_url ? (
                        <img 
                          src={currentUser.profile_picture_url} 
                          alt="Profile" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full bg-accent flex items-center justify-center`}>
                          <span className="text-base font-bold text-accent-foreground">
                            {currentUser.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{currentUser.full_name || 'User'}</p>
                        <p className="text-xs text-foreground-muted truncate">{currentUser.email}</p>
                      </div>
                    </div>
                    <Link to={createPageUrl("UserProfile")} onClick={() => setMobileMenuOpen(false)}>
                      <button className="w-full surface-button px-4 py-2 rounded-lg text-sm">
                        View Profile
                      </button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="p-4 border-b border-border">
                <p className="text-xs font-semibold text-foreground-muted mb-3">QUICK ACTIONS</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSearchOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl surface-button"
                  >
                    <Search className="w-5 h-5" />
                    <span className="font-medium">Search Everything</span>
                  </button>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-foreground-muted mb-3">DEPARTMENTS</p>
                <div className="space-y-2">
                  {departments.map((dept) => {
                    const isActive = location.pathname === dept.url;
                    return (
                      <Link
                        key={dept.name}
                        to={dept.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive ? 'nav-active' : 'surface-button'
                        }`}
                      >
                        <dept.icon className="w-5 h-5" />
                        <span className="font-medium">{dept.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Settings & Management */}
                {(isInternalUser || canManagePermissions) && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-foreground-muted mb-3">MANAGEMENT</p>
                    <div className="space-y-2">
                      {isInternalUser && (
                        <>
                          <Link
                            to={createPageUrl("Settings")}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl surface-button"
                          >
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">Settings</span>
                          </Link>
                          <Link
                            to={createPageUrl("Archive")}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl surface-button"
                          >
                            <Archive className="w-5 h-5" />
                            <span className="font-medium">View Archive</span>
                          </Link>
                          <Link
                            to={createPageUrl("EmployeeManagement")}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl surface-button"
                          >
                            <CalendarDays className="w-5 h-5" />
                            <span className="font-medium">Employee Management</span>
                          </Link>
                        </>
                      )}
                      
                      {canManagePermissions && (
                        <Link
                          to={createPageUrl("UserManagement")}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl surface-button"
                        >
                          <UserCog className="w-5 h-5" />
                          <span className="font-medium">User Management</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </nav>

              {/* Logout Button */}
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => base44.auth.logout()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl surface-button text-red-500 font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </div>
          </>
        )}

        <main className="px-2 md:px-3 pb-3 md:pb-4 flex-1 overflow-y-auto min-h-0">
          <div className="max-w-full mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </StatusConfigProvider>
  );
}