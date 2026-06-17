import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ClaimExcessContributionForm({ claim, onSave, onCancel }) {
  const isApplicable = claim.excess_contribution_method && claim.excess_contribution_method !== 'None';

  const [formData, setFormData] = useState({
    excess_contribution_amount: claim.excess_contribution_amount || 0,
    excess_contribution_method: claim.excess_contribution_method || 'None',
    excess_contribution_paid: claim.excess_contribution_paid || false,
    excess_contribution_paid_date: claim.excess_contribution_paid_date || '',
    excess_contribution_invoice_received: claim.excess_contribution_invoice_received || false,
    excess_contribution_notes: claim.excess_contribution_notes || '',
  });

  const [applicable, setApplicable] = useState(isApplicable);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!applicable) {
      onSave({
        excess_contribution_method: 'None',
        excess_contribution_amount: 0,
        excess_contribution_paid: false,
        excess_contribution_paid_date: '',
        excess_contribution_invoice_received: false,
        excess_contribution_notes: '',
      });
      return;
    }
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
      {/* Applicable toggle */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <label className="block text-sm font-medium text-foreground mb-3">Is excess contribution applicable?</label>
        <div className="flex gap-3">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${!applicable ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700' : 'bg-card border-border hover:bg-muted'}`}>
            <input type="radio" name="applicable" checked={!applicable} onChange={() => { setApplicable(false); setFormData(prev => ({ ...prev, excess_contribution_method: 'None' })); }} className="w-4 h-4" />
            <span className="text-sm font-medium">No</span>
          </label>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${applicable ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : 'bg-card border-border hover:bg-muted'}`}>
            <input type="radio" name="applicable" checked={applicable} onChange={() => setApplicable(true)} className="w-4 h-4" />
            <span className="text-sm font-medium">Yes</span>
          </label>
        </div>
      </div>

      {applicable && (
        <>
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
                <option value="Direct to Client">Direct to Client (Client paid full excess, we reimburse)</option>
                <option value="Via Repairer">Via Repairer (Repairer takes excess less our contribution)</option>
              </select>
            </div>
          </div>

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