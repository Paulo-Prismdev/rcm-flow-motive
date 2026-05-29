import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, FileText, Loader, Settings } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function InstructionTemplateModal({ claim, isOpen, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedType, setSelectedType] = useState('standard');
  const queryClient = useQueryClient();

  const { data: customTemplates = [] } = useQuery({
    queryKey: ['pdfTemplates'],
    queryFn: () => base44.entities.PdfTemplateConfig.list(),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const builtInTemplates = [
    {
      id: 'standard',
      name: 'Standard Instructions',
      description: 'General bodyshop instruction template for most claims',
      icon: '📄',
      type: 'standard'
    },
    {
      id: 'driversure',
      name: 'Driversure Instructions',
      description: 'Special template for Driversure referrals with payment instructions',
      icon: '🚗',
      type: 'driversure'
    },
    {
      id: 'orkin',
      name: 'Orkin Instructions',
      description: 'Special template for Orkin referrals with payment instructions',
      icon: '🔧',
      type: 'orkin'
    }
  ];

  const handleGenerate = async (templateType, configId = null) => {
    setIsGenerating(true);
    setSelectedType(templateType);

    try {
      const response = await base44.functions.invoke('generateBodyshopInstructionPdf', {
        claimId: claim.id,
        templateType: templateType,
        templateConfigId: configId
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
      setSelectedType(null);
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

        {/* Built-in Templates */}
        <div className="px-8 py-6">
          <h3 className="text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Built-in Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {builtInTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer"
                onClick={() => !isGenerating && handleGenerate(template.type)}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="text-4xl">{template.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">{template.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                  </div>
                  {isGenerating && selectedType === template.type ? (
                    <Loader className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4 mt-8">
                <h3 className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">Custom Templates</h3>
                <Link to={createPageUrl('PdfTemplateManager')}>
                  <Button variant="outline" className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Templates
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customTemplates.filter(t => t.is_active).map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer"
                    onClick={() => !isGenerating && handleGenerate(template.template_type, template.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">{template.template_name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {template.template_type}
                          </span>
                          {template.is_default && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {template.sections_config?.length || 0} sections • 
                          {template.header_config?.show_logo ? ' Logo' : ' No logo'}
                        </p>
                      </div>
                      {isGenerating && selectedTemplate === template.id ? (
                        <Loader className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
          <Link to={createPageUrl('PdfTemplateManager')}>
            <Button className="h-9 px-4 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
              <Settings className="w-4 h-4 mr-2" />
              Manage PDF Templates
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}