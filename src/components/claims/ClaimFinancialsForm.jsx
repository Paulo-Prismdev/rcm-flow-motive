import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClaimFinancialsForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        final_repair_cost: claim.final_repair_cost ?? '',
        referral_fee_repairer: claim.referral_fee_repairer ?? '',
        total_invoice_repairer: claim.total_invoice_repairer ?? '',
        invoice_status: claim.invoice_status || 'Not Ready for Invoicing',
        invoice_amount: claim.invoice_amount ?? '',
        invoice_notes: claim.invoice_notes || '',
        external_invoice_ref: claim.external_invoice_ref || '',
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const data = { ...formData };
        ['final_repair_cost', 'referral_fee_repairer', 'total_invoice_repairer', 'invoice_amount'].forEach(f => {
            data[f] = data[f] !== '' ? parseFloat(data[f]) : null;
        });
        onSave(data);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-gray-500">Final Repair Cost (£)</label>
                    <Input type="number" step="0.01" value={formData.final_repair_cost} onChange={e => handleChange('final_repair_cost', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Repairer Referral Fee (%)</label>
                    <Input type="number" step="0.01" value={formData.referral_fee_repairer} onChange={e => handleChange('referral_fee_repairer', e.target.value)} className="neomorph-inset" placeholder="e.g. 20" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Total Invoice to Repairer (£)</label>
                    <Input type="number" step="0.01" value={formData.total_invoice_repairer} onChange={e => handleChange('total_invoice_repairer', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Invoice Amount (£)</label>
                    <Input type="number" step="0.01" value={formData.invoice_amount} onChange={e => handleChange('invoice_amount', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">External Invoice Ref</label>
                    <Input value={formData.external_invoice_ref} onChange={e => handleChange('external_invoice_ref', e.target.value)} className="neomorph-inset" />
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
            {/* Invoice Notes - full width */}
            <div>
                <label className="text-sm text-gray-500">Invoice Notes</label>
                <textarea value={formData.invoice_notes} onChange={e => handleChange('invoice_notes', e.target.value)} className="neomorph-inset w-full px-3 py-2 rounded-xl border-0 min-h-[80px]" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} variant="outline">Cancel</Button>
                <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
            </div>
        </div>
    );
}