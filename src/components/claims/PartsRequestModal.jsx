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

export default function PartsRequestModal({ claim, isOpen, onClose, onPartCreated }) {
    const [partData, setPartData] = useState({
        part_description: '',
        part_number: '',
        backorder_duration: '',
        additional_comments: '',
    });

    const createPartMutation = useMutation({
        mutationFn: (newPart) => base44.entities.Part.create(newPart),
        onSuccess: (createdPart) => {
            onPartCreated(createdPart);
            onClose();
        },
        onError: (error) => {
            console.error("Failed to create part request:", error);
            // Optionally: show an error message to the user
        }
    });

    const handleChange = (field, value) => {
        setPartData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        const newPartRequest = {
            ...partData,
            vehicle_ref: claim.reg,
            bodyshop_company: claim.bodyshop,
            contact_name: claim.client_name,
            contact_number: claim.client_phone,
            contact_email: claim.client_email,
            linked_claim_id: claim.id,
            sourcing_status: 'New Request',
            date_requested: new Date().toISOString().split('T')[0],
        };
        createPartMutation.mutate(newPartRequest);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
                <div className="mb-6">
                    <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Log Parts Issue</h2>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                        This will create a new job in the Parts department linked to claim for vehicle: {claim.reg}.
                    </p>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-[6px]">Part Description(s)</label>
                        <Textarea
                            placeholder="Part Description(s)"
                            value={partData.part_description}
                            onChange={(e) => handleChange('part_description', e.target.value)}
                            className="min-h-[120px] w-full border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[14px] text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-[6px]">Part Number(s) (if known)</label>
                        <Input
                            placeholder="Part Number(s) (if known)"
                            value={partData.part_number}
                            onChange={(e) => handleChange('part_number', e.target.value)}
                            className="w-full h-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[14px] text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-[6px]">Delay / Backorder Duration</label>
                        <Input
                            placeholder="Delay / Backorder Duration"
                            value={partData.backorder_duration}
                            onChange={(e) => handleChange('backorder_duration', e.target.value)}
                            className="w-full h-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[14px] text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-[6px]">Additional Notes for Parts Team</label>
                        <Textarea
                            placeholder="Additional Notes for Parts Team"
                            value={partData.additional_comments}
                            onChange={(e) => handleChange('additional_comments', e.target.value)}
                            className="min-h-[120px] w-full border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[14px] text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
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
                        disabled={createPartMutation.isPending}
                    >
                        {createPartMutation.isPending ? <Loader className="animate-spin mr-2" /> : 'Create Request'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}