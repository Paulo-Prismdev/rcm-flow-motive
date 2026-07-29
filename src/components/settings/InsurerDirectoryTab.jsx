import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, Phone, Mail, Building2 } from "lucide-react";
import AddInsurerModal from "../shared/AddInsurerModal";
import InsurerDetailModal from "../shared/InsurerDetailModal";

export default function InsurerDirectoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState(null); // insurer object or null

  const { data: insurers = [], isLoading } = useQuery({
    queryKey: ["insurers"],
    queryFn: () => base44.entities.Insurer.list("name", 500),
  });

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
    <div className="max-w-5xl mx-auto">
      <AddInsurerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { invalidate(); setShowAdd(false); }} />

      {detail && (
        <InsurerDetailModal
          insurer={detail}
          onClose={() => setDetail(null)}
          onUpdated={invalidate}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Insurer Directory</h2>
          <span className="text-xs text-gray-400">({filtered.length})</span>
        </div>
        <Button onClick={() => setShowAdd(true)} className="self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Insurer
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, contact, phone, email, network code..."
        />
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Insurer</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Contact</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Phone</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Email</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Network Codes</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">Loading insurers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">No insurers found</td></tr>
            ) : (
              filtered.map((ins) => {
                const codes = ins.network_codes || [];
                return (
                  <tr
                    key={ins.id}
                    onClick={() => setDetail(ins)}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ins.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{ins.contact_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{ins.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{ins.email || "—"}</td>
                    <td className="px-4 py-3">
                      {codes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {codes.slice(0, 3).map((c) => (
                            <span key={c} className="inline-flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                              {c}
                            </span>
                          ))}
                          {codes.length > 3 && (
                            <span className="text-xs text-gray-400">+{codes.length - 3} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleDelete(ins)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center text-sm text-gray-400 py-8">Loading insurers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">No insurers found</div>
        ) : (
          filtered.map((ins) => {
            const codes = ins.network_codes || [];
            return (
              <div
                key={ins.id}
                onClick={() => setDetail(ins)}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{ins.name}</p>
                    {ins.contact_name && <p className="text-xs text-gray-500 truncate">{ins.contact_name}</p>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ins); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  {ins.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {ins.phone}
                    </div>
                  )}
                  {ins.email && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {ins.email}
                    </div>
                  )}
                  {ins.claims_line && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> Claims: {ins.claims_line}
                    </div>
                  )}
                </div>
                {codes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {codes.map((c) => (
                      <span key={c} className="inline-flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}