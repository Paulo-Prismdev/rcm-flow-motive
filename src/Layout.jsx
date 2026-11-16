import React, { useState, useMemo, useEffect, Suspense } from "react";
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
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  CircleDot,
  MapPin,
  Warehouse,
  CreditCard,
  Truck,
  Handshake,
  ArrowUpRight } from
"lucide-react";
import GlobalSearch from "./components/layout/GlobalSearch";
import Notifications from "./components/layout/Notifications";
import ThemeToggle from "./components/layout/ThemeToggle";
import FloatingMessenger from "./components/layout/FloatingMessenger";
import RepairerLayout from "./components/repairer/RepairerLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { StatusConfigProvider } from './components/shared/StatusConfigContext';
import PageLoader from './components/PageLoader';
import UserProfile, { getUserInitials, getAvatarColor } from "./components/layout/UserProfile";
import QuickAccessOverlay from "./components/layout/QuickAccessOverlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { User } from "lucide-react";

import { signOut } from '@/lib/signOut';
import { escapeWindowsOpen } from '@/hooks/useEscapeToClose';
const allDepartments = [
{ name: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, permission: "Dashboard" },
{ name: "Repairs", url: createPageUrl("Claims"), icon: FileText, permission: "Claims" },
{ name: "My tasks", url: createPageUrl("Tasks"), icon: CheckSquare, permission: "Claims" },
{ name: "Estimating", url: createPageUrl("Estimating"), icon: Calculator, permission: "Estimating" },
{ name: "Engineering", url: createPageUrl("Engineering"), icon: Wrench, permission: "Engineering" },
{ name: "Parts", url: createPageUrl("Parts"), icon: Package, permission: "Parts" },
{ name: "Tyre requests", url: createPageUrl("TyreRequests"), icon: CircleDot, permission: "Parts" },

{ name: "Invoicing", url: createPageUrl("Invoicing"), icon: Receipt, permission: "Invoicing" },
{ name: "Reports", url: createPageUrl("Reports"), icon: BarChart3, permission: "Reports", overlayPage: "Reports" },
{ name: "Map", url: createPageUrl("BodyshopMap"), icon: MapPin, permission: "Map", overlayPage: "BodyshopMap" }];

// Sidebar item looks, from the design system: resting, hover and the current item.
const NAV_BASE = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 md:justify-center md:px-2 lg:justify-start lg:px-3";
const NAV_REST = "text-white/70 hover:bg-white/[0.08] hover:text-white";
const NAV_ON = "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]";

/** The green dot on the current item, and the arrow on items that open over the page. */
const NavMarker = ({ active, opensOver }) => {
  if (active) return <span className="ml-auto h-[7px] w-[7px] flex-shrink-0 rounded-full bg-brand-green md:hidden lg:block" aria-hidden="true" />;
  if (opensOver) return <ArrowUpRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 opacity-50 md:hidden lg:block" aria-label="Opens over the page" />;
  return null;
};



