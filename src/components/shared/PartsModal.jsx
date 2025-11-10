import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function PartsModal({ estimate, isOpen, onClose }) {
  const [partData, setPartData] = useState({
    part_description: '',
    part_number: '',
    manufacturer: '',
    additional_comments: '',
  });

  const queryClient = useQueryClient();

  const createPartMutation = useMutation({
    mutationFn: (newPart) => base44.entities.Part.create(newPart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      onClose();
      setPartData({
        part_description: '',
        part_number: '',
        manufacturer: '',
        additional_comments: '',
      });
    },
    onError: (error) => {
      console.error("Failed to create part request:", error);
      alert("Failed to create part request. Please try again.");
    }
  });

  const handleChange = (field, value) => {
    setPartData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const newPartRequest = {
      ...partData,
      vehicle_ref: estimate.make_model || 'N/A',
      bodyshop_company: estimate.repairer || '',
      linked_estimate_id: estimate.id,
      sourcing_status: 'New Request',
      date_requested: new Date().toISOString().split('T')[0],
    };
    createPartMutation.mutate(newPartRequest);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-elevated p-6 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Parts Issue</DialogTitle>
          <DialogDescription>
            Create a new parts request linked to estimate: {estimate.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-2">Manufacturer</label>
            <Input
              placeholder="e.g., Ford, BMW, Toyota"
              value={partData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              className="neomorph-inset"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Part Description *</label>
            <Textarea
              placeholder="Describe the part(s) needed..."
              value={partData.part_description}
              onChange={(e) => handleChange('part_description', e.target.value)}
              className="neomorph-inset h-24"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Part Number (if known)</label>
            <Input
              placeholder="Part number"
              value={partData.part_number}
              onChange={(e) => handleChange('part_number', e.target.value)}
              className="neomorph-inset"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Additional Notes</label>
            <Textarea
              placeholder="Any additional information for the parts team..."
              value={partData.additional_comments}
              onChange={(e) => handleChange('additional_comments', e.target.value)}
              className="neomorph-inset h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={onClose} 
            className="neomorph-flat px-6 py-3"
            disabled={createPartMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="neomorph-flat px-6 py-3 text-accent font-medium" 
            disabled={createPartMutation.isPending || !partData.part_description}
          >
            {createPartMutation.isPending ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Parts Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}