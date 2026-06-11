import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InsurerCombobox from '../shared/InsurerCombobox';
import BrokerCombobox from '../shared/BrokerCombobox';

export default function ClaimInsuranceForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        broker_id: claim.broker_id || '',
        broker_name: claim.broker_name || '',
        insurer: claim.insurer || '',
        claim_ref: claim.claim_ref || '',
        policy_number: claim.policy_number || '',
        policy_excess: claim.policy_excess || 0,
    });

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleBrokerSelect = (broker) => {
        if (!broker) { set('broker_id', ''); set('broker_name', ''); return; }
        setFormData(prev => ({ ...prev, broker_id: broker.id, broker_name: broker.name }));
    };

    return (
        <div className="space-y-4 pt-4">
            <div>
                <label className="text-sm text-gray-500">Broker</label>
                <BrokerCombobox value={formData.broker_name} onChange={handleBrokerSelect} />
            </div>
            <div>
                <label className="text-sm text-gray-500">Insurer</label>
                <InsurerCombobox value={formData.insurer} onChange={value => set('insurer', value)} />
            </div>
            <div>
                <label className="text-sm text-gray-500">Claim Reference</label>
                <Input value={formData.claim_ref} onChange={e => set('claim_ref', e.target.value)} className="neomorph-inset" />
            </div>
            <div>
                <label className="text-sm text-gray-500">Policy Number</label>
                <Input value={formData.policy_number} onChange={e => set('policy_number', e.target.value)} className="neomorph-inset" />
            </div>
            <div>
                <label className="text-sm text-gray-500">Policy Excess (£)</label>
                <Input type="number" step="0.01" value={formData.policy_excess} onChange={e => set('policy_excess', parseFloat(e.target.value) || 0)} className="neomorph-inset" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} variant="outline">Cancel</Button>
                <Button onClick={() => onSave(formData)} className="bg-primary text-primary-foreground">Save Changes</Button>
            </div>
        </div>
    );
}