/** Shown to a signed-in account that hasn't been given access to anything yet. */
function NoAccessScreen({ email }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-card">
        <Shield className="w-10 h-10 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-lg font-semibold mb-2">Your account isn't set up yet</h1>
        <p className="text-sm text-muted-foreground">
          {email ? <>You're signed in as <span className="font-medium text-foreground">{email}</span>, but </> : 'Your account '}
          hasn't been given access yet. Please contact RCM Automotive and we'll set it up.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm hover:bg-accent"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [claimDetailOpen, setClaimDetailOpen] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [overlayPage, setOverlayPage] = useState(null);
  const queryClient = useQueryClient();

  // Refresh reloads the data on screen, never the browser page, so open windows and
  // scroll positions stay where they are.
  // Full reload, as before round 2: some screens load their data outside the shared
  // query cache, so only a reload refreshes everything. The icon spins so it's clear
  // the click registered; the open claim stays open (its id is in the address).
  const [refreshing, setRefreshing] = useState(false);
  const refreshData = () => {
    setRefreshing(true);
    queryClient.cancelQueries();
    setTimeout(() => window.location.reload(), 150);
  };

  // Escape closes the top-most hand-built window (one whose backdrop is marked
  // data-overlay-dismiss), the same as the shared windows already do. A shared window
  // or menu that is open handles Escape itself, so nothing is closed twice.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // A window using useEscapeToClose closes itself.
      if (escapeWindowsOpen() > 0) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]')) return;
      const backdrops = document.querySelectorAll('[data-overlay-dismiss]');
      const top = backdrops[backdrops.length - 1];
      if (top) top.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Cmd+K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setClaimDetailOpen(document.body.classList.contains('claim-detail-open'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Close the quick-access overlay whenever the route changes
  useEffect(() => {
    setOverlayPage(null);
  }, [location.pathname]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const companyLogo = '/rcm-logo.png';

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5000),
    refetchInterval: messagesOpen ? 5000 : 60000,
    enabled: !!currentUser && currentUser.user_type === 'internal',
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
  // Who someone is decides which app they get: staff (user type internal) get this
  // one, portal users get their portal. A role never makes anyone staff — external
  // companies have their own admins — so admin roles only matter inside staff.
  const isInternalUser = currentUser?.user_type === 'internal';
  const isSuperAdmin = isInternalUser && userRole === 'super_admin';
  const isAdmin = isInternalUser && (userRole === 'super_admin' || userRole === 'company_admin' || userRole === 'admin');
  const canManagePermissions = isAdmin || currentUser?.can_manage_permissions;

  const departments = allDepartments.filter((dept) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    const userAccess = currentUser.departments_access || [];
    return userAccess.includes(dept.permission);
  });

  // Nothing of the staff app is drawn until we know who is signed in.
  if (!currentUser) {
    return <PageLoader />;
  }

  // Repairer/referrer/client routing
  if (currentUser.user_type === 'bodyshop' && currentPageName === 'RepairerPortal') {
    return <RepairerLayout>{children}</RepairerLayout>;
  }
  if (currentUser.user_type === 'bodyshop') {
    window.location.href = createPageUrl('RepairerPortal');
    return null;
  }
  const isReferrerUser = currentUser.user_type === 'referrer' || (!currentUser.user_type && currentUser.linked_referrer_id);
  if (isReferrerUser && currentPageName === 'ReferrerPortal') {
    return children;
  }
  if (isReferrerUser) {
    window.location.href = createPageUrl('ReferrerPortal');
    return null;
  }

  const isClientUser = currentUser.user_type === 'client';
  if (isClientUser && currentPageName === 'ClientPortal') {
    return children;
  }
  if (isClientUser) {
    window.location.href = createPageUrl('ClientPortal');
    return null;
  }

  // Anyone who is neither staff nor a set-up portal user (a new account whose type
  // hasn't been set yet, for example) sees no part of the app until staff set it up.
  if (!isInternalUser) {
    return <NoAccessScreen email={currentUser.email} />;
  }

  const userInitials = currentUser?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <StatusConfigProvider>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {isInternalUser &&
      <FloatingMessenger
        currentUser={currentUser}
        isOpen={messagesOpen}
        onClose={() => setMessagesOpen(false)} />

      }

      <div className="flex overflow-hidden app-height">

        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed inset-y-0 left-0 z-chrome flex flex-col
          w-56 fm-glass-chrome text-white
          transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${desktopSidebarOpen
            ? 'md:relative md:translate-x-0 md:flex-shrink-0 md:w-12 lg:w-56'
            : 'md:-translate-x-full'}
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
            <button
              onClick={() => setDesktopSidebarOpen(false)}
              className="ml-auto hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Hide sidebar"
              aria-label="Hide sidebar">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Phone-only shortcuts that used to sit in the bottom bar */}
            <div className="md:hidden pb-2 mb-2 border-b border-white/10 space-y-0.5">
              <button
                onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
                className={`w-full ${NAV_BASE} ${NAV_REST}`}>
                <Search className="w-4 h-4 flex-shrink-0" /><span>Search</span>
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); refreshData(); }}
                className={`w-full ${NAV_BASE} ${NAV_REST}`}>
                <RefreshCw className="w-4 h-4 flex-shrink-0" /><span>Refresh</span>
              </button>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70">
                <ThemeToggle /><span>Theme</span>
              </div>
            </div>
            {departments.map((dept) => {
              const isActive = location.pathname === dept.url;
              const isOn = isActive || overlayPage === dept.overlayPage;
              const cls = `${NAV_BASE} ${isOn ? NAV_ON : NAV_REST}`;
              if (dept.overlayPage) {
                return (
                  <button
                    key={dept.name}
                    onClick={() => { setOverlayPage(dept.overlayPage); setMobileMenuOpen(false); }}
                    title={dept.name}
                    className={cls}
                  >
                    <dept.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="md:hidden lg:block">{dept.name}</span>
                    <NavMarker active={isOn} opensOver />
                  </button>
                );
              }
              return (
                <Link
                  key={dept.name}
                  to={dept.url}
                  onClick={() => setMobileMenuOpen(false)}
                  title={dept.name}
                  className={cls}
                >
                  <dept.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="md:hidden lg:block">{dept.name}</span>
                  <NavMarker active={isActive} />
                </Link>
              );
            })}

            {/* Directories section */}
            {isInternalUser &&
            (() => {
              const dirLinks = [
                { name: "Repairers", url: createPageUrl("RepairerDirectory"), icon: Warehouse, overlayPage: "RepairerDirectory" },
                { name: "Insurers", url: createPageUrl("InsurerDirectory"), icon: Shield, overlayPage: "InsurerDirectory" },
                { name: "Credit repair", url: createPageUrl("CreditRepairDirectory"), icon: CreditCard, overlayPage: "CreditRepairDirectory" },
                { name: "Clients & third parties", url: createPageUrl("ClientDirectory"), icon: Users, overlayPage: "ClientDirectory" },
                { name: "Suppliers", url: createPageUrl("SupplierManagement"), icon: Truck, overlayPage: "SupplierManagement" },
                { name: "Referrers", url: "/admin/companies", icon: Handshake, overlayPage: "CompanyManagement" },
              ];
              const anyActive = dirLinks.some((d) => location.pathname === d.url);
              const open = directoriesOpen || anyActive;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => setDirectoriesOpen((v) => !v)}
                    title="Directories"
                    className={`w-full ${NAV_BASE} ${open ? 'text-white hover:bg-white/[0.08]' : NAV_REST}`}>
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="md:hidden lg:block flex-1 text-left">Directories</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform md:hidden lg:block ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && dirLinks.map((d) => {
                    const isActive = location.pathname === d.url;
                    const isOn = isActive || overlayPage === d.overlayPage;
                    return (
                      <button
                        key={d.name}
                        onClick={() => { setOverlayPage(d.overlayPage); setMobileMenuOpen(false); }}
                        title={d.name}
                        className={`${NAV_BASE} lg:pl-7 ${isOn ? NAV_ON : NAV_REST}`}>
                        <d.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="md:hidden lg:block text-left">{d.name}</span>
                        <NavMarker active={isOn} opensOver />
                      </button>
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
                  <p className="text-xs font-medium text-white/60 md:hidden lg:block">Management</p>
                  <div className="hidden md:block lg:hidden border-t border-white/10 mt-1" />
                </div>
                {isAdmin &&
              <>
                    <button onClick={() => { setOverlayPage("Settings"); setMobileMenuOpen(false); }}
                title="Settings"
                className={`${NAV_BASE} ${overlayPage === "Settings" ? NAV_ON : NAV_REST}`}>
                      <Settings className="w-4 h-4 flex-shrink-0" /><span className="md:hidden lg:block">Settings</span><NavMarker active={overlayPage === "Settings"} opensOver />
                    </button>
                    <Link to={createPageUrl("Archive")} onClick={() => setMobileMenuOpen(false)}
                title="Archive"
                className={`${NAV_BASE} ${location.pathname === createPageUrl("Archive") ? NAV_ON : NAV_REST}`}>
                      <Archive className="w-4 h-4 flex-shrink-0" /><span className="md:hidden lg:block">Archive</span>
                    </Link>

                    {isSuperAdmin &&
                <Link to={createPageUrl("FeedbackHub")} onClick={() => setMobileMenuOpen(false)}
                title="Feedback hub"
                className={`${NAV_BASE} ${location.pathname === createPageUrl("FeedbackHub") ? NAV_ON : NAV_REST}`}>
                        <MessageSquare className="w-4 h-4 flex-shrink-0" /><span className="md:hidden lg:block">Feedback hub</span>
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
                    <p className="text-xs text-white/70 truncate">{currentUser?.email || ''}</p>
                    <p className="text-xs text-white/60 truncate mt-0.5">Profile and sign out</p>
                  </div>
                </div>
              } />
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen &&
        <div data-overlay-dismiss
          className="fixed inset-0 z-[9998] fm-scrim md:hidden"
          onClick={() => setMobileMenuOpen(false)} />
        }

        {/* Desktop sidebar restore button (shown when sidebar hidden) */}
        {!desktopSidebarOpen && (
          <button
            onClick={() => setDesktopSidebarOpen(true)}
            className="hidden md:flex fixed top-2.5 left-2 z-chrome items-center justify-center w-8 h-8 rounded-lg fm-glass-chrome text-white shadow-raised hover:bg-[#1f2c63] transition-colors"
            title="Show sidebar"
            aria-label="Show sidebar">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ── MOBILE bottom tab bar (< md) ── */}
          {!claimDetailOpen &&
          <nav aria-label="Main" className="md:hidden fixed bottom-0 left-0 right-0 fm-glass-bar flex items-center justify-around px-2 safe-area-inset-bottom" style={{ height: '60px', zIndex: 1000 }}>
              {[
            { name: 'Repairs', url: createPageUrl('Claims'), icon: FileText },
            { name: 'Tasks', url: createPageUrl('Tasks'), icon: CheckSquare }].
            map((tab) =>
            <Link
              key={tab.name}
              to={tab.url}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 touch-manipulation min-w-[52px] min-h-[44px] ${location.pathname === tab.url ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  <tab.icon className="w-5 h-5" />
                  <span className="text-xs">{tab.name}</span>
                </Link>
            )}
              {isInternalUser &&
            <button onClick={() => setMessagesOpen((prev) => !prev)} className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-muted-foreground touch-manipulation min-w-[52px] min-h-[44px]">
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs">Messages</span>
                  {unreadMessagesCount > 0 &&
              <span className="absolute top-0 right-1 bg-info text-on-solid text-xs rounded-md min-w-[18px] h-[18px] px-1 flex items-center justify-center font-semibold">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
              }
                </button>
            }
              <div className="flex flex-col items-center justify-center gap-0.5 touch-manipulation min-w-[52px] min-h-[44px] text-muted-foreground">
                <Notifications />
                <span className="text-xs">Alerts</span>
              </div>
              <button onClick={() => setMobileMenuOpen((prev) => !prev)} className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 touch-manipulation min-w-[52px] min-h-[44px] ${mobileMenuOpen ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                <Menu className="w-5 h-5" />
                <span className="text-xs">Menu</span>
              </button>
              </nav>
          }

              {/* ── DESKTOP top bar (≥ md) ── */}
          {!claimDetailOpen &&
          <header className="hidden md:flex flex-shrink-0 fm-glass-bar items-center gap-3 px-5 relative z-30" style={{ height: '48px', minHeight: '48px' }}>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-8 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-[13px] text-ink-subtle transition-colors hover:bg-accent"
                aria-label="Search">
                <Search className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Search claims, registrations, people</span>
                <kbd className="hidden lg:inline text-xs font-sans text-muted-foreground">⌘K</kbd>
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Refresh"
                aria-label={refreshing ? 'Refreshing' : 'Refresh'}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-foreground' : ''}`} />
                </button>
                {isInternalUser &&
              <button
                onClick={() => setMessagesOpen(true)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Messages"
                aria-label="Messages">
                    <MessageSquare className="w-4 h-4" />
                    {unreadMessagesCount > 0 &&
                <span className="absolute -top-1 -right-1 bg-info text-on-solid text-xs rounded-md min-w-[18px] h-[18px] px-1 flex items-center justify-center font-semibold">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                }
                  </button>
              }
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors" title="Switch theme"><ThemeToggle /></div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors" title="Notifications"><Notifications /></div>
              </div>
            </header>
          }

          {/* Page content */}
          <main className="flex-1 overflow-hidden p-0 md:p-2 lg:p-4 min-h-0 relative pb-16 md:pb-2 lg:pb-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'auto' }}>
            <Suspense fallback={<PageLoader />}>{children}</Suspense>
          </main>
        </div>
      </div>
      <QuickAccessOverlay pageName={overlayPage} onClose={() => setOverlayPage(null)} />
    </StatusConfigProvider>);

}