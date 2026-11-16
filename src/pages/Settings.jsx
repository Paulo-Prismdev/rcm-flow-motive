import React from "react";
import {
  ArrowLeft,
  Shield,
  Globe,
  Mail,
  Send,
  Users,
  CalendarDays,
  ChevronRight,
  Receipt,
  ClipboardCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusManagementTab from "../components/settings/StatusManagementTab";
import PortalManagementTab from "../components/settings/PortalManagementTab";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import EmailTemplates from "./EmailTemplates";
import UserManagement from "./UserManagement";
import ChaserEmailSettings from "./ChaserEmailSettings";
import InvoicingSettingsTab from "../components/settings/InvoicingSettingsTab";
import ExcessReviewTab from "../components/settings/ExcessReviewTab";
import CompanyIdLookup from "./CompanyIdLookup";
import EmployeeManagement from "./EmployeeManagement";

const STATUS_TYPES = ["Claim", "Estimate", "Engineering", "Part"];

// Same settings as before, in three groups instead of four single-item ones, each with
// a line saying what's inside. Who can see each one is unchanged (adminOnly / permission).
const SETTINGS_SECTIONS = [
  {
    title: "Claims",
    items: [
      { id: "status", label: "Statuses", hint: "The status lists for claims, estimates, engineering and parts", icon: Shield, adminOnly: false },
      { id: "chasers", label: "Chaser emails", hint: "Automatic chaser emails, their rules and the send log", icon: Send, adminOnly: true },
      { id: "invoicing", label: "Invoicing", hint: "Accounts email, invoicing timings, storage share and tracking start date", icon: Receipt, adminOnly: true },
      { id: "excess-review", label: "Excess review", hint: "Open claims holding a £0 excess, to check", icon: ClipboardCheck, adminOnly: true },
    ],
  },
  {
    title: "People and access",
    items: [
      { id: "users", label: "Users and permissions", hint: "Who can sign in and what they can see", icon: Users, permission: "canManage" },
      { id: "portals", label: "Portals", hint: "Portal access and advert banners", icon: Globe, adminOnly: true },
      { id: "employees", label: "Employees", hint: "Holiday requests, allowances and time off", icon: CalendarDays, adminOnly: false },
    ],
  },
  {
    title: "Communication",
    items: [
      { id: "email", label: "Email templates", hint: "The wording of the emails the app sends", icon: Mail, adminOnly: false },
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

  const isAdmin = (currentUser?.user_type === 'internal' && ['admin', 'super_admin', 'company_admin'].includes(currentUser?.role));
  const canManage = isAdmin || (currentUser?.user_type === 'internal' && currentUser?.can_manage_permissions);

  const visibleSections = SETTINGS_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.adminOnly) return isAdmin;
      if (item.permission === "canManage") return canManage;
      return true;
    }),
  })).filter(section => section.items.length > 0);

  const allItems = visibleSections.flatMap(s => s.items);
  const chosenItem = allItems.find(i => i.id === activeTab);
  // On a computer one setting is always showing (the first, until another is picked);
  // on a phone the list shows until one is opened.
  const desktopItem = chosenItem || allItems[0];

  const renderContent = (id) => {
    switch (id) {
      case "status":
        return (
          <div>
            <div role="group" aria-label="Which statuses" className="inline-flex flex-wrap gap-0.5 rounded-lg bg-muted p-0.5 mb-4">
              {STATUS_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveStatusTab(t)}
                  aria-pressed={activeStatusTab === t}
                  className={`h-7 px-3 rounded-md text-[13px] font-medium transition-colors ${
                    activeStatusTab === t
                      ? "bg-card text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "Part" ? "Parts" : t}
                </button>
              ))}
            </div>
            <StatusManagementTab key={activeStatusTab} department={activeStatusTab} />
          </div>
        );
      case "portals":     return <PortalManagementTab />;
      case "email":       return <EmailTemplates />;
      case "chasers":     return <ChaserEmailSettings />;
      case "invoicing":   return <InvoicingSettingsTab />;
      case "excess-review": return <ExcessReviewTab />;
      case "users":       return <UserManagement />;
      case "companyids":  return <CompanyIdLookup />;
      case "employees":   return <EmployeeManagement />;
      default:            return null;
    }
  };

  const ItemHeader = ({ item, onBack }) => (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to settings"
          className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-tight text-foreground">{item.label}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── The list: always on a computer; on a phone only until a setting is opened ── */}
      <aside className={`${chosenItem ? 'hidden lg:flex' : 'flex'} w-full lg:w-72 flex-shrink-0 flex-col overflow-hidden lg:border-r lg:border-border`}>
        <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-4 pb-2">
          <Link
            to={createPageUrl("Dashboard")}
            aria-label="Back to the dashboard"
            className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-page-title">Settings</h1>
        </div>
        <nav aria-label="Settings" className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-medium text-muted-foreground mb-1 px-2">{section.title}</h2>
              <div className="rounded-xl border border-border bg-card overflow-hidden lg:border-0 lg:bg-transparent lg:space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const onDesktop = desktopItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      aria-current={onDesktop ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-3 lg:py-2 text-left transition-colors border-b border-border last:border-b-0 lg:border-b-0 lg:rounded-lg
                        hover:bg-muted lg:hover:bg-accent
                        ${onDesktop ? 'lg:bg-primary lg:text-primary-foreground lg:hover:bg-primary' : ''}`}
                    >
                      <span className={`w-8 h-8 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${onDesktop ? 'bg-muted lg:bg-primary-foreground/15' : 'bg-muted'}`}>
                        <Icon className={`w-4 h-4 ${onDesktop ? 'text-muted-foreground lg:text-primary-foreground' : 'text-muted-foreground'}`} aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{item.label}</span>
                        <span className={`block text-xs truncate lg:hidden ${onDesktop ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{item.hint}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 lg:hidden" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── The chosen setting: beside the list on a computer; on a phone it replaces
            the list once opened, with a back arrow. Rendered once either way. ── */}
      {desktopItem && (
        <section className={`${chosenItem ? 'flex' : 'hidden lg:flex'} flex-1 min-w-0 flex-col overflow-hidden`}>
          <ItemHeader item={desktopItem} onBack={() => setActiveTab(null)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-5">{renderContent(desktopItem.id)}</main>
        </section>
      )}
    </div>
  );
}
