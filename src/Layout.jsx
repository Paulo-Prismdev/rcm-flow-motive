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
  Users,
  Settings,
  Menu,
  X,
  MessageSquare,
  LogOut,
  BarChart3,
  CheckSquare,
  RefreshCw,
  Plus,
  ChevronRight,
  Shield,
  Building2 } from
"lucide-react";
import GlobalSearch from "./components/layout/GlobalSearch";
import Notifications from "./components/layout/Notifications";
import ThemeToggle from "./components/layout/ThemeToggle";
import FloatingMessenger from "./components/layout/FloatingMessenger";
import RepairerLayout from "./components/repairer/RepairerLayout";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { StatusConfigProvider } from './components/shared/StatusConfigContext';
import UserTypeFixer from './components/shared/UserTypeFixer';
import UserProfile, { getUserInitials, getAvatarColor } from "./components/layout/UserProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { User } from "lucide-react";

const allDepartments = [
{ name: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, permission: "Dashboard" },
{ name: "Repairs", url: createPageUrl("Claims"), icon: FileText, permission: "Claims" },
{ name: "My Tasks", url: createPageUrl("Tasks"), icon: CheckSquare, permission: "Claims" },
{ name: "Estimating", url: createPageUrl("Estimating"), icon: Calculator, permission: "Estimating" },
{ name: "Engineering", url: createPageUrl("Engineering"), icon: Wrench, permission: "Engineering" },
{ name: "Parts", url: createPageUrl("Parts"), icon: Package, permission: "Parts" },
{ name: "Tyre Requests", url: createPageUrl("TyreRequests"), icon: Package, permission: "Parts" },

{ name: "Reports", url: createPageUrl("Reports"), icon: BarChart3, permission: "Reports" },
{ name: "Map", url: createPageUrl("BodyshopMap"), icon: Search, permission: "Map" }];



