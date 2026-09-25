import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from '@tanstack/react-query';

const EMPTY_FORM = { name: '', contact_name: '', phone: '', email: '', address_line_1: '', address_line_2: '', town: '', county: '', postcode: '', account_reference: '', notes: '' };

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
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Contact Name</label>
            <Input value={formData.contact_name} onChange={(e) => set('contact_name', e.target.value)} className="neomorph-inset" />
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