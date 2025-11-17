import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ClaimExcessContributionForm({ claim, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    excess_contribution_amount: claim.excess_contribution_amount || 0,
    excess_contribution_method: claim.excess_contribution_method || 'None',
    excess_contribution_paid: claim.excess_contribution_paid || false,
    excess_contribution_paid_date: claim.excess_contribution_paid_date || '',
    excess_contribution_invoice_received: claim.excess_contribution_invoice_received || false,
    excess_contribution_notes: claim.excess_contribution_notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handlePaidCheckboxChange = (checked) => {
    setFormData({ 
      ...formData, 
      excess_contribution_paid: checked,
      excess_contribution_paid_date: checked ? new Date().toISOString().split('T')[0] : formData.excess_contribution_paid_date
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Contribution Amount (£)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.excess_contribution_amount}
            onChange={(e) => setFormData({ ...formData, excess_contribution_amount: parseFloat(e.target.value) || 0 })}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Payment Method</label>
          <select
            value={formData.excess_contribution_method}
            onChange={(e) => setFormData({ ...formData, excess_contribution_method: e.target.value })}
            className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
          >
            <option value="None">No Contribution</option>
            <option value="Via Repairer">Via Repairer (Repairer takes excess less our contribution)</option>
            <option value="Direct to Client">Direct to Client (Client paid full excess, we reimburse)</option>
          </select>
        </div>
      </div>

      {formData.excess_contribution_method !== 'None' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="excess_contribution_paid"
                checked={formData.excess_contribution_paid}
                onChange={(e) => handlePaidCheckboxChange(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="excess_contribution_paid" className="text-sm text-gray-600">
                Contribution Paid
              </label>
            </div>

            {formData.excess_contribution_paid && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Date Paid</label>
                <Input
                  type="date"
                  value={formData.excess_contribution_paid_date}
                  onChange={(e) => setFormData({ ...formData, excess_contribution_paid_date: e.target.value })}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                />
              </div>
            )}
          </div>

          {formData.excess_contribution_method === 'Via Repairer' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="excess_contribution_invoice_received"
                checked={formData.excess_contribution_invoice_received}
                onChange={(e) => setFormData({ ...formData, excess_contribution_invoice_received: e.target.checked })}
                className="w-5 h-5"
              />
              <label htmlFor="excess_contribution_invoice_received" className="text-sm text-gray-600">
                Invoice Received from Repairer
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-2">Notes</label>
            <Textarea
              value={formData.excess_contribution_notes}
              onChange={(e) => setFormData({ ...formData, excess_contribution_notes: e.target.value })}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
              placeholder="Any additional notes about the excess contribution..."
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-3">
          Cancel
        </Button>
        <Button type="submit" className="neomorph-flat px-6 py-3 text-blue-600">
          Save Changes
        </Button>
      </div>
    </form>
  );
}