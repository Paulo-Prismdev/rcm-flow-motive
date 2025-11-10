import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClaimFinancialsForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        estimate_cost_net: claim.estimate_cost_net || 0,
        authority_cost_net: claim.authority_cost_net || 0,
        estimate_cost_gross: claim.estimate_cost_gross || 0,
        authority_cost_gross: claim.authority_cost_gross || 0,
        final_repair_cost: claim.final_repair_cost || 0,
        total_invoice_repairer: claim.total_invoice_repairer || 0,
        referral_fee_repairer: claim.referral_fee_repairer || 0,
        invoice_status: claim.invoice_status || 'Not Ready for Invoicing',
        invoice_amount: claim.invoice_amount || 0,
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-gray-500">Est. Cost (Net)</label>
                    <Input type="number" value={formData.estimate_cost_net} onChange={e => handleChange('estimate_cost_net', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Auth. Cost (Net)</label>
                    <Input type="number" value={formData.authority_cost_net} onChange={e => handleChange('authority_cost_net', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
                </div>
                 <div>
                    <label className="text-sm text-gray-500">Est. Cost (Gross)</label>
                    <Input type="number" value={formData.estimate_cost_gross} onChange={e => handleChange('estimate_cost_gross', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Auth. Cost (Gross)</label>
                    <Input type="number" value={formData.authority_cost_gross} onChange={e => handleChange('authority_cost_gross', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Final Repair Cost</label>
                    <Input type="number" value={formData.final_repair_cost} onChange={e => handleChange('final_repair_cost', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Repairer Referral Fee (%)</label>
                    <Input type="number" step="0.01" value={formData.referral_fee_repairer} onChange={e => handleChange('referral_fee_repairer', parseFloat(e.target.value) || 0)} className="neomorph-inset" placeholder="e.g. 15.5" />
                </div>
                 <div>
                    <label className="text-sm text-gray-500">Invoice Amount</label>
                    <Input type="number" value={formData.invoice_amount} onChange={e => handleChange('invoice_amount', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Invoice Status</label>
                     <select value={formData.invoice_status} onChange={e => handleChange('invoice_status', e.target.value)} className="neomorph-inset w-full px-3 py-2 rounded-xl border-0">
                        <option>Not Ready for Invoicing</option>
                        <option>Ready to Invoice</option>
                        <option>Invoice Required - Pending</option>
                        <option>Invoiced</option>
                        <option>Invoice Paid</option>
                        <option>Invoice Overdue</option>
                        <option>Not Applicable</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
            </div>
        </div>
    );
}