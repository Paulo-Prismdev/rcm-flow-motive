import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2, Phone, Mail, X, Building2 } from "lucide-react";
import AddInsurerModal from "../shared/AddInsurerModal";

const EMPTY = { name: "", contact_name: "", phone: "", email: "", claims_line: "", notes: "" };

export default function InsurerDirectoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // insurer object or null
  const [form, setForm] = useState(EMPTY);

  const { data: insurers = [], isLoading } = useQuery({
    queryKey: ["insurers"],
    queryFn: () => base44.entities.Insurer.list("name", 500),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["insurers"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Insurer.update(id, data),
    onSuccess: () => { invalidate(); setEditing(null); setForm(EMPTY); },
  });

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
        i.claims_line?.toLowerCase().includes(s)
    );
  }, [insurers, search]);

  const openEdit = (insurer) => {
    setEditing(insurer);
    setForm({
      name: insurer.name || "",
      contact_name: insurer.contact_name || "",
      phone: insurer.phone || "",
      email: insurer.email || "",
      claims_line: insurer.claims_line || "",
      notes: insurer.notes || "",
    });
  };

  const closeEdit = () => { setEditing(null); setForm(EMPTY); };

  const submitEdit = (e) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, data: form });
  };

  const handleDelete = (insurer) => {
    if (window.confirm(`Remove "${insurer.name}" from the insurer directory?`)) {
      deleteMutation.mutate(insurer.id);
    }
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-5xl mx-auto">
      <AddInsurerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { invalidate(); setShowAdd(false); }} />

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Edit Insurer</h2>
              <Button onClick={closeEdit} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Insurer Name *</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="neomorph-inset" required autoFocus />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Contact Name</label>
                <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="neomorph-inset" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Phone</label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="neomorph-inset" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Claims Line (Phone)</label>
                <Input value={form.claims_line} onChange={(e) => set("claims_line", e.target.value)} className="neomorph-inset" placeholder="Direct claims department number" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Notes</label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="neomorph-inset" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={closeEdit} variant="outline">Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
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
          placeholder="Search by name, contact, phone, email..."
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
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Claims Line</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">Loading insurers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">No insurers found</td></tr>
            ) : (
              filtered.map((ins) => (
                <tr key={ins.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ins.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{ins.contact_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{ins.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{ins.email || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{ins.claims_line || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(ins)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ins)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
          filtered.map((ins) => (
            <div key={ins.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{ins.name}</p>
                  {ins.contact_name && <p className="text-xs text-gray-500 truncate">{ins.contact_name}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(ins)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ins)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}