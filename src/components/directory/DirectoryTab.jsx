import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Phone, Mail, User, Building2, Loader2, Car, Receipt, Star } from "lucide-react";
import DirectoryShell from "@/components/shared/DirectoryShell";
import { isClientTagged, isThirdPartyTagged } from "@/components/shared/directoryTags";
import DirectoryTagPills from "./DirectoryTagPills";
import DirectoryDetailModal from "./DirectoryDetailModal";

/**
 * The one directory: clients and third parties together, each record tagged with
 * how it is used. The filter narrows to one tag; both tags can be on one record.
 */
const FILTERS = [
  { key: "all", label: "All", query: {} },
  { key: "client", label: "Clients", query: { is_client: { $ne: false } } },
  { key: "third_party", label: "Third parties", query: { is_third_party: true } },
];

const CACHE_KEY = "directory";

export default function DirectoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [detailId, setDetailId] = useState(null);
  const [adding, setAdding] = useState(false);

  const filter = FILTERS.find((f) => f.key === filterKey) || FILTERS[0];

  const { data: records = [], isLoading } = useQuery({
    queryKey: [CACHE_KEY, filterKey],
    queryFn: async () => {
      if (filterKey === "all") return (await base44.entities.Client.list("name", 1000)) || [];
      const page = await base44.entities.Client.filter(filter.query, { sort: "name", limit: 1000 });
      return page?.items || [];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: [CACHE_KEY, "counts"],
    queryFn: async () => {
      const [all, clients, thirdParties, both] = await Promise.all([
        base44.entities.Client.count({}),
        base44.entities.Client.count({ is_client: { $ne: false } }),
        base44.entities.Client.count({ is_third_party: true }),
        base44.entities.Client.count({ is_client: { $ne: false }, is_third_party: true }),
      ]);
      return { all, client: clients, third_party: thirdParties, both };
    },
  });

  const total = counts[filterKey] ?? 0;
  const detail = records.find((r) => r.id === detailId) || null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEY] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => invalidate(),
  });

  const primaryContact = (record) => {
    const contacts = record.contacts || [];
    return contacts.find((c) => c.is_primary) || contacts[0] || null;
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return records;
    return records.filter((r) => {
      const primary = primaryContact(r);
      return (
        r.name?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s) ||
        r.phone?.toLowerCase().includes(s) ||
        r.postcode?.toLowerCase().includes(s) ||
        r.town?.toLowerCase().includes(s) ||
        r.insurer?.toLowerCase().includes(s) ||
        r.vehicle_reg?.toLowerCase().includes(s) ||
        primary?.name?.toLowerCase().includes(s) ||
        primary?.email?.toLowerCase().includes(s) ||
        r.company_contact_name?.toLowerCase().includes(s)
      );
    });
  }, [records, search]);

  const handleDelete = (record) => {
    if (window.confirm(`Remove "${record.name}" from the directory?`)) deleteMutation.mutate(record.id);
  };

  const vehicleLine = (r) => [r.vehicle_reg, r.vehicle_make_model].filter(Boolean).join(" · ");

  const clientLine = (r) => {
    const primary = primaryContact(r);
    return isClientTagged(r) ? primary?.name || r.company_contact_name || "" : "";
  };

  const typeIcon = (r) => (r.client_type === "Company" ? <Building2 className="w-3.5 h-3.5 text-gray-400" /> : <User className="w-3.5 h-3.5 text-gray-400" />);

  const filters = (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => setFilterKey(f.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            filterKey === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {f.label}
          <span className="ml-1.5 font-normal opacity-80">{counts[f.key] ?? 0}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <DirectoryShell
        icon={User}
        title="Clients & Third Parties"
        count={
          counts.both
            ? `${filtered.length} of ${total} shown · ${counts.both} carry both tags`
            : `${filtered.length} of ${total} shown`
        }
        addLabel="Add"
        onAdd={() => setAdding(true)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, contact, phone, email, postcode, insurer, vehicle..."
        filters={filters}
      >
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No records found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map((r) => (
                <div key={r.id} onClick={() => setDetailId(r.id)} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {typeIcon(r)}
                        <span className="font-medium text-sm truncate">{r.name}</span>
                        <DirectoryTagPills record={r} />
                      </div>
                      {clientLine(r) && <div className="text-xs text-muted-foreground truncate mt-0.5">{clientLine(r)}</div>}
                      {isClientTagged(r) && r.handles_vat_excess === true && (
                        <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-semibold">
                          <Receipt className="w-2.5 h-2.5" /> VAT &amp; Excess handled
                        </span>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(r); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {r.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {r.phone}</span>}
                    {r.email && <span className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5" /> {r.email}</span>}
                    {isThirdPartyTagged(r) && vehicleLine(r) && <span className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> {vehicleLine(r)}</span>}
                    {r.postcode && <span>Postcode: {r.postcode}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full">
              <thead className="sticky top-0 bg-card border-b border-border z-10">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Type</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Contact</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Vehicle</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Postcode</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setDetailId(r.id)} className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="p-3 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {typeIcon(r)}
                        {r.name}
                        {isClientTagged(r) && r.handles_vat_excess === true && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-semibold whitespace-nowrap">
                            <Receipt className="w-2.5 h-2.5" /> VAT&amp;Excess
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3"><DirectoryTagPills record={r} /></td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{r.client_type || "Individual"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{clientLine(r) || "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{r.phone || primaryContact(r)?.phone || "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{r.email || primaryContact(r)?.email || "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{isThirdPartyTagged(r) ? vehicleLine(r) || "—" : "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{r.postcode || "—"}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(r)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </DirectoryShell>

      {adding && <DirectoryDetailModal record={null} onClose={() => setAdding(false)} onSaved={invalidate} />}
      {detail && <DirectoryDetailModal record={detail} onClose={() => setDetailId(null)} onSaved={invalidate} />}
    </>
  );
}