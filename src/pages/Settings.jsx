import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  ArrowLeft,
  Shield,
  Building2,
  Globe,
  Mail,
  Send,
  Package,
  Users,
  Hash,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusManagementTab from "../components/settings/StatusManagementTab";
import CompanyManagementTab from "../components/settings/CompanyManagementTab";
import PortalManagementTab from "../components/settings/PortalManagementTab";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import EmailTemplates from "./EmailTemplates";
import UserManagement from "./UserManagement";
import ChaserEmailSettings from "./ChaserEmailSettings";
import SupplierManagement from "./SupplierManagement";
import CompanyIdLookup from "./CompanyIdLookup";
import EmployeeManagement from "./EmployeeManagement";

const STATUS_TYPES = ["Claim", "Estimate", "Engineering", "Part"];

const NAV_ITEMS = [
  { id: "status",      label: "Status Settings",      icon: Shield,        adminOnly: false },
  { id: "companies",   label: "Companies",             icon: Building2,     adminOnly: false },
  { id: "portals",     label: "Portal Management",     icon: Globe,         adminOnly: true  },
  { id: "email",       label: "Email Templates",       icon: Mail,          adminOnly: false },
  { id: "chasers",     label: "Chaser Emails",         icon: Send,          adminOnly: true  },
  { id: "suppliers",   label: "Suppliers",             icon: Package,       adminOnly: false },
  { id: "users",       label: "User Management",       icon: Users,         permission: "canManage" },
  { id: "companyids",  label: "Company ID Lookup",     icon: Hash,          adminOnly: true  },
  { id: "employees",   label: "Employee Management",   icon: CalendarDays,  adminOnly: false },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("status");
  const [activeStatusTab, setActiveStatusTab] = useState("Claim");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = ['admin', 'super_admin', 'company_admin'].includes(currentUser?.role);
  const canManage = isAdmin || currentUser?.can_manage_permissions;

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (item.permission === "canManage") return canManage;
    return true;
  });

  const activeItem = visibleNav.find(i => i.id === activeTab) || visibleNav[0];

  const renderContent = () => {
    switch (activeTab) {
      case "status":
        return (
          <div>
            <div className="flex gap-2 flex-wrap mb-4">
              {STATUS_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveStatusTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    activeStatusTab === t
                      ? "bg-[#131d47] text-white border-[#131d47]"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {t} Statuses
                </button>
              ))}
            </div>
            <StatusManagementTab key={activeStatusTab} department={activeStatusTab} />
          </div>
        );
      case "companies":   return <CompanyManagementTab />;
      case "portals":     return <PortalManagementTab />;
      case "email":       return <EmailTemplates />;
      case "chasers":     return <ChaserEmailSettings />;
      case "suppliers":   return <SupplierManagement />;
      case "users":       return <UserManagement />;
      case "companyids":  return <CompanyIdLookup />;
      case "employees":   return <EmployeeManagement />;
      default:            return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link to={createPageUrl("Dashboard")} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <SettingsIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>
        {/* Mobile: show active tab label + toggle */}
        <button
          className="lg:hidden flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setMobileNavOpen(p => !p)}
        >
          {activeItem?.label}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${mobileNavOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileNavOpen && (
        <div className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-1 px-2">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? "bg-[#131d47] text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body: sidebar + content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto py-2 px-2 gap-0.5">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? "bg-[#131d47] text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}