import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReferrerCombobox from '../shared/ReferrerCombobox';

export default function ClaimReferrerForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState(claim || {});

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleReferrerChange = (referrer) => {
        setFormData(prev => ({
            ...prev,
            referrer: referrer.name,
            referrer_id: referrer.id,
            referrer_email: referrer.email || referrer.contact_email || ''
        }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-500">Referrer</label>
                    <ReferrerCombobox 
                        value={formData.referrer} 
                        onChange={handleReferrerChange} 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Referrer Email</label>
                    <Input 
                        type="email"
                        value={formData.referrer_email} 
                        onChange={e => handleChange('referrer_email', e.target.value)} 
                        className="neomorph-inset" 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Referrer Reference</label>
                    <Input 
                        value={formData.referrer_ref} 
                        onChange={e => handleChange('referrer_ref', e.target.value)} 
                        className="neomorph-inset" 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">File Handler</label>
                    <Input 
                        value={formData.file_handler} 
                        onChange={e => handleChange('file_handler', e.target.value)} 
                        className="neomorph-inset" 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Percentage to Referrer (%)</label>
                    <Input 
                        type="number" 
                        value={formData.percent_to_referrer} 
                        onChange={e => handleChange('percent_to_referrer', parseFloat(e.target.value) || 0)} 
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