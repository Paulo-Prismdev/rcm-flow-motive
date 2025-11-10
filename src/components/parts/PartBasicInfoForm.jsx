import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ManufacturerModelCombobox from '../shared/ManufacturerModelCombobox';

export default function PartBasicInfoForm({ part, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    vehicle_ref: part.vehicle_ref || '',
    manufacturer: part.manufacturer || '',
    part_description: part.part_description || '',
    part_number: part.part_number || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-2">Vehicle Reference</label>
        <Input
          value={formData.vehicle_ref}
          onChange={(e) => setFormData({...formData, vehicle_ref: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Manufacturer & Model</label>
        <ManufacturerModelCombobox
          value={formData.manufacturer}
          onChange={(value) => setFormData({...formData, manufacturer: value})}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Part Description</label>
        <Input
          value={formData.part_description}
          onChange={(e) => setFormData({...formData, part_description: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Part Number</label>
        <Input
          value={formData.part_number}
          onChange={(e) => setFormData({...formData, part_number: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-2">Cancel</Button>
        <Button type="submit" className="neomorph-flat px-6 py-2 text-blue-600">Save</Button>
      </div>
    </form>
  );
}