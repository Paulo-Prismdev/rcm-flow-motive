import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClaimEstimateForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        audatex_code: claim.audatex_code || '',
        artura_est_url: claim.artura_est_url || '',
        est_fee: claim.est_fee || 0,
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
                    <label className="text-sm text-gray-500">Audatex Code</label>
                    <Input 
                        value={formData.audatex_code} 
                        onChange={e => handleChange('audatex_code', e.target.value)} 
                        className="neomorph-inset" 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Artura Est. URL</label>
                    <Input 
                        value={formData.artura_est_url} 
                        onChange={e => handleChange('artura_est_url', e.target.value)} 
                        className="neomorph-inset" 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Estimate Fee</label>
                    <Input 
                        type="number"
                        step="0.01"
                        value={formData.est_fee || ''} 
                        onChange={e => handleChange('est_fee', parseFloat(e.target.value) || 0)} 
                        className="neomorph-inset" 
                    />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
            </div>
        </div>
    );
}