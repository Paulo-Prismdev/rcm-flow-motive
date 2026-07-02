import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserX } from "lucide-react";
import ClaimBodyshopAllocateButton from './ClaimBodyshopAllocateButton';
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

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const sanitized = { ...formData };
        if (sanitized.referral_fee_repairer !== undefined && sanitized.referral_fee_repairer !== '' && sanitized.referral_fee_repairer !== null) {
            sanitized.referral_fee_repairer = parseFloat(sanitized.referral_fee_repairer);
        }
        if (sanitized.referral_fee_repairer_gbp !== undefined && sanitized.referral_fee_repairer_gbp !== '' && sanitized.referral_fee_repairer_gbp !== null) {
            sanitized.referral_fee_repairer_gbp = parseFloat(sanitized.referral_fee_repairer_gbp);
        }
        onSave(sanitized);
    };

    return (
        <>
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
                {/* Change or allocate repairer */}
                <div>
                    <label className="text-sm text-gray-500 mb-2 block">
                        {formData.bodyshop_id ? 'Change Repairer' : 'Allocate Repairer'}
                    </label>
                    <ClaimBodyshopAllocateButton
                        claim={claim}
                        onAllocated={(data) => {
                            setFormData(prev => ({ ...prev, ...data }));
                            onSave({ ...formData, ...data });
                        }}
                    />
                </div>

                {/* Unallocate Button - only show if bodyshop is allocated */}
                {formData.bodyshop_id && (
                    <Button
                        type="button"
                        onClick={() => setIsUnallocateOpen(true)}
                        className="w-full neomorph-flat py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300"
                    >
                        <UserX className="w-4 h-4 mr-2" />
                        Unallocate Repairer
                    </Button>
                )}

                {formData.bodyshop_id && (
                    <div className="space-y-4 pt-2 border-t border-border">
                        <div>
                            <label className="text-sm text-gray-500 mb-2 block">Bodyshop</label>
                            <Input
                                value={formData.bodyshop || ''}
                                readOnly
                                className="neomorph-inset bg-muted/50"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-500 mb-2 block">Bodyshop Email</label>
                            <Input
                                type="email"
                                value={formData.bodyshop_email || ''}
                                onChange={e => handleChange('bodyshop_email', e.target.value)}
                                className="neomorph-inset"
                                placeholder="Auto-filled from selection"
                            />
                        </div>
                    </div>
                )}

                {/* Referral Fee — always editable */}
                <div className="pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-gray-500 mb-2 block">Repairer Referral Fee (%)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.referral_fee_repairer ?? ''}
                                onChange={e => handleChange('referral_fee_repairer', e.target.value)}
                                className="neomorph-inset"
                                placeholder="e.g. 20"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-500 mb-2 block">Repairer Referral Fee (£)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.referral_fee_repairer_gbp ?? ''}
                                onChange={e => handleChange('referral_fee_repairer_gbp', e.target.value)}
                                className="neomorph-inset"
                                placeholder="e.g. 150"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">Enter a percentage OR a fixed amount — whichever applies will show on the instruction PDF.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button onClick={onCancel} variant="outline">Cancel</Button>
                    <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
                </div>
            </div>
        </>
    );
}