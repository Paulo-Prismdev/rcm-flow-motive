import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import BodyshopCombobox from '../shared/BodyshopCombobox';
import ClaimBodyshopMapModal from './ClaimBodyshopMapModal';

export default function ClaimBodyshopForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState(claim || {});
    const [isMapOpen, setIsMapOpen] = useState(false);

    const handleBodyshopChange = (bodyshop) => {
        setFormData(prev => ({ 
            ...prev, 
            bodyshop: bodyshop.name,
            bodyshop_id: bodyshop.id,
            bodyshop_email: bodyshop.email || ''
        }));
    };
    
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    const handleMapSelect = (bodyshop) => {
        handleBodyshopChange(bodyshop);
        setIsMapOpen(false);
    };

    return (
        <>
            <ClaimBodyshopMapModal
                claim={claim}
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelectBodyshop={handleMapSelect}
            />
            
            <div className="space-y-4 pt-4">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-500 mb-2 block">Bodyshop</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <BodyshopCombobox 
                                    value={formData.bodyshop} 
                                    onChange={handleBodyshopChange} 
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={() => setIsMapOpen(true)}
                                className="neomorph-flat p-3"
                                title="Select from map"
                            >
                                <MapPin className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Bodyshop Email</label>
                        <Input 
                            type="email"
                            value={formData.bodyshop_email} 
                            onChange={e => handleChange('bodyshop_email', e.target.value)} 
                            className="neomorph-inset" 
                            placeholder="Auto-filled from selection"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Authorising Party</label>
                        <Input 
                            value={formData.authorising_party} 
                            onChange={e => handleChange('authorising_party', e.target.value)} 
                            className="neomorph-inset" 
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                    <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
                </div>
            </div>
        </>
    );
}