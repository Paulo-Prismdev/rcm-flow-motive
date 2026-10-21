import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from '@tanstack/react-query';
import { useToast } from "@/components/ui/use-toast";
import AddressLookupInput from './AddressLookupInput';

const EMPTY_FORM = {
  name: '',
  party_type: 'Individual',
  phone: '',
  email: '',
  address_line_1: '',
  address_line_2: '',
  town: '',
  county: '',
  postcode: '',
  insurer: '',
  policy_number: '',
  vehicle_reg: '',
  vehicle_make_model: '',
  notes: ''
};

export default function AddThirdPartyModal({ isOpen, onClose, onSuccess, initialName = '' }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const { toast } = useToast();

  // Where a name has already been read off an instruction, it leads the form.
  useEffect(() => {
    if (isOpen) setFormData({ ...EMPTY_FORM, name: initialName || '' });
  }, [isOpen, initialName]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ThirdParty.create(data),
    onSuccess: (record) => {
      if (onSuccess) onSuccess(record);
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to save third party",
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
      postcode: addressData.postcode || ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  const isCompany = formData.party_type === 'Company';

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4 pointer-events-auto" data-custom-portal-modal="true" data-mobile-full-modal="true">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Add New Third Party</h2>
            <p className="text-xs text-muted-foreground mt-1">Kept in the third party list, not the client directory.</p>
          </div>
          <Button onClick={handleClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Third Party Type</label>
            <div className="flex gap-2">
              {['Individual', 'Company'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('party_type', type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.party_type === type
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
            <Input value={formData.name} onChange={(e) => set('name', e.target.value)} className="neomorph-inset" required autoFocus />
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
              <Input value={formData.postcode} onChange={(e) => set('postcode', e.target.value.toUpperCase())} className="neomorph-inset" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Their Insurer</label>
              <Input value={formData.insurer} onChange={(e) => set('insurer', e.target.value)} className="neomorph-inset" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Their Policy Number</label>
              <Input value={formData.policy_number} onChange={(e) => set('policy_number', e.target.value)} className="neomorph-inset" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Their Vehicle Registration</label>
              <Input value={formData.vehicle_reg} onChange={(e) => set('vehicle_reg', e.target.value.toUpperCase())} className="neomorph-inset" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Their Vehicle Make/Model</label>
              <Input value={formData.vehicle_make_model} onChange={(e) => set('vehicle_make_model', e.target.value)} className="neomorph-inset" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Notes</label>
            <Textarea value={formData.notes} onChange={(e) => set('notes', e.target.value)} className="neomorph-inset" rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={handleClose} variant="outline">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Add Third Party'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}