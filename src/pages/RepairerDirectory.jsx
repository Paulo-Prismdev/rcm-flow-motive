import React, { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Loader2, Upload, Filter } from "lucide-react";
import RepairerDetailDrawer from "@/components/repairer/RepairerDetailDrawer";

export default function RepairerDirectory() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [acgFilter, setAcgFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [importing, setImporting] = useState(false);
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div>
          <h1 className="text-page-title flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Repairer Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} of {bodyshops.length} repairers
          </p>
        </div>
        <Button onClick={handleImportClick} disabled={importing} variant="outline" size="sm">
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? "Importing..." : "Import Excel"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, address, email, manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="all">All Tiers</option>
          {tiers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={acgFilter}
          onChange={(e) => setAcgFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="all">All ACG</option>
          <option value="Yes">ACG: Yes</option>
          <option value="No">ACG: No</option>
          <option value="TBC">ACG: TBC</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No repairers found</div>
        ) : (
          <table className="w-full">
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
                <tr
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <div className="font-medium text-sm">{b.name}</div>
                    {b.group_name && <div className="text-xs text-muted-foreground">{b.group_name}</div>}
                  </td>
                  <td className="p-3 text-sm hidden md:table-cell">
                    {b.postcode || b.town || (b.full_address ? b.full_address.split(",").slice(-2).join(",").trim() : "—")}
                  </td>
                  <td className="p-3 text-sm hidden lg:table-cell">
                    <div className="font-medium">{b.contact_name || b.bodyshop_manager || "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.phone || b.email || ""}</div>
                  </td>
                  <td className="p-3">
                    {b.tier ? (
                      <Badge className={`text-xs ${
                        b.tier?.toUpperCase().includes("TIER 1") || b.tier?.toUpperCase() === "TIER1" ? "bg-green-100 text-green-700"
                        : b.tier?.toUpperCase().includes("TIER 2") || b.tier?.toUpperCase() === "TIER2" ? "bg-amber-100 text-amber-700"
                        : b.tier?.toLowerCase().includes("previously") ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                      }`}>{b.tier}</Badge>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {b.acg_signed_up === "Yes" ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">Yes</Badge>
                    ) : b.acg_signed_up === "No" ? (
                      <Badge className="bg-red-100 text-red-700 text-xs">No</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{b.acg_signed_up || "—"}</span>
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {b.bs10125_certified === "Yes" ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">Yes</Badge>
                    ) : b.bs10125_certified === "No" ? (
                      <Badge className="bg-red-100 text-red-700 text-xs">No</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{b.bs10125_certified || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RepairerDetailDrawer bodyshopId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}