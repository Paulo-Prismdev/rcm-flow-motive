import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Phone, Mail, User, Building2, Pencil, X, Star, Plus, Receipt } from "lucide-react";
import { createPortal } from "react-dom";
import { isClientTagged, isThirdPartyTagged } from "@/components/shared/directoryTags";
import { syncClaimVatExcess } from "@/components/shared/syncClaimVatExcess";
import DirectoryTagPills from "./DirectoryTagPills";

const EMPTY_FORM = {
  name: "",
  client_type: "Individual",
  is_client: true,
  is_third_party: false,
  phone: "",
  email: "",
  contacts: [],
  address_line_1: "",
  address_line_2: "",
  town: "",
  county: "",
  postcode: "",
  vat_status: "Unknown",
  handles_vat_excess: false,
  insurer: "",
  policy_number: "",
  vehicle_reg: "",
  vehicle_make_model: "",
  notes: "",
};

const TAG_BUTTONS = [
  { key: "client", label: "Client", field: "is_client", on: isClientTagged },
  { key: "third_party", label: "Third Party", field: "is_third_party", on: isThirdPartyTagged },
];

/**
 * One directory record: viewed, edited, or created. The role tags decide which
 * settings are shown — VAT and excess handling and the business contacts belong to
 * a client, the insurer and vehicle details to a third party.
 */
