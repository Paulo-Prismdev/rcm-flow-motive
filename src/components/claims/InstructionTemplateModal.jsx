import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, FileText, Loader } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function InstructionTemplateModal({ claim, isOpen, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateBodyshopInstructionPdf', {
        claimId: claim.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      window.open(url, '_blank');
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      // Invalidate claims query to refresh the claim data (including new file_urls)
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-[580px] mx-4 max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Generate Bodyshop Instructions</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              Select the instruction template for {claim.job_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Card */}
        <div className="px-8 py-6">
          <div
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer"
            onClick={() => !isGenerating && handleGenerate()}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-4xl">📄</div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">RCM General Claims Instruction</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Standard repairer instruction with client, vehicle, and insurance details</p>
              </div>
              {isGenerating ? (
                <Loader className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <FileText className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="px-8 py-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 flex-shrink-0">
          <p className="text-[13px] text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> The PDF will be generated with all current claim data and opened in a new tab.
            A copy will be automatically saved to the claim's attachments.
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancel</Button>
          <Button onClick={() => !isGenerating && handleGenerate()} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isGenerating ? <><Loader className="w-4 h-4 animate-spin mr-2" />Generating...</> : <><FileText className="w-4 h-4 mr-2" />Generate PDF</>}
          </Button>
        </div>
      </div>
    </div>
  );
}