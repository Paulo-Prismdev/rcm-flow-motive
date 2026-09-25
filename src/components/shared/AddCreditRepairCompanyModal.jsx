import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Trash2, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from '@tanstack/react-query';

const EMPTY_FORM = { name: '', contact_name: '', phone: '', email: '', contacts: [], address_line_1: '', address_line_2: '', town: '', county: '', postcode: '', account_reference: '', notes: '' };

export default function AddCreditRepairCompanyModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditRepairCompany.create(data),
    onSuccess: (newCompany) => {
      if (onSuccess) onSuccess(newCompany);
      handleClose();
    },
  });

  const handleClose = () => { setFormData(EMPTY_FORM); onClose(); };
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', position: '', email: '', phone: '', is_primary: false }],
    }));
  };
  const updateContact = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }));
  };
  const removeContact = (idx) => {
    setFormData(prev => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== idx) }));
  };
  const setPrimaryContact = (idx) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => ({ ...c, is_primary: i === idx })),
    }));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4 pointer-events-auto" data-custom-portal-modal="true">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">Add Credit Repair Company</h2>
          <Button onClick={handleClose} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); createMutation.mutate(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Company Name *</label>
            <Input value={formData.name} onChange={(e) => set('name', e.target.value)} className="neomorph-inset" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Phone</label>
              <Input value={formData.phone} onChange={(e) => set('phone', e.target.value)} className="neomorph-inset" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Email</label>
              <Input type="email" value={formData.email} onChange={(e) => set('email', e.target.value)} className="neomorph-inset" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Address Line 1</label>
            <Input value={formData.address_line_1} onChange={(e) => set('address_line_1', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Address Line 2</label>
            <Input value={formData.address_line_2} onChange={(e) => set('address_line_2', e.target.value)} className="neomorph-inset" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Town</label>
              <Input value={formData.town} onChange={(e) => set('town', e.target.value)} className="neomorph-inset" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">County</label>
              <Input value={formData.county} onChange={(e) => set('county', e.target.value)} className="neomorph-inset" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Postcode</label>
              <Input value={formData.postcode} onChange={(e) => set('postcode', e.target.value)} className="neomorph-inset" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Account Reference</label>
            <Input value={formData.account_reference} onChange={(e) => set('account_reference', e.target.value)} className="neomorph-inset" placeholder="Account or reference number" />
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contacts</h3>
              <Button type="button" variant="outline" size="sm" onClick={addContact}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Contact
              </Button>
            </div>
            {formData.contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No contacts added yet.</p>
            ) : (
              <div className="space-y-3">
                {formData.contacts.map((contact, idx) => (
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
                      <Input placeholder="Name" value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} className="neomorph-inset" />
                      <Input placeholder="Position / Role" value={contact.position} onChange={(e) => updateContact(idx, 'position', e.target.value)} className="neomorph-inset" />
                      <Input placeholder="Email" type="email" value={contact.email} onChange={(e) => updateContact(idx, 'email', e.target.value)} className="neomorph-inset" />
                      <Input placeholder="Phone" value={contact.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} className="neomorph-inset" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Notes</label>
            <Textarea value={formData.notes} onChange={(e) => set('notes', e.target.value)} className="neomorph-inset" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={handleClose} variant="outline">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}