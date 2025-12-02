import React, { useState } from "react";
import { Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusManagementTab from "../components/settings/StatusManagementTab";
import CompanyManagementTab from "../components/settings/CompanyManagementTab";
import PortalManagementTab from "../components/settings/PortalManagementTab";
import BrandingTab from "../components/settings/BrandingTab";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Import components for other tabs
import EmailTemplates from "./EmailTemplates";
import PartManufacturerConfigManagement from "./PartManufacturerConfigManagement";
import UserManagement from "./UserManagement";
import ChaserEmailSettings from "./ChaserEmailSettings";

export default function Settings() {
  const [activeMainTab, setActiveMainTab] = useState("branding");
  const [activeStatusTab, setActiveStatusTab] = useState("Claim");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const canManagePermissions = currentUser?.role === 'admin' || currentUser?.can_manage_permissions;

  const mainTabs = [
    { id: "branding", label: "Branding" },
    { id: "status", label: "Status Settings" },
    { id: "companies", label: "Companies" },
    { id: "portals", label: "Portal Management" },
    { id: "email", label: "Email Templates" },
    { id: "chasers", label: "Chaser Emails" },
    { id: "manufacturers", label: "Manufacturer Links" },
    { id: "users", label: "User Management", permission: canManagePermissions },
  ];

  const statusTabs = [
    { id: "Claim", label: "Claim Statuses" },
    { id: "Estimate", label: "Estimate Statuses" },
    { id: "Engineering", label: "Engineering Statuses" },
    { id: "Part", label: "Part Statuses" },
  ];

  const visibleMainTabs = mainTabs.filter(tab => tab.permission !== false);

  const mainTabComponents = {
    branding: <BrandingTab />,
    companies: <CompanyManagementTab />,
    portals: <PortalManagementTab />,
    email: <EmailTemplates />,
    chasers: <ChaserEmailSettings />,
    manufacturers: <PartManufacturerConfigManagement />,
    users: <UserManagement />,
  };

  return (
    <div className="space-y-4">
      <div className="neomorph p-4">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("Dashboard")}>
            <Button className="neomorph-flat p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-accent" />
            <div>
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-xs text-foreground-muted">Manage system configuration</p>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="border-b border-border pb-2">
          <div className="flex gap-2 overflow-x-auto">
            {visibleMainTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`neomorph-flat px-4 py-2 text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
                    activeMainTab === tab.id ? 'border-accent text-accent' : 'hover:border-accent'
                  }`}
                >
                  {tab.label}
                </button>
            ))}
          </div>
        </div>

        {/* Sub-Tabs for Status Settings */}
        {activeMainTab === 'status' && (
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`neomorph-flat px-3 py-1.5 text-xs whitespace-nowrap transition-all ${
                  activeStatusTab === tab.id ? 'border-accent text-accent bg-surface-elevated' : 'hover:border-accent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeMainTab === 'status' ? (
        <div className="neomorph p-4">
          <StatusManagementTab key={activeStatusTab} department={activeStatusTab} />
        </div>
      ) : (
        mainTabComponents[activeMainTab]
      )}
    </div>
  );
}