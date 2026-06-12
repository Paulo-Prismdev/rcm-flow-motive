import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClaimEstimateForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        audatex_code: claim.audatex_code || '',
        artura_est_url: claim.artura_est_url || '',
        est_fee: claim.est_fee ?? '',
        authorising_party: claim.authorising_party || '',
        estimate_cost_net: claim.estimate_cost_net ?? '',
        authority_cost_net: claim.authority_cost_net ?? '',
        estimate_cost_gross: claim.estimate_cost_gross ?? '',
        authority_cost_gross: claim.authority_cost_gross ?? '',
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const data = { ...formData };
        ['est_fee', 'estimate_cost_net', 'authority_cost_net', 'estimate_cost_gross', 'authority_cost_gross'].forEach(f => {
            data[f] = data[f] !== '' ? parseFloat(data[f]) : null;
        });
        onSave(data);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-gray-500">Audatex Code</label>
                    <Input value={formData.audatex_code} onChange={e => handleChange('audatex_code', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Estimate Fee (£)</label>
                    <Input type="number" step="0.01" value={formData.est_fee} onChange={e => handleChange('est_fee', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Authorising Party</label>
                    <Input value={formData.authorising_party} onChange={e => handleChange('authorising_party', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Artura Est. URL</label>
                    <Input value={formData.artura_est_url} onChange={e => handleChange('artura_est_url', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Est. Cost (Net) (£)</label>
                    <Input type="number" step="0.01" value={formData.estimate_cost_net} onChange={e => handleChange('estimate_cost_net', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Auth. Cost (Net) (£)</label>
                    <Input type="number" step="0.01" value={formData.authority_cost_net} onChange={e => handleChange('authority_cost_net', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Est. Cost (Gross) (£)</label>
                    <Input type="number" step="0.01" value={formData.estimate_cost_gross} onChange={e => handleChange('estimate_cost_gross', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Auth. Cost (Gross) (£)</label>
                    <Input type="number" step="0.01" value={formData.authority_cost_gross} onChange={e => handleChange('authority_cost_gross', e.target.value)} className="neomorph-inset" />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} variant="outline">Cancel</Button>
                <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
            </div>
        </div>
    );
}