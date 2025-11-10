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
            <DialogContent className="neomorph-flat bg-[#1A1A1A] p-6 border-gold">
                <DialogHeader>
                    <DialogTitle className="text-gold">Create New Parts Request</DialogTitle>
                    <DialogDescription className="text-gray-500">
                        This will create a new job in the Parts department linked to claim for vehicle: {claim.reg}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Textarea
                        placeholder="Part Description(s)"
                        value={partData.part_description}
                        onChange={(e) => handleChange('part_description', e.target.value)}
                        className="neomorph-inset"
                        required
                    />
                    <Input
                        placeholder="Part Number(s) (if known)"
                        value={partData.part_number}
                        onChange={(e) => handleChange('part_number', e.target.value)}
                        className="neomorph-inset"
                    />
                    <Input
                        placeholder="Delay / Backorder Duration"
                        value={partData.backorder_duration}
                        onChange={(e) => handleChange('backorder_duration', e.target.value)}
                        className="neomorph-inset"
                    />
                    <Textarea
                        placeholder="Additional Notes for Parts Team"
                        value={partData.additional_comments}
                        onChange={(e) => handleChange('additional_comments', e.target.value)}
                        className="neomorph-inset"
                    />
                </div>
                <DialogFooter>
                    <Button onClick={onClose} variant="ghost" className="neomorph-flat">Cancel</Button>
                    <Button onClick={handleSubmit} className="neomorph-flat text-blue-600" disabled={createPartMutation.isPending}>
                        {createPartMutation.isPending ? <Loader className="animate-spin" /> : 'Create Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}