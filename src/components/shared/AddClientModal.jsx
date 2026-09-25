import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Building2, Plus, Trash2, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from '@tanstack/react-query';
import { useToast } from "@/components/ui/use-toast";
import AddressLookupInput from './AddressLookupInput';

const EMPTY_FORM = {
  name: '',
  client_type: 'Individual',
  phone: '',
  email: '',
  contacts: [],
  address_line_1: '',
  address_line_2: '',
  town: '',
  county: '',
  postcode: '',
  vat_status: 'Unknown',
  notes: '',
  latitude: null,
  longitude: null
};

export default function AddClientModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (newClient) => {
      if (onSuccess) onSuccess(newClient);
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to create client",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    onClose();
  };

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address_line_1: addressData.address_line_1 || '',
      address_line_2: addressData.address_line_2 || '',
      town: addressData.town || '',
      county: addressData.county || '',
      postcode: addressData.postcode || '',
      latitude: addressData.latitude,
      longitude: addressData.longitude
    }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', position: '', email: '', phone: '', is_primary: prev.contacts.length === 0 }],
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

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  const isCompany = formData.client_type === 'Company';

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4 pointer-events-auto" data-custom-portal-modal="true">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Add New Client</h2>
          <Button onClick={handleClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Client Type</label>
            <div className="flex gap-2">
              {['Individual', 'Company'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('client_type', type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.client_type === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {type === 'Individual' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              {isCompany ? 'Company Name *' : 'Full Name *'}
            </label>
            <Input
              value={formData.name}
              onChange={(e) => set('name', e.target.value)}
              className="neomorph-inset"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm text-muted-foreground mb-1">Address Lookup</label>
            <AddressLookupInput value={formData.address_line_1} onChange={handleAddressChange} placeholder="Start typing address or postcode..." />
            <p className="text-xs text-muted-foreground mt-1">Or fill in manually below</p>
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
            <label className="block text-sm text-muted-foreground mb-1">VAT Status</label>
            <select value={formData.vat_status} onChange={e => set('vat_status', e.target.value)}
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
              {formData.contacts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No contacts added yet. Add a contact for this company.</p>
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
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Notes</label>
            <Textarea value={formData.notes} onChange={(e) => set('notes', e.target.value)} className="neomorph-inset" rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={handleClose} variant="outline">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}