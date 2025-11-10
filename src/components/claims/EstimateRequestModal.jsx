import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Loader } from 'lucide-react';

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
            alert("Failed to create estimate request. Please try again.");
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
            <DialogContent className="neomorph-flat bg-[#1A1A1A] p-6 border-gold">
                <DialogHeader>
                    <DialogTitle className="text-gold">Request Estimate</DialogTitle>
                    <DialogDescription className="text-gray-500">
                        This will create a new job in the Estimating department linked to claim for vehicle: {claim.reg}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Job Type</label>
                        <select
                            value={estimateData.job_type}
                            onChange={(e) => handleChange('job_type', e.target.value)}
                            className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
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
                        <label className="block text-sm text-gray-500 mb-2">Additional Instructions</label>
                        <Textarea
                            placeholder="Any special instructions for the estimator..."
                            value={estimateData.additional_notes}
                            onChange={(e) => handleChange('additional_notes', e.target.value)}
                            className="neomorph-inset h-32"
                        />
                    </div>
                    <div className="neomorph-inset p-4 text-sm">
                        <p className="text-gray-500 mb-2 font-semibold">Auto-filled information:</p>
                        <div className="space-y-1 text-gray-600">
                            <p><span className="text-gray-500">Vehicle:</span> {claim.make_model || 'N/A'} ({claim.reg})</p>
                            <p><span className="text-gray-500">Repairer:</span> {claim.bodyshop || 'N/A'}</p>
                            <p><span className="text-gray-500">Insurer:</span> {claim.insurer || 'N/A'}</p>
                            <p><span className="text-gray-500">Claim Ref:</span> {claim.claim_ref || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onClose} variant="ghost" className="neomorph-flat">Cancel</Button>
                    <Button 
                        onClick={handleSubmit} 
                        className="neomorph-flat text-blue-600" 
                        disabled={createEstimateMutation.isPending || !estimateData.job_type}
                    >
                        {createEstimateMutation.isPending ? <Loader className="animate-spin" /> : 'Create Estimate Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}