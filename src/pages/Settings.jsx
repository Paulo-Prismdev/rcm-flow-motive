import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  ArrowLeft,
  Shield,
  Building2,
  Globe,
  Mail,
  Send,
  Users,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusManagementTab from "../components/settings/StatusManagementTab";
import CompanyManagement from "./CompanyManagement";
import PortalManagementTab from "../components/settings/PortalManagementTab";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import EmailTemplates from "./EmailTemplates";
import UserManagement from "./UserManagement";
import ChaserEmailSettings from "./ChaserEmailSettings";
import CompanyIdLookup from "./CompanyIdLookup";
import EmployeeManagement from "./EmployeeManagement";
import InsurerDirectoryTab from "../components/settings/InsurerDirectoryTab";

const STATUS_TYPES = ["Claim", "Estimate", "Engineering", "Part"];

const SETTINGS_SECTIONS = [
  {
    title: "Core Settings",
    items: [
      { id: "status", label: "Status Settings", icon: Shield, adminOnly: false },
      { id: "companies", label: "Companies", icon: Building2, adminOnly: false },
      { id: "insurers", label: "Insurer Directory", icon: Shield, adminOnly: false },
    ],
  },
  {
    title: "Administration",
    items: [
      { id: "portals", label: "Portal Management", icon: Globe, adminOnly: true },
      { id: "chasers", label: "Chaser Emails", icon: Send, adminOnly: true },
      { id: "users", label: "User Management", icon: Users, permission: "canManage" },

    ],
  },
  {
    title: "Communication",
    items: [
      { id: "email", label: "Email Templates", icon: Mail, adminOnly: false },
    ],
  },
  {
    title: "HR",
    items: [
      { id: "employees", label: "Employee Management", icon: CalendarDays, adminOnly: false },
    ],
  },
];

export default function Settings() {
  const [activeTab, setActiveTab] = React.useState(null);
  const [activeStatusTab, setActiveStatusTab] = React.useState("Claim");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = ['admin', 'super_admin', 'company_admin'].includes(currentUser?.role);
  const canManage = isAdmin || currentUser?.can_manage_permissions;

  const getVisibleSections = () => {
    return SETTINGS_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.adminOnly) return isAdmin;
        if (item.permission === "canManage") return canManage;
        return true;
      }),
    })).filter(section => section.items.length > 0);
  };

  const visibleSections = getVisibleSections();
  const activeItem = visibleSections.flatMap(s => s.items).find(i => i.id === activeTab);

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
      case "companies":   return <CompanyManagement />;
      case "insurers":    return <InsurerDirectoryTab />;
      case "portals":     return <PortalManagementTab />;
      case "email":       return <EmailTemplates />;
      case "chasers":     return <ChaserEmailSettings />;
      case "users":       return <UserManagement />;
      case "companyids":  return <CompanyIdLookup />;
      case "employees":   return <EmployeeManagement />;
      default:            return null;
    }
  };

  if (activeTab && activeItem) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setActiveTab(null)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <activeItem.icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{activeItem.label}</h1>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
          {renderContent()}
        </main>
      </div>
    );
  }

  // Main settings list (iOS style)
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Dashboard")} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <SettingsIcon className="w-5 h-5 text-gray-500" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>
      </div>

      {/* Settings List */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6 max-w-2xl mx-auto">
          {visibleSections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                {section.title}
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {section.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isLast = itemIdx === section.items.length - 1;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}