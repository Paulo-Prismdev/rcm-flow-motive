import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AddressLookupInput from '../shared/AddressLookupInput';

export default function ClaimVehicleDamageForm({ claim, onSave, onCancel, mode = 'damage' }) {
  const isLocationOnly = mode === 'location';

  const [formData, setFormData] = useState({
    vehicle_damage: claim.vehicle_damage || '',
    courtesy_car_required: claim.courtesy_car_required || false,
    unroadworthy: claim.unroadworthy || false,
    vehicle_location: claim.vehicle_location || '',
  });

  const handleVehicleLocationChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      vehicle_location: addressData.display_name || addressData.address || ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isLocationOnly && (
        <div>
          <label className="block text-sm font-medium mb-2">Damage Description</label>
          <Textarea
            value={formData.vehicle_damage}
            onChange={(e) => setFormData({ ...formData, vehicle_damage: e.target.value })}
            placeholder="Describe the vehicle damage..."
            className="neomorph-inset min-h-[100px]"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Vehicle Location</label>
        <AddressLookupInput
          value={formData.vehicle_location}
          onChange={handleVehicleLocationChange}
          placeholder="Start typing address or postcode..."
          className="neomorph-inset"
        />
      </div>

      {!isLocationOnly && (
        <>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.courtesy_car_required}
                onChange={(e) => setFormData({ ...formData, courtesy_car_required: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Courtesy Car (CC) Required</span>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.unroadworthy}
                onChange={(e) => setFormData({ ...formData, unroadworthy: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Vehicle Unroadworthy / Undriveable</span>
            </label>
          </div>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat flex-1">
          Cancel
        </Button>
        <Button type="submit" className="neomorph-flat bg-accent/10 text-accent flex-1">
          Save Changes
        </Button>
      </div>
    </form>
  );
}