import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReferrerCombobox from '../shared/ReferrerCombobox';
import { base44 } from '@/api/base44Client';

export default function ClaimReferrerForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState(claim || {});

    const { data: referrerCompany } = useQuery({
        queryKey: ['company', claim?.referrer_id],
        queryFn: () => base44.entities.Company.get(claim.referrer_id),
        enabled: !!claim?.referrer_id,
        staleTime: 2 * 60 * 1000,
        retry: 1,
    });
    const handlerContacts = (referrerCompany?.contacts || []).filter(c => c.is_handler && c.name);

    // On mount: if referrer_id is set but rates are 0/empty, pull defaults from Company record
    useEffect(() => {
        if (claim?.referrer_id && (!claim.percent_to_referrer || !claim.referral_fee_repairer)) {
            base44.entities.Company.get(claim.referrer_id).then(company => {
                if (!company) return;
                setFormData(prev => ({
                    ...prev,
                    ...(!prev.percent_to_referrer && company.default_percent_to_referrer != null && {
                        percent_to_referrer: company.default_percent_to_referrer
                    }),
                    ...(!prev.referral_fee_repairer && company.default_repairer_referral_fee != null && {
                        referral_fee_repairer: company.default_repairer_referral_fee
                    }),
                }));
            }).catch(() => {});
        }
    }, []);

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
                referral_fee_repairer: 20
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
                    {handlerContacts.length > 0 ? (
                        <select
                            value={formData.file_handler}
                            onChange={e => handleChange('file_handler', e.target.value)}
                            className="neomorph-inset w-full px-3 py-2 text-sm rounded-xl border-0"
                        >
                            <option value="">Select file handler...</option>
                            {handlerContacts.map((c, i) => (
                                <option key={c.id || i} value={c.name}>{c.name}{c.position ? ` — ${c.position}` : ''}</option>
                            ))}
                        </select>
                    ) : (
                        <Input
                            value={formData.file_handler}
                            onChange={e => handleChange('file_handler', e.target.value)}
                            className="neomorph-inset"
                            placeholder="Enter file handler name"
                        />
                    )}
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