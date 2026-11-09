import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AddressLookupInput from '../shared/AddressLookupInput';
import { COURTESY_CAR_OPTIONS } from '../shared/courtesyCarOptions';
import { hireInvoicedSwitch, hireInvoicedPatch } from '../shared/hireCharge';

export default function ClaimVehicleDamageForm({ claim, onSave, onCancel, mode = 'damage' }) {
  const isLocationOnly = mode === 'location';

  const [formData, setFormData] = useState({
    vehicle_damage: claim.vehicle_damage || '',
    courtesy_car_required: claim.courtesy_car_required === true ? 'Yes' : (claim.courtesy_car_required || 'No'),
    hire_invoiced: hireInvoicedSwitch(claim),
    unroadworthy: claim.unroadworthy || false,
    vehicle_location: claim.vehicle_location || ''
  });

  const handleVehicleLocationChange = (addressData) => {
    setFormData((prev) => ({
      ...prev,
      vehicle_location: addressData.display_name || addressData.address || ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { hire_invoiced: hireSwitch, ...claimFields } = formData;
    // The hire switch is saved into the claim's invoicing tracker, not as a field.
    const hirePatch = isLocationOnly ? null : hireInvoicedPatch(claim, hireSwitch);
    onSave(hirePatch ? { ...claimFields, ...hirePatch } : claimFields);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isLocationOnly &&
      <div>
          <label className="block text-sm font-medium mb-2">Damage Description</label>
          <Textarea
          value={formData.vehicle_damage}
          onChange={(e) => setFormData({ ...formData, vehicle_damage: e.target.value })}
          placeholder="Describe the vehicle damage..."
          className="neomorph-inset min-h-[100px]" />
        
        </div>
      }

      <div>
        <label className="block text-sm font-medium mb-2">Vehicle Location</label>
        <AddressLookupInput
          value={formData.vehicle_location}
          onChange={handleVehicleLocationChange}
          placeholder="Start typing address or postcode..."
          className="neomorph-inset" />
        
      </div>

      {!isLocationOnly &&
      <>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium">Courtesy Car (CC) Required</span>
              <select
                value={formData.courtesy_car_required || 'No'}
                onChange={(e) => setFormData({ ...formData, courtesy_car_required: e.target.value })}
                className="px-3 py-1.5 text-sm rounded-lg border border-input bg-card text-foreground"
              >
                {COURTESY_CAR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium">Hire to Invoice</span>
              <select
                value={formData.hire_invoiced}
                onChange={(e) => setFormData({ ...formData, hire_invoiced: e.target.value })}
                className="px-3 py-1.5 text-sm rounded-lg border border-input bg-card text-foreground"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
              type="checkbox"
              checked={formData.unroadworthy}
              onChange={(e) => setFormData({ ...formData, unroadworthy: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300" />
            
              <span className="text-sm font-medium">Vehicle Unroadworthy / Undriveable</span>
            </label>
          </div>
        </>
      }

      <div className="flex gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat flex-1 bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
          Cancel
        </Button>
        <Button type="submit" className="neomorph-flat bg-accent/10 text-accent flex-1">
          Save Changes
        </Button>
      </div>
    </form>);

}