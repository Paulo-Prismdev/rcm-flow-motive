import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus } from 'lucide-react';

export default function ReferrerPartsForm({ claims, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    linked_claim_id: '',
    part_description: '',
    part_number: '',
    manufacturer: '',
    additional_comments: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const selectedClaim = claims.find(c => c.id === data.linked_claim_id);
      
      const partData = {
        ...data,
        vehicle_ref: selectedClaim ? `${selectedClaim.reg} - ${selectedClaim.make_model}` : '',
        date_requested: new Date().toISOString().split('T')[0],
        sourcing_status: 'New Request',
      };
      
      return base44.entities.Part.create(partData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrerParts'] });
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.linked_claim_id || !formData.part_description) {
      alert('Please select a claim and enter a part description');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="neomorph p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Request Parts Support</h3>
        <Button onClick={onClose} variant="ghost" size="icon">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Claim *</label>
          <select
            value={formData.linked_claim_id}
            onChange={(e) => setFormData(prev => ({ ...prev, linked_claim_id: e.target.value }))}
            className="neomorph-inset w-full px-3 py-2 rounded-lg"
            required
          >
            <option value="">Select a claim...</option>
            {claims.map(claim => (
              <option key={claim.id} value={claim.id}>
                {claim.reg} - {claim.make_model} ({claim.job_number || 'No ref'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Part Description *</label>
          <Input
            value={formData.part_description}
            onChange={(e) => setFormData(prev => ({ ...prev, part_description: e.target.value }))}
            placeholder="e.g. Front bumper, headlight, wing mirror..."
            className="neomorph-inset"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Part Number (if known)</label>
            <Input
              value={formData.part_number}
              onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
              placeholder="OEM part number"
              className="neomorph-inset"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Manufacturer</label>
            <Input
              value={formData.manufacturer}
              onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
              placeholder="e.g. Ford, BMW..."
              className="neomorph-inset"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Additional Comments</label>
          <Textarea
            value={formData.additional_comments}
            onChange={(e) => setFormData(prev => ({ ...prev, additional_comments: e.target.value }))}
            placeholder="Any specific requirements or notes..."
            className="neomorph-inset"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" onClick={onClose} className="neomorph-flat">
            Cancel
          </Button>
          <Button
            type="submit"
            className="neomorph-flat bg-accent/10 text-accent"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}