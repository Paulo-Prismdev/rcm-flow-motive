import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Copy, Check, Building2, Wrench, Package, User } from "lucide-react";

const TYPES = [
  { id: "referrer",  label: "Referrers",  icon: Building2, entity: "Referrer" },
  { id: "bodyshop",  label: "Bodyshops",  icon: Wrench,    entity: "Bodyshop" },
  { id: "supplier",  label: "Suppliers",  icon: Package,   entity: "Supplier" },
  { id: "client",    label: "Clients",    icon: User,      entity: "Client"   },
];

export default function CompanyIdLookup() {
  const [activeTab, setActiveTab] = useState("referrer");
  const [copied, setCopied] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const activeType = TYPES.find(t => t.id === activeTab);

  const { data: referrers = [] } = useQuery({ queryKey: ['Referrer'], queryFn: () => base44.entities.Referrer.list('name') });
  const { data: bodyshops = [] } = useQuery({ queryKey: ['Bodyshop'],  queryFn: () => base44.entities.Bodyshop.list('name')  });
  const { data: suppliers = [] } = useQuery({ queryKey: ['Supplier'],  queryFn: () => base44.entities.Supplier.list('name')  });
  const { data: clients   = [] } = useQuery({ queryKey: ['Client'],    queryFn: () => base44.entities.Client.list('name')    });

  const dataMap = { referrer: referrers, bodyshop: bodyshops, supplier: suppliers, client: clients };
  const records = dataMap[activeTab] || [];

  const isAdmin = ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);
  if (!isAdmin) return (
    <div className="neomorph p-8 text-center text-foreground-muted">Access denied.</div>
  );

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="neomorph p-4">
        <h1 className="text-xl font-bold mb-1">Company ID Lookup</h1>
        <p className="text-sm text-foreground-muted">Copy IDs to assign users to companies in the dashboard.</p>
      </div>

      {/* Tabs */}
      <div className="neomorph p-2 flex gap-1 overflow-x-auto">
        {TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === t.id
                  ? 'bg-accent text-accent-foreground shadow'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Records */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <div className="neomorph p-8 text-center text-foreground-muted">No {activeType?.label.toLowerCase()} found.</div>
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