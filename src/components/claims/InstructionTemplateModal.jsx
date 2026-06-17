import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, FileText, Loader, User, Car, Pencil } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const CONTACT_OPTIONS = [
  { value: 'client', label: 'Client', icon: User, description: 'Use the client as the repair contact' },
  { value: 'driver', label: 'Driver / Repair Contact', icon: Car, description: 'Use the driver as the repair contact' },
  { value: 'custom', label: 'Custom', icon: Pencil, description: 'Enter custom contact details' },
];

export default function InstructionTemplateModal({ claim, isOpen, onClose }) {
  const [step, setStep] = useState('select'); // 'select' | 'custom' | 'generating'
  const [contactType, setContactType] = useState('client');
  const [customContact, setCustomContact] = useState({ name: '', phone: '', email: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setContactType('client');
      setCustomContact({ name: '', phone: '', email: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getContactOverrides = () => {
    if (contactType === 'client') {
      return {
        name: claim.client_name || '',
        phone: claim.client_phone || '',
        email: claim.client_email || '',
      };
    }
    if (contactType === 'driver') {
      return {
        name: claim.driver_contact_name || '',
        phone: claim.driver_contact_phone || '',
        email: claim.driver_contact_email || '',
      };
    }
    return customContact;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const contactOverrides = getContactOverrides();
      const response = await base44.functions.invoke('generateBodyshopInstructionPdf', {
        claimId: claim.id,
        contactOverrides
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      window.open(url, '_blank');
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clientContact = claim.client_name ? `${claim.client_name}${claim.client_phone ? ' - ' + claim.client_phone : ''}${claim.client_email ? ' - ' + claim.client_email : ''}` : 'No client details';
  const driverContact = claim.driver_contact_name ? `${claim.driver_contact_name}${claim.driver_contact_phone ? ' - ' + claim.driver_contact_phone : ''}${claim.driver_contact_email ? ' - ' + claim.driver_contact_email : ''}` : 'No driver details';

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
              {step === 'select' ? 'Choose who the repairer should contact' : 'Enter custom contact details'} — {claim.job_number}
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

        {/* Step: Select contact or custom */}
        {step === 'select' && (
          <>
            <div className="px-8 py-6 space-y-3">
              <p className="text-sm text-muted-foreground">Who should the repairer contact for drop-off, updates and collection?</p>
              {CONTACT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = contactType === option.value;
                const isDisabled = option.value === 'driver' && !claim.driver_contact_name;
                return (
                  <button
                    key={option.value}
                    onClick={() => !isDisabled && setContactType(option.value)}
                    disabled={isDisabled}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        {option.value === 'client' && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">{clientContact}</p>
                        )}
                        {option.value === 'driver' && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">{isDisabled ? 'No driver details on file' : driverContact}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (contactType === 'custom') {
                    setStep('custom');
                  } else {
                    handleGenerate();
                  }
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {contactType === 'custom' ? 'Next: Enter Details' : 'Generate PDF'}
              </Button>
            </div>
          </>
        )}

        {/* Step: Custom contact details */}
        {step === 'custom' && (
          <>
            <div className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Contact Name</label>
                <Input 
                  value={customContact.name} 
                  onChange={(e) => setCustomContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name..."
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Contact Phone</label>
                <Input 
                  value={customContact.phone} 
                  onChange={(e) => setCustomContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone..."
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Contact Email</label>
                <Input 
                  type="email"
                  value={customContact.email} 
                  onChange={(e) => setCustomContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email..."
                />
              </div>
            </div>

            <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 flex justify-between">
              <Button variant="ghost" onClick={() => setStep('select')} disabled={isGenerating}>Back</Button>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? <><Loader className="w-4 h-4 animate-spin mr-2" />Generating...</> : <><FileText className="w-4 h-4 mr-2" />Generate PDF</>}
              </Button>
            </div>
          </>
        )}

        {/* Generating state (when neither step matches) */}
        {(step !== 'select' && step !== 'custom') && (
          <div className="px-8 py-12 flex flex-col items-center justify-center gap-4">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">Generating PDF...</p>
          </div>
        )}

        {/* Info Footer */}
        <div className="px-8 py-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 flex-shrink-0">
          <p className="text-[13px] text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> The PDF will be generated with all current claim data and opened in a new tab.
            A copy will be automatically saved to the claim's attachments.
          </p>
        </div>
      </div>
    </div>
  );
}