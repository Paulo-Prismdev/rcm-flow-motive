import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InsurerCombobox from '../shared/InsurerCombobox';

export default function ClaimInsuranceForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        insurer: claim.insurer || '',
        claim_ref: claim.claim_ref || '',
        policy_number: claim.policy_number || '',
        policy_excess: claim.policy_excess || 0,
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="space-y-4">
                 <div>
                    <label className="text-sm text-gray-500">Insurer</label>
                    <InsurerCombobox value={formData.insurer} onChange={value => handleChange('insurer', value)} />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Claim Reference</label>
                    <Input value={formData.claim_ref} onChange={e => handleChange('claim_ref', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Policy Number</label>
                    <Input value={formData.policy_number} onChange={e => handleChange('policy_number', e.target.value)} className="neomorph-inset" />
                </div>
                 <div>
                    <label className="text-sm text-gray-500">Policy Excess (£)</label>
                    <Input type="number" step="0.01" value={formData.policy_excess} onChange={e => handleChange('policy_excess', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
            </div>
        </div>
    );
}