export default function DirectoryDetailModal({ record, onClose, onSaved }) {
  const isNew = !record;
  const [formData, setFormData] = useState(record ? { ...EMPTY_FORM, ...record } : EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(isNew);

  const saveMutation = useMutation({
    mutationFn: (data) => (isNew ? base44.entities.Client.create(data) : base44.entities.Client.update(record.id, data)),
    onSuccess: async (saved) => {
      // A record that is no longer a client never keeps a VAT & excess setting.
      const stillClient = isClientTagged(saved || formData);
      const wasHandled = record?.handles_vat_excess === true;
      const nowHandled = formData.handles_vat_excess === true && stillClient;
      if (wasHandled !== nowHandled) {
        await syncClaimVatExcess({ id: saved?.id || record?.id, name: formData.name, handles_vat_excess: nowHandled });
      }
      onSaved();
      if (isNew) onClose();
      else setIsEditing(false);
    },
  });

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const toggleTag = (button) => {
    const on = button.on(formData);
    const other = TAG_BUTTONS.find((b) => b.key !== button.key).on(formData);
    if (on && !other) return; // a record is always a client, a third party, or both
    const next = { ...formData, [button.field]: !on };
    if (button.key === "client" && on) {
      next.handles_vat_excess = false;
      next.vat_status = "Unknown";
    }
    setFormData(next);
  };

  const addContact = () => set("contacts", [...(formData.contacts || []), { name: "", position: "", email: "", phone: "", is_primary: !(formData.contacts || []).length }]);
  const updateContact = (idx, field, value) => set("contacts", (formData.contacts || []).map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  const removeContact = (idx) => set("contacts", (formData.contacts || []).filter((_, i) => i !== idx));
  const setPrimaryContact = (idx) => set("contacts", (formData.contacts || []).map((c, i) => ({ ...c, is_primary: i === idx })));

  const isCompany = formData.client_type === "Company";
  const client = isClientTagged(formData);
  const thirdParty = isThirdPartyTagged(formData);

  const tagRow = (
    <div>
      <label className="block text-sm text-muted-foreground mb-1">This record is</label>
      <div className="flex gap-2">
        {TAG_BUTTONS.map((button) => {
          const on = button.on(formData);
          return (
            <button
              key={button.key}
              type="button"
              onClick={() => toggleTag(button)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}
            >
              {button.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Tags follow how the record is used on claims, and can be changed here. A record is always at least one of the two.
      </p>
    </div>
  );

  const sharedFields = (
    <>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Type</label>
        <div className="flex gap-2">
          {["Individual", "Company"].map((type) => (
            <button key={type} type="button" onClick={() => set("client_type", type)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${formData.client_type === type ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}>
              {type === "Individual" ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              {type}
            </button>
          ))}
        </div>
      </div>
      <div><label className="block text-sm text-muted-foreground mb-1">{isCompany ? "Company Name *" : "Full Name *"}</label><Input value={formData.name || ""} onChange={(e) => set("name", e.target.value)} className="neomorph-inset" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm text-muted-foreground mb-1">Phone</label><Input value={formData.phone || ""} onChange={(e) => set("phone", e.target.value)} className="neomorph-inset" /></div>
        <div><label className="block text-sm text-muted-foreground mb-1">Email</label><Input type="email" value={formData.email || ""} onChange={(e) => set("email", e.target.value)} className="neomorph-inset" /></div>
      </div>
      <div><label className="block text-sm text-muted-foreground mb-1">Address Line 1</label><Input value={formData.address_line_1 || ""} onChange={(e) => set("address_line_1", e.target.value)} className="neomorph-inset" /></div>
      <Input value={formData.address_line_2 || ""} onChange={(e) => set("address_line_2", e.target.value)} className="neomorph-inset" placeholder="Address line 2" />
      <div className="grid grid-cols-3 gap-3">
        <Input value={formData.town || ""} onChange={(e) => set("town", e.target.value)} className="neomorph-inset" placeholder="Town" />
        <Input value={formData.county || ""} onChange={(e) => set("county", e.target.value)} className="neomorph-inset" placeholder="County" />
        <Input value={formData.postcode || ""} onChange={(e) => set("postcode", e.target.value.toUpperCase())} className="neomorph-inset" placeholder="Postcode" />
      </div>
    </>
  );

  const clientFields = (
    <div className="border-t pt-4 space-y-4">
      <h3 className="text-sm font-semibold">Client settings</h3>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">VAT Status</label>
        <select value={formData.vat_status || "Unknown"} onChange={(e) => set("vat_status", e.target.value)} className="w-full px-3 py-2 text-sm rounded-[10px] border border-input bg-card text-foreground">
          <option>Unknown</option><option>VAT Registered</option><option>Non-VAT</option>
        </select>
      </div>
      <label className="flex items-start gap-2.5 rounded-[10px] border border-border bg-muted/30 p-3 cursor-pointer">
        <input type="checkbox" checked={formData.handles_vat_excess === true} onChange={(e) => set("handles_vat_excess", e.target.checked)} className="mt-0.5 rounded border-border" />
        <span>
          <span className="block text-sm font-medium">We handle their VAT and excess</span>
          <span className="block text-xs text-muted-foreground">Their claims automatically show the VAT &amp; Excess invoice items in the Financials tracker.</span>
        </span>
      </label>
      {isCompany && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Contacts at the business</h3>
            <Button type="button" variant="outline" size="sm" onClick={addContact}><Plus className="w-3.5 h-3.5 mr-1" />Add Contact</Button>
          </div>
          {(formData.contacts || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No contacts added yet.</p>
          ) : (
            <div className="space-y-3">
              {(formData.contacts || []).map((contact, idx) => (
                <div key={idx} className="rounded-lg border border-border p-3 space-y-2 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setPrimaryContact(idx)} className={`flex items-center gap-1 text-xs font-medium ${contact.is_primary ? "text-amber-600" : "text-muted-foreground hover:text-amber-500"}`} title={contact.is_primary ? "Primary contact" : "Set as primary"}>
                      <Star className={`w-3.5 h-3.5 ${contact.is_primary ? "fill-amber-500 text-amber-500" : ""}`} />{contact.is_primary ? "Primary" : "Set primary"}
                    </button>
                    <button type="button" onClick={() => removeContact(idx)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Name" value={contact.name || ""} onChange={(e) => updateContact(idx, "name", e.target.value)} className="neomorph-inset" />
                    <Input placeholder="Position / Role" value={contact.position || ""} onChange={(e) => updateContact(idx, "position", e.target.value)} className="neomorph-inset" />
                    <Input placeholder="Email" type="email" value={contact.email || ""} onChange={(e) => updateContact(idx, "email", e.target.value)} className="neomorph-inset" />
                    <Input placeholder="Phone" value={contact.phone || ""} onChange={(e) => updateContact(idx, "phone", e.target.value)} className="neomorph-inset" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const thirdPartyFields = (
    <div className="border-t pt-4 space-y-4">
      <h3 className="text-sm font-semibold">Third party details</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm text-muted-foreground mb-1">Their Insurer</label><Input value={formData.insurer || ""} onChange={(e) => set("insurer", e.target.value)} className="neomorph-inset" /></div>
        <div><label className="block text-sm text-muted-foreground mb-1">Their Policy Number</label><Input value={formData.policy_number || ""} onChange={(e) => set("policy_number", e.target.value)} className="neomorph-inset" /></div>
        <div><label className="block text-sm text-muted-foreground mb-1">Their Vehicle Registration</label><Input value={formData.vehicle_reg || ""} onChange={(e) => set("vehicle_reg", e.target.value.toUpperCase())} className="neomorph-inset" /></div>
        <div><label className="block text-sm text-muted-foreground mb-1">Their Vehicle Make/Model</label><Input value={formData.vehicle_make_model || ""} onChange={(e) => set("vehicle_make_model", e.target.value)} className="neomorph-inset" /></div>
      </div>
    </div>
  );

  const readingView = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <DirectoryTagPills record={formData} />
        <span className="text-xs text-muted-foreground">{formData.client_type || "Individual"}</span>
        {client && formData.vat_status && formData.vat_status !== "Unknown" && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{formData.vat_status}</span>}
        {client && formData.handles_vat_excess === true && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
            <Receipt className="w-3 h-3" /> VAT &amp; Excess handled
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{formData.phone || "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium truncate">{formData.email || "—"}</p></div>
      </div>
      <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{[formData.address_line_1, formData.address_line_2, formData.town, formData.county, formData.postcode].filter(Boolean).join(", ") || "—"}</p></div>
      {client && (formData.contacts || []).length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contacts at the business</p>
          <div className="space-y-2">
            {(formData.contacts || []).map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-2.5 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.name || "—"}</span>
                  {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                  {c.is_primary && <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Primary</span>}
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {thirdParty && (
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div><p className="text-xs text-muted-foreground">Their Insurer</p><p className="text-sm font-medium">{formData.insurer || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Their Policy Number</p><p className="text-sm font-medium">{formData.policy_number || "—"}</p></div>
          <div className="col-span-2"><p className="text-xs text-muted-foreground">Their Vehicle</p><p className="text-sm font-medium">{[formData.vehicle_reg, formData.vehicle_make_model].filter(Boolean).join(" · ") || "—"}</p></div>
        </div>
      )}
      {formData.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm font-medium whitespace-pre-wrap">{formData.notes}</p></div>}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4" onClick={onClose} data-mobile-full-modal="true">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isNew ? "Add to the directory" : <>{isEditing ? "Edit" : ""} {record.name}</>}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && <Button onClick={() => setIsEditing(true)} variant="outline" size="sm"><Pencil className="w-4 h-4" /> Edit</Button>}
            <Button onClick={onClose} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
            {tagRow}
            {sharedFields}
            {client && clientFields}
            {thirdParty && thirdPartyFields}
            <div><label className="block text-sm text-muted-foreground mb-1">Notes</label><Textarea value={formData.notes || ""} onChange={(e) => set("notes", e.target.value)} className="neomorph-inset" rows={2} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => (isNew ? onClose() : (setIsEditing(false), setFormData({ ...EMPTY_FORM, ...record })))} variant="outline">Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : isNew ? "Add to directory" : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : (
          readingView
        )}
      </div>
    </div>,
    document.body
  );
}