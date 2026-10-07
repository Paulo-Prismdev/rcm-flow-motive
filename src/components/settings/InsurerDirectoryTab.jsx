import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Phone, Mail, Building2, Loader2 } from "lucide-react";
import DirectoryShell from "../shared/DirectoryShell";
import AddInsurerModal from "../shared/AddInsurerModal";
import InsurerDetailModal from "../shared/InsurerDetailModal";

export default function InsurerDirectoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const { data: insurers = [], isLoading } = useQuery({
    queryKey: ["insurers"],
    queryFn: () => base44.entities.Insurer.list("name", 500),
  });

  const detail = insurers.find((i) => i.id === detailId) || null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["insurers"] });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Insurer.delete(id),
    onSuccess: () => invalidate(),
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return insurers;
    return insurers.filter(
      (i) =>
        i.name?.toLowerCase().includes(s) ||
        i.contact_name?.toLowerCase().includes(s) ||
        i.email?.toLowerCase().includes(s) ||
        i.phone?.toLowerCase().includes(s) ||
        i.claims_line?.toLowerCase().includes(s) ||
        (i.network_codes || []).some((c) => c.toLowerCase().includes(s)) ||
        (i.useful_contacts || []).some(
          (c) =>
            c.name?.toLowerCase().includes(s) ||
            c.phone?.toLowerCase().includes(s) ||
            c.email?.toLowerCase().includes(s)
        )
    );
  }, [insurers, search]);

  const handleDelete = (insurer) => {
    if (window.confirm(`Remove "${insurer.name}" from the insurer directory?`)) {
      deleteMutation.mutate(insurer.id);
    }
  };

  return (
    <>
      <DirectoryShell
        icon={Building2}
        title="Insurer Directory"
        count={`${filtered.length} of ${insurers.length} insurers`}
        addLabel="Add Insurer"
        onAdd={() => setShowAdd(true)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, contact, phone, email, network code..."
      >
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No insurers found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map((ins) => {
                const codes = ins.network_codes || [];
                return (
                  <div
                    key={ins.id}
                    onClick={() => setDetailId(ins.id)}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{ins.name}</div>
                        {ins.contact_name && <div className="text-xs text-muted-foreground truncate">{ins.contact_name}</div>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(ins); }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {ins.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {ins.phone}</span>}
                      {ins.email && <span className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5" /> {ins.email}</span>}
                      {ins.claims_line && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Claims: {ins.claims_line}</span>}
                    </div>
                    {codes.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {codes.map((c) => (
                          <span key={c} className="inline-flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-medium">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full">
              <thead className="sticky top-0 bg-card border-b border-border z-10">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insurer</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Contact</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Phone</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Network Codes</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ins) => {
                  const codes = ins.network_codes || [];
                  return (
                    <tr
                      key={ins.id}
                      onClick={() => setDetailId(ins.id)}
                      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 text-sm font-medium">{ins.name}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{ins.contact_name || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{ins.phone || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{ins.email || "—"}</td>
                      <td className="p-3">
                        {codes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {codes.slice(0, 3).map((c) => (
                              <span key={c} className="inline-flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">{c}</span>
                            ))}
                            {codes.length > 3 && <span className="text-xs text-muted-foreground">+{codes.length - 3} more</span>}
                          </div>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(ins)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </DirectoryShell>

      <AddInsurerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { invalidate(); setShowAdd(false); }} />
      {detail && <InsurerDetailModal insurer={detail} onClose={() => setDetailId(null)} onUpdated={invalidate} />}
    </>
  );
}