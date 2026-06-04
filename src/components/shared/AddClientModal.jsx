import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from '@tanstack/react-query';
import AddressLookupInput from './AddressLookupInput';

const EMPTY_FORM = {
  name: '',
  client_type: 'Individual',
  phone: '',
  email: '',
  company_contact_name: '',
  company_contact_phone: '',
  company_contact_email: '',
  address_line_1: '',
  address_line_2: '',
  town: '',
  county: '',
  postcode: '',
  notes: '',
  latitude: null,
  longitude: null
};

export default function AddClientModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (newClient) => {
      if (onSuccess) onSuccess(newClient);
      handleClose();
    },
    onError: (error) => {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to create client';
      alert(`Failed to create client: ${msg}`);
      console.error('Client creation error:', error);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  const isCompany = formData.client_type === 'Company';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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

          {/* Company Contact Fields — only visible for Company type */}
          {isCompany && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Contact Person</p>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Contact Name</label>
                <Input value={formData.company_contact_name} onChange={(e) => set('company_contact_name', e.target.value)} className="neomorph-inset" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Contact Phone</label>
                  <Input value={formData.company_contact_phone} onChange={(e) => set('company_contact_phone', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Contact Email</label>
                  <Input type="email" value={formData.company_contact_email} onChange={(e) => set('company_contact_email', e.target.value)} className="neomorph-inset" />
                </div>
              </div>
            </div>
          )}

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
    </div>
  );
}