import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calculator, X } from 'lucide-react';

export default function RepairerEstimateForm({ bodyshopId, bodyshopName, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    vehicle_reg: '',
    make_model: '',
    claim_number: '',
    insurer_work_provider: '',
    job_type: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const estimate = await base44.entities.Estimate.create({
        name: data.vehicle_reg,
        make_model: data.make_model,
        claim_number: data.claim_number,
        insurer_work_provider: data.insurer_work_provider,
        job_type: data.job_type,
        repairer: bodyshopName,
        repairer_id: bodyshopId,
        status: 'New',
        date_received: new Date().toISOString().split('T')[0],
        authority_notes: data.notes,
        priority: 'Medium',
      });

      // Create notification for internal users
      await base44.entities.Notification.create({
        user_email: 'admin@artech.com', // This should be configurable
        title: 'New Estimate Request',
        message: `${bodyshopName} has requested an estimate for ${data.vehicle_reg} - ${data.make_model}`,
        type: 'estimate_request',
        related_item_type: 'Estimate',
        related_item_id: estimate.id,
        link: `/estimating?id=${estimate.id}`,
        is_read: false,
      });

      return estimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairerEstimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="neomorph p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-accent" />
          <h3 className="font-bold text-lg">Request an Estimate</h3>
        </div>
        <button onClick={onClose} className="neomorph-flat p-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle Registration *</label>
            <Input
              value={formData.vehicle_reg}
              onChange={(e) => handleChange('vehicle_reg', e.target.value.toUpperCase())}
              placeholder="e.g., AB12 CDE"
              className="neomorph-inset"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Make / Model *</label>
            <Input
              value={formData.make_model}
              onChange={(e) => handleChange('make_model', e.target.value)}
              placeholder="e.g., Ford Focus"
              className="neomorph-inset"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Insurer / Work Provider</label>
            <Input
              value={formData.insurer_work_provider}
              onChange={(e) => handleChange('insurer_work_provider', e.target.value)}
              placeholder="e.g., Aviva"
              className="neomorph-inset"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Claim Number</label>
            <Input
              value={formData.claim_number}
              onChange={(e) => handleChange('claim_number', e.target.value)}
              placeholder="Insurer claim reference"
              className="neomorph-inset"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Job Type</label>
            <select
              value={formData.job_type}
              onChange={(e) => handleChange('job_type', e.target.value)}
              className="neomorph-inset w-full px-3 py-2 rounded-lg"
            >
              <option value="">Select type...</option>
              <option value="Initial Estimate">Initial Estimate</option>
              <option value="Supplement">Supplement</option>
              <option value="Re-inspection">Re-inspection</option>
              <option value="Total Loss">Total Loss</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Additional Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional information about the vehicle or damage..."
            className="neomorph-inset min-h-[100px]"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            className="neomorph-flat flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || !formData.vehicle_reg || !formData.make_model}
            className="neomorph-flat flex-1 bg-accent text-accent-foreground"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}