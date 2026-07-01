import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AddressLookupInput from '../shared/AddressLookupInput';
import StatusMultiSelect from '../shared/StatusMultiSelect';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ClaimStatusForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        job_statuses: claim.job_statuses || (claim.job_status ? [claim.job_status] : ['New']),
        claim_type: claim.claim_type || 'Credit Repair',
        loss_date: claim.loss_date || '',
        loss_time: claim.loss_time || '',
        incident_location: claim.incident_location || '',
        vehicle_use: claim.vehicle_use || '',
        circumstances: claim.circumstances || '',
        courtesy_car_required: claim.courtesy_car_required || false,
    });

    const { data: customStatuses = [] } = useQuery({
        queryKey: ['ClaimStatusConfig'],
        queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
        staleTime: 0,
    });

    const availableStatuses = React.useMemo(() => {
        const active = customStatuses
            .filter(s => s.is_active !== false)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(s => s.status_name);
        return active.includes('New') ? active : ['New', ...active];
    }, [customStatuses]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleIncidentLocationChange = (addressData) => {
        setFormData(prev => ({
            ...prev,
            incident_location: addressData.display_name || addressData.address || ''
        }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-gray-500">Job Status</label>
                    <StatusMultiSelect
                        selectedStatuses={formData.job_statuses}
                        onStatusesChange={(statuses) => handleChange('job_statuses', statuses)}
                        availableStatuses={availableStatuses}
                        placeholder="Select statuses..."
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Claim Type</label>
                    <select 
                        value={formData.claim_type} 
                        onChange={e => handleChange('claim_type', e.target.value)} 
                        className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                    >
                        <option value="Credit Repair">Credit Repair</option>
                        <option value="Fault Claim">Fault Claim</option>
                        <option value="Non-Fault Claim">Non-Fault Claim</option>
                        <option value="Total Loss">Total Loss</option>
                        <option value="Glass Claim">Glass Claim</option>
                        <option value="Paying Privately">Paying Privately</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm text-gray-500">Date of Loss</label>
                    <Input 
                        type="date" 
                        value={formData.loss_date} 
                        onChange={e => handleChange('loss_date', e.target.value)} 
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0" 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Time of Loss</label>
                    <Input 
                        type="time" 
                        value={formData.loss_time} 
                        onChange={e => handleChange('loss_time', e.target.value)} 
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0" 
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Use of Vehicle</label>
                    <select 
                        value={formData.vehicle_use} 
                        onChange={e => handleChange('vehicle_use', e.target.value)} 
                        className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                    >
                        <option value="">Not specified</option>
                        <option value="Business">Business</option>
                        <option value="Social">Social</option>
                        <option value="Commuting">Commuting</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="text-sm text-gray-500">Incident Location</label>
                <AddressLookupInput
                    value={formData.incident_location}
                    onChange={handleIncidentLocationChange}
                    placeholder="Start typing address or postcode..."
                    className="neomorph-inset"
                />
                <Input 
                    value={formData.incident_location} 
                    onChange={e => handleChange('incident_location', e.target.value)} 
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 mt-2" 
                    placeholder="Or enter manually"
                />
            </div>
            <div>
                <label className="text-sm text-gray-500">Circumstances</label>
                <Textarea 
                    value={formData.circumstances} 
                    onChange={e => handleChange('circumstances', e.target.value)} 
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" 
                />
            </div>
            <div className="flex items-center gap-3">
                <input 
                    type="checkbox" 
                    id="courtesy_car_required_edit" 
                    checked={formData.courtesy_car_required} 
                    onChange={e => handleChange('courtesy_car_required', e.target.checked)} 
                    className="neomorph-inset" 
                />
                <label htmlFor="courtesy_car_required_edit" className="text-sm text-gray-600">Courtesy Car Required</label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
            </div>
        </div>
    );
}