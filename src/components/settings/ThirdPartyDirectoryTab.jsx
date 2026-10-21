import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Phone, Mail, User, Building2, Pencil, X, Loader2, Car } from "lucide-react";
import { createPortal } from "react-dom";
import DirectoryShell from "../shared/DirectoryShell";
import AddThirdPartyModal from "../shared/AddThirdPartyModal";

function ThirdPartyDetailModal({ thirdParty, onClose, onUpdated }) {
  const [formData, setFormData] = useState(thirdParty);
  const [isEditing, setIsEditing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ThirdParty.update(thirdParty.id, data),
    onSuccess: () => {
      onUpdated();
      setIsEditing(false);
    },
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const isCompany = formData.party_type === 'Company';

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4" onClick={onClose} data-mobile-full-modal="true">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit' : ''} {thirdParty.name}</h2>
          <div className="flex items-center gap-2">
            {!isEditing && <Button onClick={() => setIsEditing(true)} variant="outline" size="sm"><Pencil className="w-4 h-4" /> Edit</Button>}
            <Button onClick={onClose} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Third Party Type</label>
              <div className="flex gap-2">
                {['Individual', 'Company'].map(type => (
                  <button key={type} type="button" onClick={() => set('party_type', type)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${formData.party_type === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}>
                    {type === 'Individual' ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="block text-sm text-muted-foreground mb-1">{isCompany ? 'Company Name *' : 'Full Name *'}</label><Input value={formData.name || ''} onChange={(e) => set('name', e.target.value)} className="neomorph-inset" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-muted-foreground mb-1">Phone</label><Input value={formData.phone || ''} onChange={(e) => set('phone', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-sm text-muted-foreground mb-1">Email</label><Input type="email" value={formData.email || ''} onChange={(e) => set('email', e.target.value)} className="neomorph-inset" /></div>
            </div>
            <div><label className="block text-sm text-muted-foreground mb-1">Address Line 1</label><Input value={formData.address_line_1 || ''} onChange={(e) => set('address_line_1', e.target.value)} className="neomorph-inset" /></div>
            <Input value={formData.address_line_2 || ''} onChange={(e) => set('address_line_2', e.target.value)} className="neomorph-inset" placeholder="Address line 2" />
            <div className="grid grid-cols-3 gap-3">
              <Input value={formData.town || ''} onChange={(e) => set('town', e.target.value)} className="neomorph-inset" placeholder="Town" />
              <Input value={formData.county || ''} onChange={(e) => set('county', e.target.value)} className="neomorph-inset" placeholder="County" />
              <Input value={formData.postcode || ''} onChange={(e) => set('postcode', e.target.value.toUpperCase())} className="neomorph-inset" placeholder="Postcode" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-muted-foreground mb-1">Their Insurer</label><Input value={formData.insurer || ''} onChange={(e) => set('insurer', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-sm text-muted-foreground mb-1">Their Policy Number</label><Input value={formData.policy_number || ''} onChange={(e) => set('policy_number', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-sm text-muted-foreground mb-1">Their Vehicle Registration</label><Input value={formData.vehicle_reg || ''} onChange={(e) => set('vehicle_reg', e.target.value.toUpperCase())} className="neomorph-inset" /></div>
              <div><label className="block text-sm text-muted-foreground mb-1">Their Vehicle Make/Model</label><Input value={formData.vehicle_make_model || ''} onChange={(e) => set('vehicle_make_model', e.target.value)} className="neomorph-inset" /></div>
            </div>
            <div><label className="block text-sm text-muted-foreground mb-1">Notes</label><Textarea value={formData.notes || ''} onChange={(e) => set('notes', e.target.value)} className="neomorph-inset" rows={2} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => { setIsEditing(false); setFormData(thirdParty); }} variant="outline">Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {thirdParty.party_type === 'Company' ? <Building2 className="w-4 h-4 text-muted-foreground" /> : <User className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{thirdParty.party_type || 'Individual'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{thirdParty.phone || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium truncate">{thirdParty.email || '—'}</p></div>
            </div>
            <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{[thirdParty.address_line_1, thirdParty.address_line_2, thirdParty.town, thirdParty.county, thirdParty.postcode].filter(Boolean).join(', ') || '—'}</p></div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div><p className="text-xs text-muted-foreground">Their Insurer</p><p className="text-sm font-medium">{thirdParty.insurer || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Their Policy Number</p><p className="text-sm font-medium">{thirdParty.policy_number || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Their Vehicle</p><p className="text-sm font-medium">{[thirdParty.vehicle_reg, thirdParty.vehicle_make_model].filter(Boolean).join(' · ') || '—'}</p></div>
            </div>
            {thirdParty.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm font-medium whitespace-pre-wrap">{thirdParty.notes}</p></div>}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ThirdPartyDirectoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const { data: thirdParties = [], isLoading } = useQuery({
    queryKey: ["thirdParties"],
    queryFn: () => base44.entities.ThirdParty.list("name", 500),
  });

  const detail = thirdParties.find((t) => t.id === detailId) || null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["thirdParties"] });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ThirdParty.delete(id),
    onSuccess: () => invalidate(),
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return thirdParties;
    return thirdParties.filter((t) =>
      t.name?.toLowerCase().includes(s) ||
      t.email?.toLowerCase().includes(s) ||
      t.phone?.toLowerCase().includes(s) ||
      t.postcode?.toLowerCase().includes(s) ||
      t.town?.toLowerCase().includes(s) ||
      t.insurer?.toLowerCase().includes(s) ||
      t.vehicle_reg?.toLowerCase().includes(s)
    );
  }, [thirdParties, search]);

  const handleDelete = (thirdParty) => {
    if (window.confirm(`Remove "${thirdParty.name}" from the third party list?`)) {
      deleteMutation.mutate(thirdParty.id);
    }
  };

  const vehicleLine = (t) => [t.vehicle_reg, t.vehicle_make_model].filter(Boolean).join(' · ');

  return (
    <>
      <DirectoryShell
        icon={User}
        title="Third Party Directory"
        count={`${filtered.length} of ${thirdParties.length} third parties`}
        addLabel="Add Third Party"
        onAdd={() => setShowAdd(true)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, phone, email, postcode, insurer, vehicle..."
      >
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No third parties found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map((t) => (
                <div key={t.id} onClick={() => setDetailId(t.id)} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {t.party_type === 'Company' ? <Building2 className="w-3.5 h-3.5 text-gray-400" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="font-medium text-sm truncate">{t.name}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {t.phone}</span>}
                    {t.email && <span className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5" /> {t.email}</span>}
                    {vehicleLine(t) && <span className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> {vehicleLine(t)}</span>}
                    {t.postcode && <span>Postcode: {t.postcode}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full">
              <thead className="sticky top-0 bg-card border-b border-border z-10">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Type</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Vehicle</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Postcode</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} onClick={() => setDetailId(t.id)} className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="p-3 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {t.party_type === 'Company' ? <Building2 className="w-3.5 h-3.5 text-gray-400" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                        {t.name}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{t.party_type || 'Individual'}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{t.phone || "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{t.email || "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{vehicleLine(t) || "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{t.postcode || "—"}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(t)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </DirectoryShell>

      <AddThirdPartyModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { invalidate(); setShowAdd(false); }} />
      {detail && <ThirdPartyDetailModal thirdParty={detail} onClose={() => setDetailId(null)} onUpdated={invalidate} />}
    </>
  );
}