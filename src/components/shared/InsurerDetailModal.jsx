import React, { useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Pencil, Phone, Mail, Building2, Network, User, Plus, Trash2, Copy } from "lucide-react";

const buildForm = (insurer) => ({
  name: insurer.name || "",
  contact_name: insurer.contact_name || "",
  phone: insurer.phone || "",
  email: insurer.email || "",
  claims_line: insurer.claims_line || "",
  notes: insurer.notes || "",
  useful_contacts: insurer.useful_contacts || [],
  network_codes: insurer.network_codes || []
});

export default function InsurerDetailModal({ insurer, onClose, onUpdated }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(buildForm(insurer));
  const [newCode, setNewCode] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "" });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const applyToCache = (updated) => {
    queryClient.setQueryData(["insurers"], (old) =>
    Array.isArray(old) ? old.map((i) => i.id === updated.id ? updated : i) : old
    );
    queryClient.invalidateQueries({ queryKey: ["insurers"] });
  };

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Insurer.update(insurer.id, data),
    onSuccess: (updated) => {applyToCache(updated);onUpdated?.();setEditMode(false);},
    onError: (err) => toast({ title: "Save failed", description: err?.message || "Please try again", variant: "destructive" })
  });

  // Quick partial update (used by inline add/remove in read view)
  const quickMutation = useMutation({
    mutationFn: (data) => base44.entities.Insurer.update(insurer.id, data),
    onSuccess: (updated) => {applyToCache(updated);onUpdated?.();},
    onError: (err) => toast({ title: "Could not save", description: err?.message || "Please try again", variant: "destructive" })
  });

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const startEdit = () => {
    setForm(buildForm(insurer));
    setEditMode(true);
  };

  const submit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const contacts = insurer.useful_contacts || [];
  const codes = insurer.network_codes || [];

  const addCode = () => {
    const v = newCode.trim();
    if (!v || codes.includes(v)) {setNewCode("");return;}
    quickMutation.mutate({ network_codes: [...codes, v] });
    setNewCode("");
  };

  const removeCode = (code) => {
    quickMutation.mutate({ network_codes: codes.filter((c) => c !== code) });
  };

  const saveNewContact = () => {
    if (!newContact.name.trim() && !newContact.phone.trim() && !newContact.email.trim()) {
      setShowAddContact(false);
      return;
    }
    quickMutation.mutate({ useful_contacts: [...contacts, { ...newContact }] });
    setNewContact({ name: "", phone: "", email: "" });
    setShowAddContact(false);
  };

  const removeContact = (idx) => {
    quickMutation.mutate({ useful_contacts: contacts.filter((_, i) => i !== idx) });
  };

  const copyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: text });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const CopyBtn = ({ value }) =>
  <button
    type="button"
    onClick={() => copyText(value)}
    className="p-0.5 rounded hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 text-[hsl(var(--background))]"
    title="Copy">
    
      <Copy className="w-3 h-3" />
    </button>;


  const Field = ({ label, icon: Icon, copyValue, children }) =>
  <div className="group">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </p>
      <div className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
        <span className="min-w-0">{children}</span>
        {copyValue && <CopyBtn value={copyValue} />}
      </div>
    </div>;


  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <h2 className="text-xl font-bold truncate">
              {editMode ? "Edit Insurer" : insurer.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editMode &&
            <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            }
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {editMode ?
        <form onSubmit={submit} className="p-6 space-y-4">
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
              <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form> :

        <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Name" icon={User} copyValue={insurer.contact_name}>
                {insurer.contact_name || "—"}
              </Field>
              <Field label="Claims Line" icon={Phone} copyValue={insurer.claims_line}>
                {insurer.claims_line || "—"}
              </Field>
              <Field label="Phone" icon={Phone} copyValue={insurer.phone}>
                {insurer.phone || "—"}
              </Field>
              <Field label="Email" icon={Mail} copyValue={insurer.email}>
                {insurer.email ?
              <a href={`mailto:${insurer.email}`} className="text-primary hover:underline truncate block">
                    {insurer.email}
                  </a> :

              "—"
              }
              </Field>
            </div>

            {/* Useful Contacts — inline add/remove, no edit mode needed */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Useful Contacts</p>
              {contacts.length > 0 ?
            <div className="space-y-2">
                  {contacts.map((c, idx) =>
              <div key={idx} className="bg-muted/50 rounded-lg p-3 border border-border">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name || "—"}</p>
                        <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    disabled={quickMutation.isPending}
                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    title="Remove contact">
                    
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {c.phone &&
                  <span className="flex items-center gap-1.5">
                            <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                              <Phone className="w-3 h-3" /> {c.phone}
                            </a>
                            <button type="button" onClick={() => copyText(c.phone)} className="text-gray-300 hover:text-primary" title="Copy phone">
                              <Copy className="w-3 h-3" />
                            </button>
                          </span>
                  }
                        {c.email &&
                  <span className="flex items-center gap-1.5 truncate">
                            <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-primary truncate">
                              <Mail className="w-3 h-3" /> {c.email}
                            </a>
                            <button type="button" onClick={() => copyText(c.email)} className="text-gray-300 hover:text-primary" title="Copy email">
                              <Copy className="w-3 h-3" />
                            </button>
                          </span>
                  }
                      </div>
                    </div>
              )}
                </div> :

            <p className="text-sm text-gray-400 mb-2">No contacts added yet</p>
            }

              {showAddContact ?
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end p-3 rounded-lg border border-dashed border-border">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Name</label>
                    <Input value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} className="neomorph-inset" autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                    <Input value={newContact.phone} onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))} className="neomorph-inset" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Email</label>
                    <Input type="email" value={newContact.email} onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))} className="neomorph-inset" />
                  </div>
                  <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => {setShowAddContact(false);setNewContact({ name: "", phone: "", email: "" });}}>Cancel</Button>
                    <Button type="button" size="sm" onClick={saveNewContact} disabled={quickMutation.isPending}>
                      {quickMutation.isPending ? "Saving..." : "Save Contact"}
                    </Button>
                  </div>
                </div> :

            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setShowAddContact(true)}>
                  <Plus className="w-4 h-4" /> Add Contact
                </Button>
            }
            </div>

            {/* Network Codes — inline add/remove, no edit mode needed */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" /> Network Codes
              </p>
              {codes.length > 0 ?
            <div className="flex flex-wrap gap-1.5 mb-2">
                  {codes.map((code) =>
              <span key={code} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                      {code}
                      <button
                  type="button"
                  onClick={() => copyText(code)}
                  className="hover:text-primary/70 transition-colors"
                  title="Copy code">
                  
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                  type="button"
                  onClick={() => removeCode(code)}
                  disabled={quickMutation.isPending}
                  className="hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Remove code">
                  
                        <X className="w-3 h-3" />
                      </button>
                    </span>
              )}
                </div> :

            <p className="text-sm text-gray-400 mb-2">No network codes added yet</p>
            }
              <div className="flex gap-2">
                <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                onKeyDown={(e) => {if (e.key === "Enter") {e.preventDefault();addCode();}}}
                placeholder="Type a network code and press Enter"
                className="neomorph-inset" />
              
                <Button type="button" variant="outline" size="sm" onClick={addCode} disabled={quickMutation.isPending}>
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>

            {insurer.notes &&
          <Field label="Notes">
                <p className="whitespace-pre-wrap">{insurer.notes}</p>
              </Field>
          }
          </div>
        }
      </div>
    </div>,
    document.body
  );
}