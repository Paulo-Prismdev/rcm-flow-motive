import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Loader } from 'lucide-react';
import { notifyError } from '@/lib/dialogs';

export default function EstimateRequestModal({ claim, isOpen, onClose, onEstimateCreated }) {
    const [estimateData, setEstimateData] = useState({
        job_type: '',
        additional_notes: '',
    });

    const createEstimateMutation = useMutation({
        mutationFn: (newEstimate) => base44.entities.Estimate.create(newEstimate),
        onSuccess: (createdEstimate) => {
            onEstimateCreated(createdEstimate);
            onClose();
        },
        onError: (error) => {
            console.error("Failed to create estimate request:", error);
            notifyError('Could not create the estimate request');
        }
    });

    const handleChange = (field, value) => {
        setEstimateData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        const newEstimateRequest = {
            name: `${claim.reg || 'Unknown'} - Estimate`,
            status: 'New',
            priority: 'Medium',
            repairer_action: 'Awaiting Response',
            vda: claim.reg,
            date_received: new Date().toISOString().split('T')[0],
            repairer: claim.bodyshop,
            email_address: claim.bodyshop_email,
            make_model: claim.make_model,
            insurer_work_provider: claim.insurer,
            authorising_party: claim.authorising_party,
            claim_number: claim.claim_ref,
            linked_claim_id: claim.id,
            est_platform: 'Audatex',
            job_type: estimateData.job_type,
            authority_notes: estimateData.additional_notes,
        };
        createEstimateMutation.mutate(newEstimateRequest);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[580px] bg-card rounded-xl shadow-2xl p-8 border border-border">
                <div className="mb-6">
                    <h2 className="text-[18px] font-semibold text-foreground">Request Estimate</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">
                        This will create a new job in the Estimating department linked to claim for vehicle: {claim.reg}.
                    </p>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-[14px] font-medium text-foreground mb-[6px]">Job Type</label>
                        <select
                            value={estimateData.job_type}
                            onChange={(e) => handleChange('job_type', e.target.value)}
                            className="w-full h-10 px-3 border border-border rounded-lg bg-card text-[14px] text-foreground focus:border-ring focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Select job type...</option>
                            <option value="Initial Estimate">Initial Estimate</option>
                            <option value="Supplement">Supplement</option>
                            <option value="Re-inspection">Re-inspection</option>
                            <option value="Total Loss Assessment">Total Loss Assessment</option>
                            <option value="Pre-repair Assessment">Pre-repair Assessment</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[14px] font-medium text-foreground mb-[6px]">Additional Instructions</label>
                        <Textarea
                            placeholder="Any special instructions for the estimator..."
                            value={estimateData.additional_notes}
                            onChange={(e) => handleChange('additional_notes', e.target.value)}
                            className="min-h-[120px] w-full border border-border rounded-lg bg-card text-[14px] text-foreground focus:border-ring focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="bg-muted rounded-lg p-4 border border-border">
                        <p className="text-[12px] font-medium text-muted-foreground uppercase mb-3">Auto-filled information</p>
                        <div className="space-y-1.5 text-[14px] text-foreground">
                            <p><span className="text-muted-foreground">Vehicle:</span> {claim.make_model || 'N/A'} ({claim.reg})</p>
                            <p><span className="text-muted-foreground">Repairer:</span> {claim.bodyshop || 'N/A'}</p>
                            <p><span className="text-muted-foreground">Insurer:</span> {claim.insurer || 'N/A'}</p>
                            <p><span className="text-muted-foreground">Claim Ref:</span> {claim.claim_ref || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="h-9 px-4 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        className="h-9 px-4 text-sm font-medium rounded-lg bg-info hover:bg-info text-on-solid"
                        disabled={createEstimateMutation.isPending || !estimateData.job_type}
                    >
                        {createEstimateMutation.isPending ? <Loader className="animate-spin mr-2" /> : 'Create Estimate Request'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}