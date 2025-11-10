import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ManufacturerModelCombobox from '../shared/ManufacturerModelCombobox';

export default function EngineeringJobForm({ job, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    reference: job.reference || '',
    vehicle_reg: job.vehicle_reg || '',
    make_model: job.make_model || '',
    vehicle_location: job.vehicle_location || '',
    inspection_type: job.inspection_type || 'Pre-repair Assessment',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-2">Reference</label>
        <Input
          value={formData.reference}
          onChange={(e) => setFormData({...formData, reference: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Vehicle Registration</label>
        <Input
          value={formData.vehicle_reg}
          onChange={(e) => setFormData({...formData, vehicle_reg: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Make/Model</label>
        <ManufacturerModelCombobox
          value={formData.make_model}
          onChange={(value) => setFormData({...formData, make_model: value})}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Vehicle Location</label>
        <Input
          value={formData.vehicle_location}
          onChange={(e) => setFormData({...formData, vehicle_location: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Inspection Type</label>
        <select
          value={formData.inspection_type}
          onChange={(e) => setFormData({...formData, inspection_type: e.target.value})}
          className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
        >
          <option>Pre-repair Assessment</option>
          <option>Post-repair Inspection</option>
          <option>Total Loss Assessment</option>
          <option>Engineering Report</option>
          <option>Dispute Resolution</option>
          <option>Other</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-2">Cancel</Button>
        <Button type="submit" className="neomorph-flat px-6 py-2 text-blue-600">Save</Button>
      </div>
    </form>
  );
}