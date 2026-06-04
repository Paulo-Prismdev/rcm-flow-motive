import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from '@tanstack/react-query';

const EMPTY_FORM = { name: '', contact_name: '', phone: '', email: '', claims_line: '', notes: '' };

export default function AddInsurerModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Insurer.create(data),
    onSuccess: (newInsurer) => {
      if (onSuccess) onSuccess(newInsurer);
      handleClose();
    },
  });

  const handleClose = () => { setFormData(EMPTY_FORM); onClose(); };
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">Add New Insurer</h2>
          <Button onClick={handleClose} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Insurer Name *</label>
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
            <label className="block text-sm text-muted-foreground mb-1">Claims Line (Phone)</label>
            <Input value={formData.claims_line} onChange={(e) => set('claims_line', e.target.value)} className="neomorph-inset" placeholder="Direct claims department number" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Notes</label>
            <Textarea value={formData.notes} onChange={(e) => set('notes', e.target.value)} className="neomorph-inset" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={handleClose} variant="outline">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Insurer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}