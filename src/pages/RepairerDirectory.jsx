import React, { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Building2 } from "lucide-react";
import DirectoryShell from "@/components/shared/DirectoryShell";
import RepairerDetailDrawer from "@/components/repairer/RepairerDetailDrawer";
import AddBodyshopModal from "@/components/shared/AddBodyshopModal";
import { Plus } from "lucide-react";

export default function RepairerDirectory() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [acgFilter, setAcgFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: bodyshops = [], isLoading } = useQuery({
    queryKey: ["repairer-directory"],
    queryFn: () => base44.entities.Bodyshop.list("name", 500),
    staleTime: 60000,
  });

  const tiers = useMemo(() => {
    const set = new Set(bodyshops.map((b) => b.tier).filter(Boolean));
    return Array.from(set).sort();
  }, [bodyshops]);

  const sortedBodyshops = useMemo(() => {
    return [...bodyshops].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
    );
  }, [bodyshops]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sortedBodyshops.filter((b) => {
      const matchesSearch =
        !q ||
        b.name?.toLowerCase().includes(q) ||
        b.full_address?.toLowerCase().includes(q) ||
        b.town?.toLowerCase().includes(q) ||
        b.postcode?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.bodyshop_manager?.toLowerCase().includes(q);
      const matchesTier = tierFilter === "all" || b.tier === tierFilter;
      const matchesAcg = acgFilter === "all" || b.acg_signed_up === acgFilter;
      return matchesSearch && matchesTier && matchesAcg;
    });
  }, [sortedBodyshops, search, tierFilter, acgFilter]);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const { importBodyshopDirectory } = await import("@/functions/importBodyshopDirectory");
      const res = await importBodyshopDirectory({ file_url });
      const data = res.data;
      await queryClient.invalidateQueries({ queryKey: ["repairer-directory"] });
      alert(`Import complete: ${data.created} created, ${data.updated} updated`);
    } catch (err) {
      alert("Import failed: " + (err.message || "Unknown error"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filters = (
    <div className="flex gap-2">
      <select
        value={tierFilter}
        onChange={(e) => setTierFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm flex-1 sm:flex-none"
      >
        <option value="all">All Tiers</option>
        {tiers.map((t) => (<option key={t} value={t}>{t}</option>))}
      </select>
      <select
        value={acgFilter}
        onChange={(e) => setAcgFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm flex-1 sm:flex-none"
      >
        <option value="all">All ACG</option>
        <option value="Yes">ACG: Yes</option>
        <option value="No">ACG: No</option>
        <option value="TBC">ACG: TBC</option>
      </select>
    </div>
  );

  const headerExtra = (
    <>
      <button
        onClick={handleImportClick}
        disabled={importing}
        className="inline-flex items-center justify-center gap-2 rounded-md text-[13px] font-medium border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
      >
        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        <span className="hidden sm:inline">{importing ? "Importing..." : "Import Excel"}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileSelected}
      />
    </>
  );

  return (
    <>
      <DirectoryShell
        icon={Building2}
        title="Repairer Directory"
        count={`${filtered.length} of ${bodyshops.length} repairers`}
        addLabel="Add Repairer"
        onAdd={() => setShowAddModal(true)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, address, email, manager..."
        filters={filters}
        headerExtra={headerExtra}
      >
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No repairers found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map((b) => (
                <div key={b.id} onClick={() => setSelectedId(b.id)} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{b.name}</div>
                      {b.group_name && <div className="text-xs text-muted-foreground truncate">{b.group_name}</div>}
                    </div>
                    {b.tier ? (
                      <Badge className={`text-xs flex-shrink-0 ${
                        b.tier?.toUpperCase().includes("TIER 1") || b.tier?.toUpperCase() === "TIER1" ? "bg-green-100 text-green-700"
                        : b.tier?.toUpperCase().includes("TIER 2") || b.tier?.toUpperCase() === "TIER2" ? "bg-amber-100 text-amber-700"
                        : b.tier?.toLowerCase().includes("previously") ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                      }`}>{b.tier}</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {(b.town || b.postcode) && <span className="truncate">{[b.town, b.postcode].filter(Boolean).join(" ")}</span>}
                    {b.contact_name || b.bodyshop_manager ? <span className="truncate">{b.contact_name || b.bodyshop_manager}</span> : null}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {b.map_group && <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0">{b.map_group}</Badge>}
                    {b.acg_signed_up === "Yes" && <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">ACG: Yes</Badge>}
                    {b.acg_signed_up === "No" && <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">ACG: No</Badge>}
                    {b.bs10125_certified === "Yes" && <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">BS10125</Badge>}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet table */}
            <table className="hidden sm:table w-full">
              <thead className="sticky top-0 bg-card border-b border-border z-10">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Location</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Contact</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tier</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">ACG</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">BS10125</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} onClick={() => setSelectedId(b.id)} className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-sm">{b.name}</div>
                      {b.group_name && <div className="text-xs text-muted-foreground">{b.group_name}</div>}
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">{b.postcode || b.town || (b.full_address ? b.full_address.split(",").slice(-2).join(",").trim() : "—")}</td>
                    <td className="p-3 text-sm hidden lg:table-cell">
                      <div className="font-medium">{b.contact_name || b.bodyshop_manager || "—"}</div>
                      <div className="text-xs text-muted-foreground">{b.phone || b.email || ""}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1 items-start">
                        {b.tier ? (
                          <Badge className={`text-xs ${
                            b.tier?.toUpperCase().includes("TIER 1") || b.tier?.toUpperCase() === "TIER1" ? "bg-green-100 text-green-700"
                            : b.tier?.toUpperCase().includes("TIER 2") || b.tier?.toUpperCase() === "TIER2" ? "bg-amber-100 text-amber-700"
                            : b.tier?.toLowerCase().includes("previously") ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                          }`}>{b.tier}</Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                        {b.map_group && <Badge className="text-xs bg-violet-100 text-violet-700">{b.map_group}</Badge>}
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {b.acg_signed_up === "Yes" ? <Badge className="bg-green-100 text-green-700 text-xs">Yes</Badge>
                        : b.acg_signed_up === "No" ? <Badge className="bg-red-100 text-red-700 text-xs">No</Badge>
                        : <span className="text-xs text-muted-foreground">{b.acg_signed_up || "—"}</span>}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {b.bs10125_certified === "Yes" ? <Badge className="bg-green-100 text-green-700 text-xs">Yes</Badge>
                        : b.bs10125_certified === "No" ? <Badge className="bg-red-100 text-red-700 text-xs">No</Badge>
                        : <span className="text-xs text-muted-foreground">{b.bs10125_certified || "—"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </DirectoryShell>

      <RepairerDetailDrawer bodyshopId={selectedId} onClose={() => setSelectedId(null)} />
      <AddBodyshopModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async (newBodyshop) => {
          await queryClient.invalidateQueries({ queryKey: ["repairer-directory"] });
          setSelectedId(newBodyshop.id);
        }}
      />
    </>
  );
}