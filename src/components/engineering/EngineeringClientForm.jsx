import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EngineeringClientForm({ job, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    client_name: job.client_name || '',
    client_phone: job.client_phone || '',
    client_email: job.client_email || '',
    insurer: job.insurer || '',
    claim_ref: job.claim_ref || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-2">Client Name</label>
        <Input
          value={formData.client_name}
          onChange={(e) => setFormData({...formData, client_name: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Client Phone</label>
        <Input
          value={formData.client_phone}
          onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Client Email</label>
        <Input
          type="email"
          value={formData.client_email}
          onChange={(e) => setFormData({...formData, client_email: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Insurer</label>
        <Input
          value={formData.insurer}
          onChange={(e) => setFormData({...formData, insurer: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Claim Reference</label>
        <Input
          value={formData.claim_ref}
          onChange={(e) => setFormData({...formData, claim_ref: e.target.value})}
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