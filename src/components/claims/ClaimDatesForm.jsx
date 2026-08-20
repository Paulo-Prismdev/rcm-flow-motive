import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const toInputDate = (date) => {
    if (!date) return '';
    try {
        return new Date(date).toISOString().split('T')[0];
    } catch {
        return '';
    }
};

export default function ClaimDatesForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        date_received: toInputDate(claim.date_received),
        loss_date: toInputDate(claim.loss_date),
        estimate_completed: toInputDate(claim.estimate_completed),
        authority_received: toInputDate(claim.authority_received),
        bs_instructed: toInputDate(claim.bs_instructed),
        booking_in_date: toInputDate(claim.booking_in_date),
        on_site_date: toInputDate(claim.on_site_date),
        hand_over_date: toInputDate(claim.hand_over_date),
        ecd: toInputDate(claim.ecd),
        completion_date: toInputDate(claim.completion_date),
        claim_complete_date: toInputDate(claim.claim_complete_date),
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-sm text-gray-500">Date Received</label>
                    <Input type="date" value={formData.date_received} onChange={e => handleChange('date_received', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Loss Date</label>
                    <Input type="date" value={formData.loss_date} onChange={e => handleChange('loss_date', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Estimate Completed</label>
                    <Input type="date" value={formData.estimate_completed} onChange={e => handleChange('estimate_completed', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Authority Received</label>
                    <Input type="date" value={formData.authority_received} onChange={e => handleChange('authority_received', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Bodyshop Instructed</label>
                    <Input type="date" value={formData.bs_instructed} onChange={e => handleChange('bs_instructed', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Booking In Date (BID)</label>
                    <Input type="date" value={formData.booking_in_date} onChange={e => handleChange('booking_in_date', e.target.value)} className="neomorph-inset" />
                </div>
                 <div>
                    <label className="text-sm text-gray-500">On-Site Date</label>
                    <Input type="date" value={formData.on_site_date} onChange={e => handleChange('on_site_date', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Hand Over Date</label>
                    <Input type="date" value={formData.hand_over_date} onChange={e => handleChange('hand_over_date', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Est. Completion (ECD)</label>
                    <Input type="date" value={formData.ecd} onChange={e => handleChange('ecd', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Completion Date</label>
                    <Input type="date" value={formData.completion_date} onChange={e => handleChange('completion_date', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Claim Complete Date</label>
                    <Input type="date" value={formData.claim_complete_date} onChange={e => handleChange('claim_complete_date', e.target.value)} className="neomorph-inset" />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
            </div>
        </div>
    );
}