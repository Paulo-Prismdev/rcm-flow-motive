import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, UserX } from "lucide-react";
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
    const [preSelectedBodyshop, setPreSelectedBodyshop] = useState(null);
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
            // Log the unallocation in ActivityLog (non-critical, ignore permission errors)
            try {
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
            } catch (logErr) {
                console.warn('ActivityLog create skipped:', logErr.message);
            }

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
        setPreSelectedBodyshop(null);
        // Auto-save after wizard completes
        onSave({
            ...formData,
            bodyshop: bodyshop.name,
            bodyshop_id: bodyshop.id,
            bodyshop_email: bodyshop.email || '',
            bs_instructed: new Date().toISOString().split('T')[0],
        });
    };

    const handleSearchSelect = (bodyshop) => {
        setPreSelectedBodyshop(bodyshop);
        setIsWizardOpen(true);
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
                onClose={() => { setIsWizardOpen(false); setPreSelectedBodyshop(null); }}
                onAllocationComplete={handleWizardComplete}
                startStep={preSelectedBodyshop ? 1 : 0}
                preSelectedBodyshop={preSelectedBodyshop}
            />

            {/* Unallocate Confirmation Dialog */}
            <Dialog open={isUnallocateOpen} onOpenChange={setIsUnallocateOpen}>
                <DialogContent className="neomorph max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <UserX className="w-5 h-5" />
                            Unallocate Repairer
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                This will remove <strong>{claim.bodyshop}</strong> from this claim. 
                                The job will no longer appear in their repairer portal.
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Reason for unallocation *</label>
                            <Textarea
                                value={unallocateReason}
                                onChange={(e) => setUnallocateReason(e.target.value)}
                                placeholder="Enter reason for removing this repairer..."
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setIsUnallocateOpen(false); setUnallocateReason(''); }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUnallocate}
                                disabled={isUnallocating || !unallocateReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isUnallocating ? 'Unallocating...' : 'Confirm Unallocate'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            
            <div className="space-y-4 pt-4">
                {/* Unallocate Button - only show if bodyshop is allocated */}
                {claim.bodyshop_id && (
                    <Button
                        type="button"
                        onClick={() => setIsUnallocateOpen(true)}
                        className="w-full neomorph-flat py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300"
                    >
                        <UserX className="w-4 h-4 mr-2" />
                        Unallocate Repairer
                    </Button>
                )}

                {/* Repairer Search — entry point for allocation */}
                <div className="space-y-2">
                    <label className="text-sm text-gray-500 block">Search for a repairer to start allocation</label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <BodyshopCombobox 
                                value={""} 
                                onChange={handleSearchSelect} 
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

                {claim.bodyshop_id && (
                    <div className="flex justify-end gap-3 pt-4">
                        <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                        <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
                    </div>
                )}
            </div>
        </>
    );
}