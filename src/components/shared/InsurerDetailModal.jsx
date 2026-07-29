import React, { useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Pencil, Phone, Mail, Building2, Network, User } from "lucide-react";
import InsurerContactsEditor from "./InsurerContactsEditor";
import NetworkCodesEditor from "./NetworkCodesEditor";

export default function InsurerDetailModal({ insurer, onClose, onUpdated }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: insurer.name || "",
    contact_name: insurer.contact_name || "",
    phone: insurer.phone || "",
    email: insurer.email || "",
    claims_line: insurer.claims_line || "",
    notes: insurer.notes || "",
    useful_contacts: insurer.useful_contacts || [],
    network_codes: insurer.network_codes || [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Insurer.update(insurer.id, data),
    onSuccess: () => {
      onUpdated?.();
      setEditMode(false);
    },
  });

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const contacts = insurer.useful_contacts || [];
  const codes = insurer.network_codes || [];

  const Field = ({ label, icon: Icon, children }) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </p>
      <div className="text-sm text-gray-900 dark:text-white">{children}</div>
    </div>
  );

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
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {editMode ? (
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
              <label className="block text-sm text-muted-foreground mb-1.5">Useful Contacts</label>
              <InsurerContactsEditor value={form.useful_contacts} onChange={(v) => set("useful_contacts", v)} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Network Codes</label>
              <NetworkCodesEditor value={form.network_codes} onChange={(v) => set("network_codes", v)} />
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
          </form>
        ) : (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Name" icon={User}>
                {insurer.contact_name || "—"}
              </Field>
              <Field label="Claims Line" icon={Phone}>
                {insurer.claims_line || "—"}
              </Field>
              <Field label="Phone" icon={Phone}>
                {insurer.phone || "—"}
              </Field>
              <Field label="Email" icon={Mail}>
                {insurer.email ? (
                  <a href={`mailto:${insurer.email}`} className="text-primary hover:underline truncate block">
                    {insurer.email}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
            </div>

            {contacts.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Useful Contacts</p>
                <div className="space-y-2">
                  {contacts.map((c, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3 border border-border">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name || "—"}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-primary truncate">
                            <Mail className="w-3 h-3" /> {c.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" /> Network Codes
              </p>
              {codes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {codes.map((code) => (
                    <span key={code} className="inline-flex items-center bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                      {code}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>

            {insurer.notes && (
              <Field label="Notes">
                <p className="whitespace-pre-wrap">{insurer.notes}</p>
              </Field>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}