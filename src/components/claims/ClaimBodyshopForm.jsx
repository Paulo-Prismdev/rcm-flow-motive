import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Wand2, UserX } from "lucide-react";
import BodyshopCombobox from '../shared/BodyshopCombobox';
import ClaimBodyshopMapModal from './ClaimBodyshopMapModal';
import BodyshopAllocationWizard from './BodyshopAllocationWizard';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ClaimBodyshopForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState(claim || {});
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isUnallocateOpen, setIsUnallocateOpen] = useState(false);
    const [unallocateReason, setUnallocateReason] = useState('');
    const [isUnallocating, setIsUnallocating] = useState(false);

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const handleUnallocate = async () => {
        if (!unallocateReason.trim()) return;
        
        setIsUnallocating(true);
        try {
            // Log the unallocation in ActivityLog
            await base44.entities.ActivityLog.create({
                parent_id: claim.id,
                parent_type: 'Claim',
                action: 'Repairer Unallocated',
                field_name: 'bodyshop_id',
                old_value: claim.bodyshop || 'Allocated Repairer',
                new_value: 'Unassigned',
                description: `Repairer unallocated. Reason: ${unallocateReason}`,
                user_email: currentUser?.email,
                user_name: currentUser?.full_name,
            });

            // Save with cleared bodyshop fields
            onSave({
                ...formData,
                bodyshop: null,
                bodyshop_id: null,
                bodyshop_email: null,
                bs_instructed: null,
                repairer_accepted: false,
                repairer_accepted_date: null,
                instruction_pdf_url: null,
                latest_update: `Repairer unallocated by ${currentUser?.full_name || 'Internal User'}. Reason: ${unallocateReason}`,
            });

            setIsUnallocateOpen(false);
            setUnallocateReason('');
        } finally {
            setIsUnallocating(false);
        }
    };

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

    const handleWizardComplete = (bodyshop) => {
        handleBodyshopChange(bodyshop);
        setIsWizardOpen(false);
        // Auto-save after wizard completes
        onSave({
            ...formData,
            bodyshop: bodyshop.name,
            bodyshop_id: bodyshop.id,
            bodyshop_email: bodyshop.email || '',
            bs_instructed: new Date().toISOString().split('T')[0],
        });
    };

    return (
        <>
            <ClaimBodyshopMapModal
                claim={claim}
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelectBodyshop={handleMapSelect}
            />

            <BodyshopAllocationWizard
                claim={claim}
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onAllocationComplete={handleWizardComplete}
            />
            
            <div className="space-y-4 pt-4">
                {/* Allocation Wizard Button */}
                <Button
                    type="button"
                    onClick={() => setIsWizardOpen(true)}
                    className="w-full neomorph-flat py-3 text-accent hover:bg-accent/10 border-accent/30"
                >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Allocate Job (Full Wizard)
                </Button>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or select manually</span>
                    </div>
                </div>

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