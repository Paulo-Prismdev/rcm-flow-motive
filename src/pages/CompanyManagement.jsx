import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Trash2, Phone, Mail, Building2, Users, Star, UserCog, Pencil, X, Plus, Loader2,
} from "lucide-react";
import DirectoryShell from "@/components/shared/DirectoryShell";

const ALL_PORTAL_SECTIONS = ["Claims", "Parts"];

const typeColors = {
  platform_owner: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  referrer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  repairer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

function ReferrerDetailModal({ company, onClose, onUpdated }) {
  const [formData, setFormData] = useState(company);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.update(company.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      onUpdated();
      setIsEditing(false);
      toast.success("Referrer updated");
    },
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const addContact = () => {
    setFormData(prev => ({ ...prev, contacts: [...(prev.contacts || []), { name: "", position: "", email: "", phone: "", is_primary: false, is_handler: false }] }));
  };
  const updateContact = (idx, field, value) => {
    setFormData(prev => ({ ...prev, contacts: (prev.contacts || []).map((c, i) => i === idx ? { ...c, [field]: value } : c) }));
  };
  const removeContact = (idx) => {
    setFormData(prev => ({ ...prev, contacts: (prev.contacts || []).filter((_, i) => i !== idx) }));
  };
  const setPrimaryContact = (idx) => {
    setFormData(prev => ({ ...prev, contacts: (prev.contacts || []).map((c, i) => ({ ...c, is_primary: i === idx })) }));
  };
  const toggleSection = (section) => {
    setFormData(prev => ({ ...prev, portal_sections: prev.portal_sections.includes(section) ? prev.portal_sections.filter(s => s !== section) : [...prev.portal_sections, section] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData };
    if (data.default_percent_to_referrer === "") delete data.default_percent_to_referrer;
    if (data.default_repairer_referral_fee === "") delete data.default_repairer_referral_fee;
    updateMutation.mutate(data);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isEditing ? "Edit" : ""} {company.name}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && <Button onClick={() => setIsEditing(true)} variant="outline" size="sm"><Pencil className="w-4 h-4" /> Edit</Button>}
            <Button onClick={onClose} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Referrer Name *</Label>
              <Input value={formData.name || ""} onChange={(e) => set("name", e.target.value)} className="neomorph-inset" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={formData.company_type || "referrer"} onValueChange={(v) => set("company_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform_owner">Platform Owner</SelectItem>
                    <SelectItem value="referrer">Referrer</SelectItem>
                    <SelectItem value="repairer">Repairer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="is_active" checked={formData.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold">Main Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact Name</Label><Input value={formData.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} className="neomorph-inset" /></div>
                <div><Label>Contact Email</Label><Input type="email" value={formData.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} className="neomorph-inset" /></div>
                <div><Label>Contact Phone</Label><Input value={formData.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} className="neomorph-inset" /></div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Additional Contacts</h3>
                <Button type="button" variant="outline" size="sm" onClick={addContact}><Plus className="w-3.5 h-3.5 mr-1" />Add Contact</Button>
              </div>
              {(formData.contacts || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No additional contacts added.</p>
              ) : (
                <div className="space-y-3">
                  {(formData.contacts || []).map((contact, idx) => (
                    <div key={idx} className="rounded-lg border border-border p-3 space-y-2 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setPrimaryContact(idx)} className={`flex items-center gap-1 text-xs font-medium ${contact.is_primary ? "text-amber-600" : "text-muted-foreground hover:text-amber-500"}`} title={contact.is_primary ? "Primary contact" : "Set as primary"}>
                            <Star className={`w-3.5 h-3.5 ${contact.is_primary ? "fill-amber-500 text-amber-500" : ""}`} />{contact.is_primary ? "Primary" : "Set primary"}
                          </button>
                          <button type="button" onClick={() => updateContact(idx, "is_handler", !contact.is_handler)} className={`flex items-center gap-1 text-xs font-medium ${contact.is_handler ? "text-blue-600" : "text-muted-foreground hover:text-blue-500"}`} title={contact.is_handler ? "File handler — selectable on claims and updates" : "Mark as file handler"}>
                            <UserCog className={`w-3.5 h-3.5 ${contact.is_handler ? "fill-blue-500 text-blue-500" : ""}`} />{contact.is_handler ? "Handler" : "Set handler"}
                          </button>
                        </div>
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

            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold">Address</h3>
              <Input placeholder="Address Line 1" value={formData.address_line_1 || ""} onChange={(e) => set("address_line_1", e.target.value)} className="neomorph-inset" />
              <Input placeholder="Address Line 2" value={formData.address_line_2 || ""} onChange={(e) => set("address_line_2", e.target.value)} className="neomorph-inset" />
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Town" value={formData.town || ""} onChange={(e) => set("town", e.target.value)} className="neomorph-inset" />
                <Input placeholder="County" value={formData.county || ""} onChange={(e) => set("county", e.target.value)} className="neomorph-inset" />
                <Input placeholder="Postcode" value={formData.postcode || ""} onChange={(e) => set("postcode", e.target.value)} className="neomorph-inset" />
              </div>
            </div>

            {(formData.company_type || "referrer") === "referrer" && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="text-sm font-semibold">Fee Rates</h3>
                <p className="text-xs text-muted-foreground">These auto-populate when this referrer is selected on a claim.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>% to Referrer</Label><Input type="number" min="0" max="100" step="0.5" value={formData.default_percent_to_referrer ?? ""} onChange={(e) => set("default_percent_to_referrer", e.target.value)} placeholder="e.g. 5" className="neomorph-inset" /></div>
                  <div><Label>Repairer Referral Fee %</Label><Input type="number" min="0" max="100" step="0.5" value={formData.default_repairer_referral_fee ?? ""} onChange={(e) => set("default_repairer_referral_fee", e.target.value)} placeholder="e.g. 20" className="neomorph-inset" /></div>
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold">Portal Access</h3>
              <p className="text-xs text-muted-foreground">Select which sections this referrer can access in their portal.</p>
              <div className="flex gap-3 flex-wrap">
                {ALL_PORTAL_SECTIONS.map(section => (
                  <div key={section} className="flex items-center gap-2">
                    <Checkbox id={`section-${section}`} checked={(formData.portal_sections || []).includes(section)} onCheckedChange={() => toggleSection(section)} />
                    <Label htmlFor={`section-${section}`}>{section}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => { setIsEditing(false); setFormData(company); }} variant="outline">Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors[company.company_type] || "bg-gray-100 text-gray-700"}`}>{company.company_type?.replace("_", " ")}</span>
              {!company.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">Inactive</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm font-medium">{company.contact_name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{company.contact_phone || "—"}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium truncate">{company.contact_email || "—"}</p></div>
            </div>
            <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{[company.address_line_1, company.address_line_2, company.town, company.county, company.postcode].filter(Boolean).join(", ") || "—"}</p></div>
            {(company.default_percent_to_referrer != null || company.default_repairer_referral_fee != null) && (
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">% to Referrer</p><p className="text-sm font-medium">{company.default_percent_to_referrer ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Repairer Referral Fee %</p><p className="text-sm font-medium">{company.default_repairer_referral_fee ?? "—"}</p></div>
              </div>
            )}
            {company.portal_sections?.length > 0 && (
              <div><p className="text-xs text-muted-foreground">Portal Access</p><div className="flex flex-wrap gap-1 mt-1">{company.portal_sections.map(s => <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>)}</div></div>
            )}
            {(company.contacts || []).length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contacts</p>
                <div className="space-y-2">
                  {(company.contacts || []).map((c, i) => (
                    <div key={i} className="rounded-lg border border-border p-2.5 bg-muted/30">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{c.name || "—"}</span>
                        {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                        {c.is_primary && <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Primary</span>}
                        {c.is_handler && <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 font-medium"><UserCog className="w-3 h-3 fill-blue-500 text-blue-500" /> Handler</span>}
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
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function AddReferrerModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "", company_type: "referrer", is_active: true,
    contact_name: "", contact_email: "", contact_phone: "",
    address_line_1: "", address_line_2: "", town: "", county: "", postcode: "",
    portal_sections: ["Claims"], default_percent_to_referrer: "", default_repairer_referral_fee: "",
    contacts: [],
  });
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => { toast.success("Referrer created"); onSuccess(); },
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const addContact = () => setFormData(prev => ({ ...prev, contacts: [...(prev.contacts || []), { name: "", position: "", email: "", phone: "", is_primary: false, is_handler: false }] }));
  const updateContact = (idx, field, value) => setFormData(prev => ({ ...prev, contacts: (prev.contacts || []).map((c, i) => i === idx ? { ...c, [field]: value } : c) }));
  const removeContact = (idx) => setFormData(prev => ({ ...prev, contacts: (prev.contacts || []).filter((_, i) => i !== idx) }));
  const setPrimaryContact = (idx) => setFormData(prev => ({ ...prev, contacts: (prev.contacts || []).map((c, i) => ({ ...c, is_primary: i === idx })) }));
  const toggleSection = (section) => setFormData(prev => ({ ...prev, portal_sections: prev.portal_sections.includes(section) ? prev.portal_sections.filter(s => s !== section) : [...prev.portal_sections, section] }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData };
    if (data.default_percent_to_referrer === "") delete data.default_percent_to_referrer;
    if (data.default_repairer_referral_fee === "") delete data.default_repairer_referral_fee;
    createMutation.mutate(data);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">Add Referrer</h2>
          <Button onClick={onClose} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Referrer Name *</Label><Input value={formData.name} onChange={(e) => set("name", e.target.value)} className="neomorph-inset" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={formData.company_type} onValueChange={(v) => set("company_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_owner">Platform Owner</SelectItem>
                  <SelectItem value="referrer">Referrer</SelectItem>
                  <SelectItem value="repairer">Repairer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1"><div className="flex items-center gap-2"><Checkbox id="new_is_active" checked={formData.is_active} onCheckedChange={(v) => set("is_active", v)} /><Label htmlFor="new_is_active">Active</Label></div></div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold">Main Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Name</Label><Input value={formData.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="neomorph-inset" /></div>
              <div><Label>Contact Email</Label><Input type="email" value={formData.contact_email} onChange={(e) => set("contact_email", e.target.value)} className="neomorph-inset" /></div>
              <div><Label>Contact Phone</Label><Input value={formData.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="neomorph-inset" /></div>
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Additional Contacts</h3>
              <Button type="button" variant="outline" size="sm" onClick={addContact}><Plus className="w-3.5 h-3.5 mr-1" />Add Contact</Button>
            </div>
            {(formData.contacts || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No additional contacts added.</p>
            ) : (
              <div className="space-y-3">
                {(formData.contacts || []).map((contact, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-2 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setPrimaryContact(idx)} className={`flex items-center gap-1 text-xs font-medium ${contact.is_primary ? "text-amber-600" : "text-muted-foreground hover:text-amber-500"}`}><Star className={`w-3.5 h-3.5 ${contact.is_primary ? "fill-amber-500 text-amber-500" : ""}`} />{contact.is_primary ? "Primary" : "Set primary"}</button>
                        <button type="button" onClick={() => updateContact(idx, "is_handler", !contact.is_handler)} className={`flex items-center gap-1 text-xs font-medium ${contact.is_handler ? "text-blue-600" : "text-muted-foreground hover:text-blue-500"}`}><UserCog className={`w-3.5 h-3.5 ${contact.is_handler ? "fill-blue-500 text-blue-500" : ""}`} />{contact.is_handler ? "Handler" : "Set handler"}</button>
                      </div>
                      <button type="button" onClick={() => removeContact(idx)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Name" value={contact.name} onChange={(e) => updateContact(idx, "name", e.target.value)} className="neomorph-inset" />
                      <Input placeholder="Position / Role" value={contact.position} onChange={(e) => updateContact(idx, "position", e.target.value)} className="neomorph-inset" />
                      <Input placeholder="Email" type="email" value={contact.email} onChange={(e) => updateContact(idx, "email", e.target.value)} className="neomorph-inset" />
                      <Input placeholder="Phone" value={contact.phone} onChange={(e) => updateContact(idx, "phone", e.target.value)} className="neomorph-inset" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold">Address</h3>
            <Input placeholder="Address Line 1" value={formData.address_line_1} onChange={(e) => set("address_line_1", e.target.value)} className="neomorph-inset" />
            <Input placeholder="Address Line 2" value={formData.address_line_2} onChange={(e) => set("address_line_2", e.target.value)} className="neomorph-inset" />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Town" value={formData.town} onChange={(e) => set("town", e.target.value)} className="neomorph-inset" />
              <Input placeholder="County" value={formData.county} onChange={(e) => set("county", e.target.value)} className="neomorph-inset" />
              <Input placeholder="Postcode" value={formData.postcode} onChange={(e) => set("postcode", e.target.value)} className="neomorph-inset" />
            </div>
          </div>
          {formData.company_type === "referrer" && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold">Fee Rates</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>% to Referrer</Label><Input type="number" min="0" max="100" step="0.5" value={formData.default_percent_to_referrer} onChange={(e) => set("default_percent_to_referrer", e.target.value)} placeholder="e.g. 5" className="neomorph-inset" /></div>
                <div><Label>Repairer Referral Fee %</Label><Input type="number" min="0" max="100" step="0.5" value={formData.default_repairer_referral_fee} onChange={(e) => set("default_repairer_referral_fee", e.target.value)} placeholder="e.g. 20" className="neomorph-inset" /></div>
              </div>
            </div>
          )}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold">Portal Access</h3>
            <div className="flex gap-3 flex-wrap">
              {ALL_PORTAL_SECTIONS.map(section => (
                <div key={section} className="flex items-center gap-2">
                  <Checkbox id={`new-section-${section}`} checked={formData.portal_sections.includes(section)} onCheckedChange={() => toggleSection(section)} />
                  <Label htmlFor={`new-section-${section}`}>{section}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" onClick={onClose} variant="outline">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create"}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function CompanyManagement() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isAdmin = ["admin", "super_admin", "company_admin"].includes(currentUser?.role);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("name", 500),
    enabled: !!currentUser,
  });

  const detail = companies.find((c) => c.id === detailId) || null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["companies"] });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => { invalidate(); toast.success("Referrer deleted"); },
  });

  const sorted = useMemo(() => [...companies].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })), [companies]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return sorted;
    return sorted.filter((c) =>
      c.name?.toLowerCase().includes(s) ||
      c.contact_name?.toLowerCase().includes(s) ||
      c.contact_email?.toLowerCase().includes(s) ||
      c.contact_phone?.toLowerCase().includes(s) ||
      c.town?.toLowerCase().includes(s) ||
      c.postcode?.toLowerCase().includes(s) ||
      (c.contacts || []).some((ct) => ct.name?.toLowerCase().includes(s) || ct.email?.toLowerCase().includes(s))
    );
  }, [sorted, search]);

  const handleDelete = (company) => {
    if (window.confirm(`Remove "${company.name}" from the referrer directory?`)) {
      deleteMutation.mutate(company.id);
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-12 text-muted-foreground">Access denied.</div>;
  }

  return (
    <>
      <DirectoryShell
        icon={Building2}
        title="Referrers"
        count={`${filtered.length} of ${companies.length} referrers`}
        addLabel="Add Referrer"
        onAdd={() => setShowAdd(true)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, contact, phone, email, postcode..."
      >
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No referrers found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map((c) => {
                const handlerCount = (c.contacts || []).filter(ct => ct.is_handler).length;
                return (
                  <div key={c.id} onClick={() => setDetailId(c.id)} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        {c.contact_name && <div className="text-xs text-muted-foreground truncate">{c.contact_name}</div>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {c.contact_phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {c.contact_phone}</span>}
                      {c.contact_email && <span className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5" /> {c.contact_email}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0 rounded font-medium ${typeColors[c.company_type] || "bg-gray-100 text-gray-700"}`}>{c.company_type?.replace("_", " ")}</span>
                      {!c.is_active && <span className="text-[10px] px-1.5 py-0 rounded bg-red-100 text-red-600">Inactive</span>}
                      {(c.contacts || []).length > 0 && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Users className="w-3 h-3" /> {c.contacts.length}</span>}
                      {handlerCount > 0 && <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500"><UserCog className="w-3 h-3" /> {handlerCount}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full">
              <thead className="sticky top-0 bg-card border-b border-border z-10">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Type</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Contact</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Contacts</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const handlerCount = (c.contacts || []).filter(ct => ct.is_handler).length;
                  return (
                    <tr key={c.id} onClick={() => setDetailId(c.id)} className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors">
                      <td className="p-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {c.name}
                          {!c.is_active && <span className="text-[10px] px-1.5 py-0 rounded bg-red-100 text-red-600">Inactive</span>}
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors[c.company_type] || "bg-gray-100 text-gray-700"}`}>{c.company_type?.replace("_", " ")}</span></td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{c.contact_name || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{c.contact_phone || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{c.contact_email || "—"}</td>
                      <td className="p-3 hidden lg:table-cell">
                        {(c.contacts || []).length > 0 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" /> {c.contacts.length}</span>
                            {handlerCount > 0 && <span className="inline-flex items-center gap-0.5 text-blue-500"><UserCog className="w-3 h-3" /> {handlerCount}</span>}
                          </div>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </DirectoryShell>

      {showAdd && <AddReferrerModal onClose={() => setShowAdd(false)} onSuccess={() => { invalidate(); setShowAdd(false); }} />}
      {detail && <ReferrerDetailModal company={detail} onClose={() => setDetailId(null)} onUpdated={invalidate} />}
    </>
  );
}