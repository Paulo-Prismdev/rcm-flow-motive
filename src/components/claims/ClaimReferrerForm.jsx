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
        if (!referrer) {
            setFormData(prev => ({
                ...prev,
                referrer: '',
                referrer_id: '',
                referrer_email: '',
                referrer_ref: '',
                file_handler: '',
                percent_to_referrer: 0,
                referral_fee_repairer: 0
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                referrer: referrer.name,
                referrer_id: referrer.id,
                referrer_email: referrer.email || referrer.contact_email || '',
                // Auto-populate rates from referrer defaults if set
                ...(referrer.default_percent_to_referrer != null && {
                    percent_to_referrer: referrer.default_percent_to_referrer
                }),
                ...(referrer.default_repairer_referral_fee != null && {
                    referral_fee_repairer: referrer.default_repairer_referral_fee
                }),
            }));
        }
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
                <div>
                    <label className="text-sm text-gray-500">Repairer Referral Fee (%)</label>
                    <Input 
                        type="number" 
                        value={formData.referral_fee_repairer ?? ''} 
                        onChange={e => handleChange('referral_fee_repairer', parseFloat(e.target.value) || 0)} 
                        className="neomorph-inset" 
                        placeholder="e.g. 20"
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