import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EstimateDatesForm({ estimate, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    date_received: estimate.date_received || '',
    date_estimate_completed: estimate.date_estimate_completed || '',
    date_authorised: estimate.date_authorised || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-2">Date Received</label>
        <Input
          type="date"
          value={formData.date_received}
          onChange={(e) => setFormData({...formData, date_received: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Estimate Completed</label>
        <Input
          type="date"
          value={formData.date_estimate_completed}
          onChange={(e) => setFormData({...formData, date_estimate_completed: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Date Authorised</label>
        <Input
          type="date"
          value={formData.date_authorised}
          onChange={(e) => setFormData({...formData, date_authorised: e.target.value})}
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