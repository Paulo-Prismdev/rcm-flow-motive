import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2 } from 'lucide-react';

export default function ClaimFinancialsForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        final_repair_cost: claim.final_repair_cost ?? '',
        invoice_notes: claim.invoice_notes || '',
        external_invoice_ref: claim.external_invoice_ref || '',
        credit_repair_referral_fee_gbp: claim.credit_repair_referral_fee_gbp ?? '',
        credit_repair_referral_fee_received: claim.credit_repair_referral_fee_received || false,
        credit_repair_referral_fee_received_date: claim.credit_repair_referral_fee_received_date || '',
    });

    const isCreditRepair = claim.claim_type === 'Credit Repair';

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const data = { ...formData };
        ['final_repair_cost', 'credit_repair_referral_fee_gbp'].forEach(f => {
            data[f] = data[f] !== '' ? parseFloat(data[f]) : null;
        });
        if (!isCreditRepair) {
            delete data.credit_repair_referral_fee_gbp;
            delete data.credit_repair_referral_fee_received;
            delete data.credit_repair_referral_fee_received_date;
        }
        onSave(data);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-gray-500">Final Repair Cost inc VAT (£)</label>
                    <Input type="number" step="0.01" value={formData.final_repair_cost} onChange={e => handleChange('final_repair_cost', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">External Invoice Ref</label>
                    <Input value={formData.external_invoice_ref} onChange={e => handleChange('external_invoice_ref', e.target.value)} className="neomorph-inset" />
                </div>
            </div>

            {/* Credit Repair Referral Fee section — only for Credit Repair claims */}
            {isCreditRepair && (
                <div className="rounded-[10px] border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-900/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-1">
                        <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                            Credit Repair Referral Fee
                        </h4>
                        {claim.credit_repair_company_name && (
                            <span className="text-xs text-purple-500 dark:text-purple-400 truncate">
                                — {claim.credit_repair_company_name}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground -mt-1">
                        The referral amount we expect to receive from the credit repair company for this claim.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-gray-500">Referral Amount (£)</label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.credit_repair_referral_fee_gbp}
                                onChange={e => handleChange('credit_repair_referral_fee_gbp', e.target.value)}
                                className="neomorph-inset"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-500">Fee Received?</label>
                            <select
                                className="neomorph-inset w-full h-11 lg:h-9 px-3 rounded-xl text-sm bg-transparent border border-border"
                                value={formData.credit_repair_referral_fee_received ? 'Yes' : 'No'}
                                onChange={e => handleChange('credit_repair_referral_fee_received', e.target.value === 'Yes')}
                            >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-500">Date Received</label>
                            <Input
                                type="date"
                                value={formData.credit_repair_referral_fee_received_date}
                                onChange={e => handleChange('credit_repair_referral_fee_received_date', e.target.value)}
                                className="neomorph-inset"
                                disabled={!formData.credit_repair_referral_fee_received}
                            />
                        </div>
                    </div>
                </div>
            )}

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