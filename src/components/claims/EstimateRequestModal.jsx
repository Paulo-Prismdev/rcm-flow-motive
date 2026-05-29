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
import { X, Loader } from 'lucide-react';

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
            <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Request Estimate</h2>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                            This will create a new job in the Estimating department linked to claim for vehicle: {claim.reg}.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-[6px]">Job Type</label>
                        <select
                            value={estimateData.job_type}
                            onChange={(e) => handleChange('job_type', e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[14px] text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                        <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-[6px]">Additional Instructions</label>
                        <Textarea
                            placeholder="Any special instructions for the estimator..."
                            value={estimateData.additional_notes}
                            onChange={(e) => handleChange('additional_notes', e.target.value)}
                            className="min-h-[120px] w-full border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[14px] text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-3">Auto-filled information</p>
                        <div className="space-y-1.5 text-[14px] text-gray-900 dark:text-white">
                            <p><span className="text-gray-500 dark:text-gray-400">Vehicle:</span> {claim.make_model || 'N/A'} ({claim.reg})</p>
                            <p><span className="text-gray-500 dark:text-gray-400">Repairer:</span> {claim.bodyshop || 'N/A'}</p>
                            <p><span className="text-gray-500 dark:text-gray-400">Insurer:</span> {claim.insurer || 'N/A'}</p>
                            <p><span className="text-gray-500 dark:text-gray-400">Claim Ref:</span> {claim.claim_ref || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        className="h-9 px-4 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={createEstimateMutation.isPending || !estimateData.job_type}
                    >
                        {createEstimateMutation.isPending ? <Loader className="animate-spin mr-2" /> : 'Create Estimate Request'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}