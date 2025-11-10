import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ManufacturerModelCombobox from '../shared/ManufacturerModelCombobox';

export default function EstimateJobForm({ estimate, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: estimate.name || '',
    make_model: estimate.make_model || '',
    vda: estimate.vda || '',
    insurer_work_provider: estimate.insurer_work_provider || '',
    claim_number: estimate.claim_number || '',
    authorising_party: estimate.authorising_party || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-2">Job Reference</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
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
        <label className="block text-sm text-gray-600 mb-2">VDA</label>
        <Input
          value={formData.vda}
          onChange={(e) => setFormData({...formData, vda: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Insurer/Work Provider</label>
        <Input
          value={formData.insurer_work_provider}
          onChange={(e) => setFormData({...formData, insurer_work_provider: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Claim Number</label>
        <Input
          value={formData.claim_number}
          onChange={(e) => setFormData({...formData, claim_number: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Authorising Party</label>
        <Input
          value={formData.authorising_party}
          onChange={(e) => setFormData({...formData, authorising_party: e.target.value})}
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