import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CreditRepairCombobox from '../shared/CreditRepairCombobox';

export default function ClaimCreditRepairForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        credit_repair_company_id: claim.credit_repair_company_id || '',
        credit_repair_company_name: claim.credit_repair_company_name || '',
        credit_repair_company_contact_name: claim.credit_repair_company_contact_name || '',
        credit_repair_company_phone: claim.credit_repair_company_phone || '',
        credit_repair_company_email: claim.credit_repair_company_email || '',
        credit_repair_company_account_ref: claim.credit_repair_company_account_ref || '',
    });

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleCreditRepairSelect = (company) => {
        if (!company) {
            setFormData(prev => ({
                ...prev,
                credit_repair_company_id: '',
                credit_repair_company_name: '',
                credit_repair_company_contact_name: '',
                credit_repair_company_phone: '',
                credit_repair_company_email: '',
                credit_repair_company_account_ref: '',
            }));
            return;
        }
        setFormData(prev => ({
            ...prev,
            credit_repair_company_id: company.id,
            credit_repair_company_name: company.name,
            credit_repair_company_contact_name: company.contact_name || '',
            credit_repair_company_phone: company.phone || '',
            credit_repair_company_email: company.email || '',
            credit_repair_company_account_ref: company.account_reference || '',
        }));
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Credit Repair Claim</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    This claim is handled via a credit repair company. The company details below will be passed to the repairer on the instruction instead of the client's insurer.
                </p>
            </div>
            <div>
                <label className="text-sm text-gray-500">Credit Repair Company</label>
                <CreditRepairCombobox
                    value={formData.credit_repair_company_name}
                    onChange={handleCreditRepairSelect}
                    placeholder="Select credit repair company..."
                />
            </div>
            <div>
                <label className="text-sm text-gray-500">Credit Repair Contact Name</label>
                <Input value={formData.credit_repair_company_contact_name} onChange={e => set('credit_repair_company_contact_name', e.target.value)} className="neomorph-inset" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm text-gray-500">Credit Repair Phone</label>
                    <Input value={formData.credit_repair_company_phone} onChange={e => set('credit_repair_company_phone', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Credit Repair Email</label>
                    <Input value={formData.credit_repair_company_email} onChange={e => set('credit_repair_company_email', e.target.value)} className="neomorph-inset" />
                </div>
            </div>
            <div>
                <label className="text-sm text-gray-500">Credit Repair Account Ref</label>
                <Input value={formData.credit_repair_company_account_ref} onChange={e => set('credit_repair_company_account_ref', e.target.value)} className="neomorph-inset" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} variant="outline">Cancel</Button>
                <Button onClick={() => onSave(formData)} className="bg-primary text-primary-foreground">Save Changes</Button>
            </div>
        </div>
    );
}