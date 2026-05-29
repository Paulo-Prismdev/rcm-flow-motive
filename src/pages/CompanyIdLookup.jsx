import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Copy, Check, Building2, Wrench, Package, User } from "lucide-react";

const TYPE_LABELS = {
  platform_owner: { label: "Platform Owner", icon: Building2 },
  referrer:       { label: "Referrer",        icon: Building2 },
  repairer:       { label: "Repairer",        icon: Wrench    },
};

export default function CompanyIdLookup() {
  const [activeTab, setActiveTab] = useState("repairer");
  const [copied, setCopied] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['Company'],
    queryFn: () => base44.entities.Company.list('name'),
  });

  const isAdmin = ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);
  if (!isAdmin) return (
    <div className="neomorph p-8 text-center text-foreground-muted">Access denied.</div>
  );

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const allTypes = [...new Set(companies.map(c => c.company_type).filter(Boolean))];
  const records = companies.filter(c => c.company_type === activeTab);

  return (
    <div className="space-y-4 p-4">
      <div className="neomorph p-4">
        <h1 className="text-xl font-bold mb-1">Company ID Lookup</h1>
        <p className="text-sm text-foreground-muted">Copy IDs to assign users to companies in the dashboard.</p>
      </div>

      {/* Tabs */}
      <div className="neomorph p-2 flex gap-1 overflow-x-auto">
        {allTypes.map(type => {
          const meta = TYPE_LABELS[type] || { label: type, icon: Building2 };
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 capitalize ${
                activeTab === type
                  ? 'bg-accent text-accent-foreground shadow'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Records */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <div className="neomorph p-8 text-center text-foreground-muted">No companies of this type found.</div>
        ) : (
          records.map(record => (
            <div key={record.id} className="neomorph-flat p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{record.name}</p>
                <p className="text-xs text-foreground-muted font-mono mt-0.5 truncate">{record.id}</p>
              </div>
              <button
                onClick={() => handleCopy(record.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover transition-all flex-shrink-0"
              >
                {copied === record.id ? (
                  <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy ID</>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}