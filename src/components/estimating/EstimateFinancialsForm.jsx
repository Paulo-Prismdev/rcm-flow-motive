import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EstimateFinancialsForm({ estimate, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    estimate_value: estimate.estimate_value || 0,
    authorised_value: estimate.authorised_value || 0,
    fee: estimate.fee || 0,
    labour_rate_agreed: estimate.labour_rate_agreed || 0,
    parts_cost: estimate.parts_cost || 0,
    final_authorised_inc_vat: estimate.final_authorised_inc_vat || 0,
    final_authorised_exc_vat: estimate.final_authorised_exc_vat || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Estimate Value</label>
          <Input
            type="number"
            step="0.01"
            value={formData.estimate_value}
            onChange={(e) => setFormData({...formData, estimate_value: parseFloat(e.target.value) || 0})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Authorised Value</label>
          <Input
            type="number"
            step="0.01"
            value={formData.authorised_value}
            onChange={(e) => setFormData({...formData, authorised_value: parseFloat(e.target.value) || 0})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Fee</label>
          <Input
            type="number"
            step="0.01"
            value={formData.fee}
            onChange={(e) => setFormData({...formData, fee: parseFloat(e.target.value) || 0})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Labour Rate Agreed</label>
          <Input
            type="number"
            step="0.01"
            value={formData.labour_rate_agreed}
            onChange={(e) => setFormData({...formData, labour_rate_agreed: parseFloat(e.target.value) || 0})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Parts Cost</label>
          <Input
            type="number"
            step="0.01"
            value={formData.parts_cost}
            onChange={(e) => setFormData({...formData, parts_cost: parseFloat(e.target.value) || 0})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Final Auth (inc VAT)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.final_authorised_inc_vat}
            onChange={(e) => setFormData({...formData, final_authorised_inc_vat: parseFloat(e.target.value) || 0})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Final Auth (ex VAT)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.final_authorised_exc_vat}
            onChange={(e) => setFormData({...formData, final_authorised_exc_vat: parseFloat(e.target.value) || 0})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-2">Cancel</Button>
        <Button type="submit" className="neomorph-flat px-6 py-2 text-blue-600">Save</Button>
      </div>
    </form>
  );
}