import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Package, X } from 'lucide-react';

export default function RepairerPartsForm({ bodyshopId, bodyshopName, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    vehicle_ref: '',
    manufacturer: '',
    part_description: '',
    part_number: '',
    part_type: '',
    delivery_address: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const part = await base44.entities.Part.create({
        vehicle_ref: data.vehicle_ref,
        manufacturer: data.manufacturer,
        part_description: data.part_description,
        part_number: data.part_number,
        part_type: data.part_type,
        bodyshop_company: bodyshopName,
        bodyshop_company_id: bodyshopId,
        delivery_address: data.delivery_address,
        additional_comments: data.notes,
        sourcing_status: 'New Request',
        date_requested: new Date().toISOString().split('T')[0],
      });

      // Notify all admin and internal users
      const allUsers = await base44.entities.User.list();
      const recipients = allUsers.filter(u => u.role === 'admin' || u.user_type === 'internal');
      await Promise.all(recipients.map(u =>
        base44.entities.Notification.create({
          user_email: u.email,
          title: 'New Parts Request',
          message: `${bodyshopName} has requested parts support for ${data.vehicle_ref} - ${data.part_description}`,
          type: 'parts_update',
          related_item_type: 'Part',
          related_item_id: part.id,
          link: `/parts?id=${part.id}`,
          is_read: false,
        })
      ));

      return part;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairerParts'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
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
          <Package className="w-6 h-6 text-accent" />
          <h3 className="font-bold text-lg">Request Parts Support</h3>
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
              value={formData.vehicle_ref}
              onChange={(e) => handleChange('vehicle_ref', e.target.value.toUpperCase())}
              placeholder="e.g., AB12 CDE"
              className="neomorph-inset"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Manufacturer *</label>
            <Input
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="e.g., Ford, BMW, Toyota"
              className="neomorph-inset"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Part Description *</label>
            <Input
              value={formData.part_description}
              onChange={(e) => handleChange('part_description', e.target.value)}
              placeholder="e.g., Front Bumper, Headlight LH, Bonnet"
              className="neomorph-inset"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Part Number (if known)</label>
            <Input
              value={formData.part_number}
              onChange={(e) => handleChange('part_number', e.target.value)}
              placeholder="OEM part number"
              className="neomorph-inset"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Part Type Preference</label>
            <select
              value={formData.part_type}
              onChange={(e) => handleChange('part_type', e.target.value)}
              className="neomorph-inset w-full px-3 py-2 rounded-lg"
            >
              <option value="">Any</option>
              <option value="OEM">OEM (Original)</option>
              <option value="Aftermarket">Aftermarket</option>
              <option value="Recycled">Recycled / Green Parts</option>
              <option value="Refurbished">Refurbished</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Delivery Address</label>
            <Input
              value={formData.delivery_address}
              onChange={(e) => handleChange('delivery_address', e.target.value)}
              placeholder="Where should parts be delivered?"
              className="neomorph-inset"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Additional Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional information (urgency, colour codes, etc.)..."
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
            disabled={createMutation.isPending || !formData.vehicle_ref || !formData.manufacturer || !formData.part_description}
            className="neomorph-flat flex-1 bg-accent text-accent-foreground"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}