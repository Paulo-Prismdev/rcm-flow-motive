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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass-border">
          <div>
            <h2 className="text-xl font-bold">Generate Bodyshop Instructions</h2>
            <p className="text-sm text-foreground-muted mt-1">
              Select the instruction template for {claim.job_number}
            </p>
          </div>
          <Button
            onClick={onClose}
            className="neomorph-flat p-2"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Built-in Templates */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Built-in Templates</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {builtInTemplates.map((template) => (
              <div
                key={template.id}
                className="neomorph-flat p-5 hover:neomorph transition-all cursor-pointer"
                onClick={() => !isGenerating && handleGenerate(template.type)}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="text-5xl">{template.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-2">{template.name}</h3>
                    <p className="text-xs text-foreground-muted">{template.description}</p>
                  </div>
                  {isGenerating && selectedType === template.type ? (
                    <Loader className="w-6 h-6 animate-spin text-gold" />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4 mt-8">
                <h3 className="font-bold text-lg">Custom Templates</h3>
                <Link to={createPageUrl('PdfTemplateManager')}>
                  <Button className="neomorph-flat text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Manage Templates
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customTemplates.filter(t => t.is_active).map((template) => (
                  <div
                    key={template.id}
                    className="neomorph-flat p-5 hover:neomorph transition-all cursor-pointer"
                    onClick={() => !isGenerating && handleGenerate(template.template_type, template.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base mb-1">{template.template_name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 rounded neomorph-inset">
                            {template.template_type}
                          </span>
                          {template.is_default && (
                            <span className="text-xs px-2 py-1 rounded bg-gold/20 text-gold font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground-muted">
                          {template.sections_config?.length || 0} sections • 
                          {template.header_config?.show_logo ? ' Logo' : ' No logo'}
                        </p>
                      </div>
                      {isGenerating && selectedTemplate === template.id ? (
                        <Loader className="w-5 h-5 animate-spin text-gold flex-shrink-0" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Manage Templates Link */}
          <div className="mt-6 pt-6 border-t border-glass-border">
            <Link to={createPageUrl('PdfTemplateManager')}>
              <Button className="w-full neomorph-flat flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" />
                Manage PDF Templates
              </Button>
            </Link>
          </div>
        </div>

        {/* Info Footer */}
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> The PDF will be generated with all current claim data and opened in a new tab. 
            A copy will be automatically saved to the claim's attachments.
          </p>
        </div>
      </div>
    </div>
  );
}