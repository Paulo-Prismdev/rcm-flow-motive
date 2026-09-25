import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Trash2, Phone, Mail, Building2, Pencil, X, Star } from "lucide-react";
import { createPortal } from "react-dom";
import AddCreditRepairCompanyModal from "../shared/AddCreditRepairCompanyModal";

function CreditRepairDetailModal({ company, onClose, onUpdated }) {
  const [formData, setFormData] = useState(company);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditRepairCompany.update(company.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditRepairCompanies"] });
      onUpdated();
      setIsEditing(false);
    },
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), { name: '', position: '', email: '', phone: '', is_primary: false }],
    }));
  };
  const updateContact = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      contacts: (prev.contacts || []).map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }));
  };
  const removeContact = (idx) => {
    setFormData(prev => ({ ...prev, contacts: (prev.contacts || []).filter((_, i) => i !== idx) }));
  };
  const setPrimaryContact = (idx) => {
    setFormData(prev => ({
      ...prev,
      contacts: (prev.contacts || []).map((c, i) => ({ ...c, is_primary: i === idx })),
    }));
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit' : ''} {company.name}</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm"><Pencil className="w-4 h-4" /> Edit</Button>
            )}
            <Button onClick={onClose} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Company Name *</label>
              <Input value={formData.name || ''} onChange={(e) => set('name', e.target.value)} className="neomorph-inset" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Phone</label>
                <Input value={formData.phone || ''} onChange={(e) => set('phone', e.target.value)} className="neomorph-inset" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <Input type="email" value={formData.email || ''} onChange={(e) => set('email', e.target.value)} className="neomorph-inset" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Address</label>
              <Input value={formData.address_line_1 || ''} onChange={(e) => set('address_line_1', e.target.value)} className="neomorph-inset" placeholder="Address line 1" />
            </div>
            <div>
              <Input value={formData.address_line_2 || ''} onChange={(e) => set('address_line_2', e.target.value)} className="neomorph-inset" placeholder="Address line 2" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input value={formData.town || ''} onChange={(e) => set('town', e.target.value)} className="neomorph-inset" placeholder="Town" />
              <Input value={formData.county || ''} onChange={(e) => set('county', e.target.value)} className="neomorph-inset" placeholder="County" />
              <Input value={formData.postcode || ''} onChange={(e) => set('postcode', e.target.value)} className="neomorph-inset" placeholder="Postcode" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Account Reference</label>
              <Input value={formData.account_reference || ''} onChange={(e) => set('account_reference', e.target.value)} className="neomorph-inset" />
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Contacts</h3>
                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Contact
                </Button>
              </div>
              {(formData.contacts || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No contacts added yet.</p>
              ) : (
                <div className="space-y-3">
                  {(formData.contacts || []).map((contact, idx) => (
                    <div key={idx} className="rounded-lg border border-border p-3 space-y-2 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setPrimaryContact(idx)}
                          className={`flex items-center gap-1 text-xs font-medium ${contact.is_primary ? 'text-amber-600' : 'text-muted-foreground hover:text-amber-500'}`}
                          title={contact.is_primary ? 'Primary contact' : 'Set as primary'}
                        >
                          <Star className={`w-3.5 h-3.5 ${contact.is_primary ? 'fill-amber-500 text-amber-500' : ''}`} />
                          {contact.is_primary ? 'Primary' : 'Set primary'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Name" value={contact.name || ''} onChange={(e) => updateContact(idx, 'name', e.target.value)} className="neomorph-inset" />
                        <Input placeholder="Position / Role" value={contact.position || ''} onChange={(e) => updateContact(idx, 'position', e.target.value)} className="neomorph-inset" />
                        <Input placeholder="Email" type="email" value={contact.email || ''} onChange={(e) => updateContact(idx, 'email', e.target.value)} className="neomorph-inset" />
                        <Input placeholder="Phone" value={contact.phone || ''} onChange={(e) => updateContact(idx, 'phone', e.target.value)} className="neomorph-inset" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Notes</label>
              <Textarea value={formData.notes || ''} onChange={(e) => set('notes', e.target.value)} className="neomorph-inset" rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => { setIsEditing(false); setFormData(company); }} variant="outline">Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{company.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{company.email || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm font-medium">
                {[company.address_line_1, company.address_line_2, company.town, company.county, company.postcode].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Account Reference</p>
              <p className="text-sm font-medium">{company.account_reference || '—'}</p>
            </div>
            {company.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm font-medium whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
            {company.contacts?.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contacts</p>
                <div className="space-y-2">
                  {company.contacts.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border p-2.5 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.name || '—'}</span>
                        {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                        {c.is_primary && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Primary
                          </span>
                        )}
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

export default function CreditRepairDirectoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["creditRepairCompanies"],
    queryFn: () => base44.entities.CreditRepairCompany.list("name", 500),
  });

  const detail = companies.find((c) => c.id === detailId) || null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["creditRepairCompanies"] });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditRepairCompany.delete(id),
    onSuccess: () => invalidate(),
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return companies;
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(s) ||
        c.contact_name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.toLowerCase().includes(s) ||
        c.account_reference?.toLowerCase().includes(s)
    );
  }, [companies, search]);

  const handleDelete = (company) => {
    if (window.confirm(`Remove "${company.name}" from the credit repair directory?`)) {
      deleteMutation.mutate(company.id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <AddCreditRepairCompanyModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { invalidate(); setShowAdd(false); }} />

      {detail && (
        <CreditRepairDetailModal
          company={detail}
          onClose={() => setDetailId(null)}
          onUpdated={invalidate}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Credit Repair Companies</h2>
          <span className="text-xs text-gray-400">({filtered.length})</span>
        </div>
        <Button onClick={() => setShowAdd(true)} className="self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      <div className="relative mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, contact, phone, email, account ref..."
        />
      </div>

      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Company</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Contact</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Phone</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Email</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Account Ref</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">No credit repair companies found</td></tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setDetailId(c.id)}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.contact_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.account_reference || "—"}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
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

      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">No credit repair companies found</div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setDetailId(c.id)}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                  {c.contact_name && <p className="text-xs text-gray-500 truncate">{c.contact_name}</p>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {c.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {c.phone}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {c.email}
                  </div>
                )}
                {c.account_reference && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-xs text-gray-400">Ref:</span> {c.account_reference}
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