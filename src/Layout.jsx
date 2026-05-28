import React, { useState, useMemo, useEffect } from "react";
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
  MessageSquare,
  LogOut,
  BarChart3,
  CheckSquare,
  RefreshCw,
  Plus,
  ChevronRight,
} from "lucide-react";
import GlobalSearch from "./components/layout/GlobalSearch";
import Notifications from "./components/layout/Notifications";
import UserProfile from "./components/layout/UserProfile";
import ThemeToggle from "./components/layout/ThemeToggle";
import FloatingMessenger from "./components/layout/FloatingMessenger";
import RepairerLayout from "./components/repairer/RepairerLayout";
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
  { name: "Tyre Requests", url: createPageUrl("TyreRequests"), icon: Package, permission: "Parts" },
  { name: "Invoicing", url: createPageUrl("Invoicing"), icon: DollarSign, permission: "Invoicing" },
  { name: "Reports", url: createPageUrl("Reports"), icon: BarChart3, permission: "Reports" },
  { name: "Map", url: createPageUrl("BodyshopMap"), icon: Search, permission: "Map" },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [claimDetailOpen, setClaimDetailOpen] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setClaimDetailOpen(document.body.classList.contains('claim-detail-open'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const companyLogo = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5000),
    refetchInterval: messagesOpen ? 5000 : 60000,
    enabled: !!currentUser && (currentUser.user_type === 'internal' || currentUser.role === 'admin'),
    staleTime: 30000,
    retry: 1,
    retryDelay: 5000,
  });

  const unreadMessagesCount = useMemo(() => {
    if (!currentUser || !messages.length) return 0;
    return messages.filter(msg => {
      if (msg.conversation_type === 'channel' && msg.channel_members?.includes(currentUser.email)) {
        return msg.sender_email !== currentUser.email && !msg.read_by?.includes(currentUser.email);
      }
      if (msg.conversation_type === 'direct') {
        const isForMe = msg.sender_email !== currentUser.email &&
          (msg.channel_members?.includes(currentUser.email) || msg.sender_email === currentUser.email);
        return isForMe && !msg.is_read;
      }
      return false;
    }).length;
  }, [messages, currentUser]);

  const userRole = currentUser?.role;
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'super_admin' || userRole === 'company_admin' || userRole === 'admin';
  const isInternalUser = currentUser?.user_type === 'internal' || isAdmin;
  const canManagePermissions = isAdmin || currentUser?.can_manage_permissions;

  const departments = allDepartments.filter(dept => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    const userAccess = currentUser.departments_access || [];
    return userAccess.includes(dept.permission);
  });

  // Repairer/referrer routing
  if (currentUser?.user_type === 'bodyshop' && !isAdmin && currentPageName === 'RepairerPortal') {
    return <RepairerLayout>{children}</RepairerLayout>;
  }
  if (currentUser?.user_type === 'bodyshop' && !isAdmin && currentPageName !== 'RepairerPortal') {
    window.location.href = createPageUrl('RepairerPortal');
    return null;
  }
  if ((currentUser?.user_type === 'referrer' || currentUser?.linked_referrer_id) &&
    !currentUser?.user_type?.includes('internal') &&
    currentUser?.role !== 'admin' &&
    currentPageName === 'ReferrerPortal') {
    return children;
  }
  if ((currentUser?.user_type === 'referrer' || (currentUser?.linked_referrer_id && !currentUser?.user_type)) &&
    currentUser?.user_type !== 'internal' &&
    currentUser?.role !== 'admin' &&
    currentPageName !== 'ReferrerPortal') {
    window.location.href = createPageUrl('ReferrerPortal');
    return null;
  }

  const userInitials = currentUser?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <StatusConfigProvider>
      <UserTypeFixer />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {isInternalUser && (
        <FloatingMessenger
          currentUser={currentUser}
          isOpen={messagesOpen}
          onClose={() => setMessagesOpen(false)}
        />
      )}

      <div className="flex overflow-hidden bg-gray-100 dark:bg-gray-950" style={{height: '100dvh'}}>

        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          w-56 bg-[#131d47] text-white
          transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex-shrink-0
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
            <img src={companyLogo} alt="RCM" className="h-8 w-auto object-contain" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="ml-auto lg:hidden text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" style={{WebkitOverflowScrolling: 'touch'}}>
            {departments.map((dept) => {
              const isActive = location.pathname === dept.url;
              return (
                <Link
                  key={dept.name}
                  to={dept.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#00cc00]/20 text-[#00ff00] border border-[#00ff00]/20'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <dept.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{dept.name}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </Link>
              );
            })}

            {/* Management section */}
            {(isAdmin || canManagePermissions) && (
              <>
                <div className="pt-4 pb-1 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Management</p>
                </div>
                {isAdmin && (
                  <>
                    <Link to={createPageUrl("Settings")} onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
                      <Settings className="w-4 h-4" /><span>Settings</span>
                    </Link>
                    <Link to={createPageUrl("Archive")} onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
                      <Archive className="w-4 h-4" /><span>Archive</span>
                    </Link>
                    <Link to={createPageUrl("CompanyIdLookup")} onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
                      <Users className="w-4 h-4" /><span>Company ID Lookup</span>
                    </Link>
                    <Link to={createPageUrl("EmployeeManagement")} onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
                      <CalendarDays className="w-4 h-4" /><span>Employee Mgmt</span>
                    </Link>
                    {isSuperAdmin && (
                      <Link to={createPageUrl("FeedbackHub")} onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
                        <MessageSquare className="w-4 h-4" /><span>Feedback Hub</span>
                      </Link>
                    )}
                  </>
                )}
              </>
            )}
          </nav>

          {/* User footer */}
          <div className="border-t border-white/10 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <UserProfile />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser?.full_name || 'User'}</p>
                <p className="text-xs text-white/40 truncate">{currentUser?.role || ''}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{isolation: 'isolate'}}>
          {/* ── MOBILE top bar (< lg) ── */}
          {!claimDetailOpen && (
            <div className="lg:hidden flex-shrink-0 flex items-center gap-2 px-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" style={{height: '52px', minHeight: '52px'}}>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-800 touch-manipulation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex-1" />
              <button
                onClick={() => window.location.reload()}
                className="p-2 rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-800 touch-manipulation"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-800 touch-manipulation"
              >
                <Search className="w-5 h-5" />
              </button>
              {isInternalUser && (
                <button
                  onClick={() => setMessagesOpen(true)}
                  className="relative p-2 rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-800 touch-manipulation"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
              )}
              <ThemeToggle />
              <Notifications />
            </div>
          )}

          {/* ── DESKTOP top bar (≥ lg) ── */}
          {!claimDetailOpen && (
            <header className="hidden lg:flex flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 items-center gap-3 px-4 relative z-30" style={{height: '48px', minHeight: '48px'}}>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
                {isInternalUser && (
                  <button
                    onClick={() => setMessagesOpen(true)}
                    className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                    title="Messages"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>
                )}
                <ThemeToggle />
                <Notifications />
              </div>
            </header>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-hidden p-3 min-h-0 relative" style={{WebkitOverflowScrolling: 'touch', touchAction: 'auto'}}>
            {children}
          </main>
        </div>
      </div>
    </StatusConfigProvider>
  );
}