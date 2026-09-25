import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Trash2, Phone, Mail, User, Building2, Pencil, X, Star } from "lucide-react";
import { createPortal } from "react-dom";
import AddClientModal from "../shared/AddClientModal";

function ClientDetailModal({ client, onClose, onUpdated }) {
  const [formData, setFormData] = useState(client);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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

  const isCompany = formData.client_type === 'Company';

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit' : ''} {client.name}</h2>
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
              <label className="block text-sm text-muted-foreground mb-1">Client Type</label>
              <div className="flex gap-2">
                {['Individual', 'Company'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('client_type', type)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      formData.client_type === type
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {type === 'Individual' ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{isCompany ? 'Company Name *' : 'Full Name *'}</label>
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
              <label className="block text-sm text-muted-foreground mb-1">Address Line 1</label>
              <Input value={formData.address_line_1 || ''} onChange={(e) => set('address_line_1', e.target.value)} className="neomorph-inset" />
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
              <label className="block text-sm text-muted-foreground mb-1">VAT Status</label>
              <select value={formData.vat_status || 'Unknown'} onChange={e => set('vat_status', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[10px] border border-input bg-card text-foreground">
                <option>Unknown</option><option>VAT Registered</option><option>Non-VAT</option>
              </select>
            </div>

            {/* Contacts — only for Company type */}
            {isCompany && (
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
            )}

            <div>
              <label className="block text-sm text-muted-foreground mb-1">Notes</label>
              <Textarea value={formData.notes || ''} onChange={(e) => set('notes', e.target.value)} className="neomorph-inset" rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => { setIsEditing(false); setFormData(client); }} variant="outline">Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {client.client_type === 'Company'
                ? <Building2 className="w-4 h-4 text-muted-foreground" />
                : <User className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{client.client_type || 'Individual'}</span>
              {client.vat_status && client.vat_status !== 'Unknown' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{client.vat_status}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{client.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{client.email || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm font-medium">
                {[client.address_line_1, client.address_line_2, client.town, client.county, client.postcode].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            {client.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm font-medium whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            {client.contacts?.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contacts</p>
                <div className="space-y-2">
                  {client.contacts.map((c, i) => (
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

export default function ClientDirectoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("name", 500),
  });

  const detail = clients.find((c) => c.id === detailId) || null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clients"] });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => invalidate(),
  });

  const getPrimaryContact = (client) => {
    const contacts = client.contacts || [];
    return contacts.find(c => c.is_primary) || contacts[0] || null;
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => {
      const primary = getPrimaryContact(c);
      return (
        c.name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.toLowerCase().includes(s) ||
        c.postcode?.toLowerCase().includes(s) ||
        c.town?.toLowerCase().includes(s) ||
        primary?.name?.toLowerCase().includes(s) ||
        primary?.email?.toLowerCase().includes(s) ||
        c.company_contact_name?.toLowerCase().includes(s)
      );
    });
  }, [clients, search]);

  const handleDelete = (client) => {
    if (window.confirm(`Remove "${client.name}" from the client directory?`)) {
      deleteMutation.mutate(client.id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <AddClientModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { invalidate(); setShowAdd(false); }} />

      {detail && (
        <ClientDetailModal
          client={detail}
          onClose={() => setDetailId(null)}
          onUpdated={invalidate}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Clients</h2>
          <span className="text-xs text-gray-400">({filtered.length})</span>
        </div>
        <Button onClick={() => setShowAdd(true)} className="self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      <div className="relative mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, contact, phone, email, postcode..."
        />
      </div>

      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Name</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Type</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Contact</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Phone</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Email</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Postcode</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-8">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-8">No clients found</td></tr>
            ) : (
              filtered.map((c) => {
                const primary = getPrimaryContact(c);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setDetailId(c.id)}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {c.client_type === 'Company' ? <Building2 className="w-3.5 h-3.5 text-gray-400" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                        {c.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.client_type || 'Individual'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{primary?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.phone || primary?.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{c.email || primary?.email || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.postcode || "—"}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
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

      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">No clients found</div>
        ) : (
          filtered.map((c) => {
            const primary = getPrimaryContact(c);
            return (
              <div
                key={c.id}
                onClick={() => setDetailId(c.id)}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {c.client_type === 'Company' ? <Building2 className="w-3.5 h-3.5 text-gray-400" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                    </div>
                    {primary?.name && <p className="text-xs text-gray-500 truncate mt-0.5">{primary?.name}</p>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  {(c.phone || primary?.phone) && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {c.phone || primary?.phone}
                    </div>
                  )}
                  {(c.email || primary?.email) && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {c.email || primary?.email}
                    </div>
                  )}
                  {c.postcode && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-xs text-gray-400">Postcode:</span> {c.postcode}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}