export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [claimDetailOpen, setClaimDetailOpen] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setClaimDetailOpen(document.body.classList.contains('claim-detail-open'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const companyLogo = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5000),
    refetchInterval: messagesOpen ? 5000 : 60000,
    enabled: !!currentUser && (currentUser.user_type === 'internal' || currentUser.role === 'admin'),
    staleTime: 30000,
    retry: 1,
    retryDelay: 5000
  });

  const unreadMessagesCount = useMemo(() => {
    if (!currentUser || !messages.length) return 0;
    return messages.filter((msg) => {
      if (msg.conversation_type === 'channel' && msg.channel_members?.includes(currentUser.email)) {
        return msg.sender_email !== currentUser.email && !msg.read_by?.includes(currentUser.email);
      }
      if (msg.conversation_type === 'direct') {
        const isForMe = msg.sender_email !== currentUser.email && (
        msg.channel_members?.includes(currentUser.email) || msg.sender_email === currentUser.email);
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

  const departments = allDepartments.filter((dept) => {
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
  const isReferrerUser = (currentUser?.user_type === 'referrer' || currentUser?.linked_referrer_id) &&
  !isAdmin && currentUser?.user_type !== 'internal';
  if (isReferrerUser && currentPageName === 'ReferrerPortal') {
    return children;
  }
  if (isReferrerUser && currentPageName !== 'ReferrerPortal') {
    window.location.href = createPageUrl('ReferrerPortal');
    return null;
  }

  const isClientUser = currentUser?.user_type === 'client' && !isAdmin;
  if (isClientUser && currentPageName === 'ClientPortal') {
    return children;
  }
  if (isClientUser && currentPageName !== 'ClientPortal') {
    window.location.href = createPageUrl('ClientPortal');
    return null;
  }

  const userInitials = currentUser?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <StatusConfigProvider>
      <UserTypeFixer />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {isInternalUser &&
      <FloatingMessenger
        currentUser={currentUser}
        isOpen={messagesOpen}
        onClose={() => setMessagesOpen(false)} />

      }

      <div className="flex overflow-hidden bg-gray-100 dark:bg-gray-950" style={{ height: '100dvh' }}>

        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed inset-y-0 left-0 z-[9999] flex flex-col
          w-56 bg-[#131d47] text-white
          transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex-shrink-0 md:w-12
          lg:w-56
        `}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 md:justify-center lg:justify-start">
            <img src={companyLogo} alt="RCM" className="h-8 w-auto object-contain md:hidden lg:block" />
            <div className="hidden md:flex lg:hidden items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-xs">R</div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="ml-auto md:hidden text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
            {departments.map((dept) => {
              const isActive = location.pathname === dept.url;
              return (
                <Link
                  key={dept.name}
                  to={dept.url}
                  onClick={() => setMobileMenuOpen(false)}
                  title={dept.name}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-all md:justify-center md:px-2 lg:justify-start lg:px-3 ${
                  isActive ?
                  'bg-white/10 text-white border border-white/15' :
                  'text-white/60 hover:bg-white/8 hover:text-white/90'}`
                  }>
                  <dept.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="md:hidden lg:block">{dept.name}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60 md:hidden lg:block" />}
                </Link>);

            })}

            {/* Directories section */}
            {isInternalUser &&
            (() => {
              const dirLinks = [
                { name: "Repairers", url: createPageUrl("RepairerDirectory"), icon: Building2 },
                { name: "Insurers", url: createPageUrl("InsurerDirectory"), icon: Shield },
                { name: "Suppliers", url: createPageUrl("SupplierManagement"), icon: Package },
                { name: "Companies", url: "/admin/companies", icon: Building2 },
              ];
              const anyActive = dirLinks.some((d) => location.pathname === d.url);
              const open = directoriesOpen || anyActive;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => setDirectoriesOpen((v) => !v)}
                    title="Directories"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-all md:justify-center md:px-2 lg:justify-start lg:px-3 ${
                      open ? 'text-white' : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                    }`}>
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="md:hidden lg:block flex-1 text-left">Directories</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform md:hidden lg:block ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && dirLinks.map((d) => {
                    const isActive = location.pathname === d.url;
                    return (
                      <Link
                        key={d.name}
                        to={d.url}
                        onClick={() => setMobileMenuOpen(false)}
                        title={d.name}
                        className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-all md:justify-center md:px-2 lg:justify-start lg:pl-7 lg:pr-3 ${
                          isActive
                            ? 'bg-white/10 text-white border border-white/15'
                            : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                        }`}>
                        <d.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="md:hidden lg:block">{d.name}</span>
                      </Link>
                    );
                  })}
                </>
              );
            })()
            }

            {/* Management section */}
            {(isAdmin || canManagePermissions) &&
            <>
                <div className="pt-4 pb-1 px-3 md:px-2 lg:px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 md:hidden lg:block">Management</p>
                  <div className="hidden md:block lg:hidden border-t border-white/10 mt-1" />
                </div>
                {isAdmin &&
              <>
                    <Link to={createPageUrl("Settings")} onClick={() => setMobileMenuOpen(false)}
                title="Settings"
                className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white/90 transition-all md:justify-center md:px-2 lg:justify-start lg:px-3">
                      <Settings className="w-4 h-4 flex-shrink-0" /><span className="md:hidden lg:block">Settings</span>
                    </Link>
                    <Link to={createPageUrl("Archive")} onClick={() => setMobileMenuOpen(false)}
                title="Archive"
                className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white/90 transition-all md:justify-center md:px-2 lg:justify-start lg:px-3">
                      <Archive className="w-4 h-4 flex-shrink-0" /><span className="md:hidden lg:block">Archive</span>
                    </Link>

                    {isSuperAdmin &&
                <Link to={createPageUrl("FeedbackHub")} onClick={() => setMobileMenuOpen(false)}
                title="Feedback Hub"
                className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white/90 transition-all md:justify-center md:px-2 lg:justify-start lg:px-3">
                        <MessageSquare className="w-4 h-4 flex-shrink-0" /><span className="md:hidden lg:block">Feedback Hub</span>
                      </Link>
                }
                  </>
              }
              </>
            }
          </nav>

          {/* User footer */}
          <div className="border-t border-white/10 px-3 py-3 md:px-1 lg:px-3">
            <UserProfile
              customTrigger={
              <div className="flex items-center gap-3 group cursor-pointer w-full hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors md:justify-center md:mx-0 lg:justify-start lg:-mx-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {currentUser?.profile_picture_url ?
                  <img
                    src={currentUser.profile_picture_url}
                    alt="Profile"
                    className="w-full h-full object-cover" /> :
                  <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(currentUser?.email)}`}>
                        <span className="text-sm font-bold text-white">
                          {getUserInitials(currentUser)}
                        </span>
                      </div>
                  }
                  </div>
                  <div className="flex-1 min-w-0 md:hidden lg:block">
                    <p className="text-sm font-medium text-white truncate">{currentUser?.full_name || 'User'}</p>
                    <p className="text-xs text-white/40 truncate">{currentUser?.email || ''}</p>
                    <p className="text-[10px] text-white/30 truncate mt-0.5">Click for profile & logout</p>
                  </div>
                </div>
              } />
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen &&
        <div
          className="fixed inset-0 z-[9998] bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)} />
        }

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ── MOBILE bottom tab bar (< lg) ── */}
          {!claimDetailOpen &&
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 safe-area-inset-bottom" style={{ height: '60px', zIndex: 1000 }}>
              <button onClick={() => setMobileMenuOpen((prev) => !prev)} className="flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
                <Menu className="w-5 h-5" />
                <span className="text-[9px]">Menu</span>
              </button>
              <button onClick={() => setSearchOpen(true)} className="flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
                <Search className="w-5 h-5" />
                <span className="text-[9px]">Search</span>
              </button>
              {isInternalUser &&
            <button onClick={() => setMessagesOpen((prev) => !prev)} className="relative flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[9px]">Messages</span>
                  {unreadMessagesCount > 0 &&
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
              }
                </button>
            }
              <button onClick={() => window.location.reload()} className="flex flex-col items-center justify-center gap-0.5 p-3 text-gray-500 dark:text-gray-400 touch-manipulation min-w-[44px] min-h-[44px]">
                <RefreshCw className="w-5 h-5" />
                <span className="text-[9px]">Refresh</span>
              </button>
              <div className="flex flex-col items-center justify-center gap-0.5 touch-manipulation min-w-[44px] min-h-[44px]">
                <ThemeToggle />
                <span className="text-[9px] text-gray-500">Theme</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 touch-manipulation min-w-[44px] min-h-[44px]">
                <Notifications />
                <span className="text-[9px] text-gray-500">Alerts</span>
              </div>
              </div>
          }

              {/* ── DESKTOP top bar (≥ lg) ── */}
          {!claimDetailOpen &&
          <header className="hidden md:flex flex-shrink-0 dark:bg-gray-900/95 border-b border-gray-100 dark:border-gray-800/80 items-center gap-3 px-5 relative z-30 backdrop-blur-sm bg-[hsl(var(--background))]" style={{ height: '48px', minHeight: '48px' }}>
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
                {isInternalUser &&
              <button
                onClick={() => setMessagesOpen(true)}
                className="relative p-1.5 rounded-[10px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                title="Messages">
                
                    <MessageSquare className="w-4 h-4" />
                    {unreadMessagesCount > 0 &&
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                }
                  </button>
              }
                <ThemeToggle />
                <Notifications />
              </div>
            </header>
          }

          {/* Page content */}
          <main className="flex-1 overflow-hidden p-0 md:p-2 lg:p-4 min-h-0 relative pb-16 md:pb-2 lg:pb-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </StatusConfigProvider>);

}