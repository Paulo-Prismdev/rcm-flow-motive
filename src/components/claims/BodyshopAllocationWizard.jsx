import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Building2, Loader } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { STEPS, REQUIRED_FIELDS } from './wizard/WizardConstants';
import WizardValidateStep from './wizard/WizardValidateStep';
import WizardFindRepairerStep from './wizard/WizardFindRepairerStep';
import WizardInstructionStep from './wizard/WizardInstructionStep';
import WizardEmailStep from './wizard/WizardEmailStep';
import WizardConfirmStep from './wizard/WizardConfirmStep';
import { geocodeAddress } from '@/functions/geocodeAddress';

export default function BodyshopAllocationWizard({ claim, isOpen, onClose, onAllocationComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBodyshop, setSelectedBodyshop] = useState(null);
  const [clientLocation, setClientLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState(null);
  const [mapCenter, setMapCenter] = useState([54.5, -2.0]);
  const [mapZoom, setMapZoom] = useState(7);

  const [validationData, setValidationData] = useState({});
  const [isSavingValidation, setIsSavingValidation] = useState(false);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState('standard');
  const [contactType, setContactType] = useState('client');
  const [customContact, setCustomContact] = useState({ name: '', phone: '', email: '' });
  const [authorisedBy, setAuthorisedBy] = useState('Client Insurer');

  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');

  const [isAllocating, setIsAllocating] = useState(false);

  const hasAttemptedGeocode = useRef(false);
  const queryClient = useQueryClient();

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
    enabled: isOpen,
  });

  const { data: pdfTemplates = [] } = useQuery({
    queryKey: ['pdfTemplates'],
    queryFn: () => base44.entities.PdfTemplateConfig.list(),
    enabled: isOpen,
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['emailTemplates', 'Claim'],
    queryFn: async () => {
      const allTemplates = await base44.entities.EmailTemplate.list();
      return allTemplates.filter(t => t.item_type === 'Claim' || t.item_type === 'General');
    },
    enabled: isOpen,
  });

  const validBodyshops = useMemo(() =>
    bodyshops.filter(b =>
      b.latitude && b.longitude &&
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude))
    ), [bodyshops]);

  const clientAddress = useMemo(() =>
    [
      claim?.client_address_line_1, claim?.client_address_line_2,
      claim?.client_town, claim?.client_county, claim?.client_postcode
    ].filter(Boolean).join(', '), [claim]);

  const hasValidAddress = useMemo(() => {
    if (!claim) return false;
    const hasPostcode = claim.client_postcode && claim.client_postcode.trim().length >= 5;
    const hasStreetAndTown = claim.client_address_line_1 && claim.client_address_line_1.trim().length > 3 &&
      claim.client_town && claim.client_town.trim().length > 2;
    return hasPostcode || hasStreetAndTown;
  }, [claim]);

  // ── Reset when modal opens ──
  useEffect(() => {
    if (isOpen && claim) {
      hasAttemptedGeocode.current = false;
      setCurrentStep(0);
      setSelectedBodyshop(null);
      setClientLocation(null);
      setGeocodeMessage(null);
      setGeneratedPdfUrl(null);
      setEmailTo(''); setEmailSubject(''); setEmailBody('');
      setSelectedEmailTemplateId('');
      setContactType(claim.last_contact_source ? claim.last_contact_source.toLowerCase() : 'client');
      setCustomContact({ name: '', phone: '', email: '' });
      setAuthorisedBy(claim.authorised_by || 'Client Insurer');

      const initialValidation = {};
      REQUIRED_FIELDS.forEach(field => {
        initialValidation[field.key] = claim[field.key] ?? (field.type === 'boolean' ? false : '');
      });
      setValidationData(initialValidation);

      if (validBodyshops.length > 0) {
        const avgLat = validBodyshops.reduce((sum, b) => sum + parseFloat(b.latitude), 0) / validBodyshops.length;
        const avgLng = validBodyshops.reduce((sum, b) => sum + parseFloat(b.longitude), 0) / validBodyshops.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(7);
      }
    }
  }, [isOpen, validBodyshops, claim]);

  const missingFields = useMemo(() => {
    return REQUIRED_FIELDS.filter(field => {
      const value = validationData[field.key];
      if (field.type === 'boolean') return false;
      if (value === null || value === undefined || value === '') return true;
      return false;
    });
  }, [validationData]);

  const handleValidationChange = (key, value) => {
    setValidationData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveValidation = async () => {
    setIsSavingValidation(true);
    try {
      await base44.entities.Claim.update(claim.id, {
        ...validationData,
        last_contact_source: contactType.charAt(0).toUpperCase() + contactType.slice(1),
        authorised_by: authorisedBy,
      });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setCurrentStep(1);
    } catch (error) {
      console.error('Error saving validation data:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSavingValidation(false);
    }
  };

  // ── Geocode client address ──
  useEffect(() => {
    if (!isOpen || hasAttemptedGeocode.current || isGeocoding) return;

    if (!hasValidAddress || !clientAddress.trim()) {
      setGeocodeMessage({ type: 'info', text: 'No client address available. Showing all bodyshops on the map.' });
      hasAttemptedGeocode.current = true;
      return;
    }

    hasAttemptedGeocode.current = true;

    const geocodeClientAddress = async () => {
      setIsGeocoding(true);
      try {
        const result = await geocodeAddress({ address: clientAddress });
        const data = result?.data || result;

        let coordinates = null;
        if (data && data.latitude && data.longitude) {
          coordinates = { lat: data.latitude, lng: data.longitude, display_name: data.display_name || clientAddress };
        }

        if (coordinates) {
          setClientLocation(coordinates);
          setMapCenter([coordinates.lat, coordinates.lng]);
          setMapZoom(10);
          setGeocodeMessage({ type: 'success', text: `Client location found: ${coordinates.display_name}` });
        } else {
          setGeocodeMessage({ type: 'warning', text: 'Could not find client location. Showing all bodyshops.' });
        }
      } catch (error) {
        setGeocodeMessage({ type: 'warning', text: 'Unable to locate client address. Showing all bodyshops.' });
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeClientAddress();
  }, [isOpen, hasValidAddress, clientAddress, isGeocoding]);

  // ── Pre-fill email when bodyshop is selected ──
  useEffect(() => {
    if (selectedBodyshop && currentStep >= 2) {
      setEmailTo(selectedBodyshop.email || '');
    }
  }, [selectedBodyshop, currentStep]);

  const handleBodyshopClick = async (bodyshop) => {
    setSelectedBodyshop(bodyshop);
    setMapCenter([parseFloat(bodyshop.latitude), parseFloat(bodyshop.longitude)]);
    setMapZoom(11);

    try {
      await base44.entities.Claim.update(claim.id, {
        bodyshop_id: bodyshop.id,
        bodyshop: bodyshop.name,
        bodyshop_email: bodyshop.email,
      });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    } catch (error) {
      console.error('Error saving bodyshop selection:', error);
    }
  };

  const getContactOverrides = () => {
    if (contactType === 'client') {
      return {
        name: validationData.client_name || claim.client_name || '',
        phone: validationData.client_phone || claim.client_phone || '',
        email: validationData.client_email || claim.client_email || '',
      };
    }
    if (contactType === 'driver') {
      return {
        name: validationData.driver_contact_name || claim.driver_contact_name || '',
        phone: validationData.driver_contact_phone || claim.driver_contact_phone || '',
        email: validationData.driver_contact_email || claim.driver_contact_email || '',
      };
    }
    return customContact;
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const contactOverrides = getContactOverrides();
      const response = await base44.functions.invoke('generateBodyshopInstructionPdf', {
        claimId: claim.id,
        contactOverrides,
        templateType: selectedPdfTemplate,
        templateConfigId: pdfTemplates.find(t => t.id === selectedPdfTemplate)?.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setGeneratedPdfUrl(url);
      window.open(url, '_blank');
      // Invalidate both list and individual claim queries
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedBodyshop) return;
    setIsAllocating(true);
    try {
      await base44.entities.Claim.update(claim.id, {
        bs_instructed: new Date().toISOString().split('T')[0],
      });

      if (selectedBodyshop.email) {
        try {
          await base44.entities.Notification.create({
            user_email: selectedBodyshop.email,
            title: 'New Job Instruction',
            message: `A new job has been allocated to your bodyshop: ${claim.job_number || claim.reg} - ${claim.client_name || 'Customer'}`,
            type: 'assignment',
            related_item_type: 'Claim',
            related_item_id: claim.id,
            is_read: false,
          });
        } catch (notifError) {
          console.warn('Could not create bodyshop notification:', notifError.message);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['claims'] });
      if (onAllocationComplete) onAllocationComplete(selectedBodyshop);
      onClose();
    } catch (error) {
      console.error('Error allocating:', error);
      alert('Failed to allocate job. Please try again.');
    } finally {
      setIsAllocating(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return missingFields.length === 0;
      case 1: return !!selectedBodyshop;
      default: return true;
    }
  };

  // Prevent body scroll while wizard is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen || !claim) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent
        className="max-w-6xl w-full min-h-[600px] max-h-[95vh] p-0 overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header with Steps */}
        <div className="p-3 lg:p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base lg:text-xl font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
              <span className="truncate">Allocate - {claim.job_number || claim.reg}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <React.Fragment key={step.id}>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                    isActive ? 'bg-primary text-primary-foreground' :
                    isCompleted ? 'bg-green-100 text-green-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <StepIcon className="w-4 h-4" />
                    <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4" style={{ minHeight: 0 }}>
          {currentStep === 0 && (
            <WizardValidateStep
              claim={claim}
              validationData={validationData}
              missingFields={missingFields}
              contactType={contactType}
              customContact={customContact}
              authorisedBy={authorisedBy}
              onValidationChange={handleValidationChange}
              onContactTypeChange={setContactType}
              onAuthorisedByChange={setAuthorisedBy}
              onCustomContactChange={(field, value) => setCustomContact(prev => ({ ...prev, [field]: value }))}
            />
          )}
          {currentStep === 1 && (
            <WizardFindRepairerStep
              claim={claim}
              bodyshops={bodyshops}
              clientLocation={clientLocation}
              isGeocoding={isGeocoding}
              geocodeMessage={geocodeMessage}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              selectedBodyshop={selectedBodyshop}
              onSelectBodyshop={handleBodyshopClick}
              onClearSelection={() => setSelectedBodyshop(null)}
            />
          )}
          {currentStep === 2 && (
            <WizardInstructionStep
              selectedBodyshop={selectedBodyshop}
              pdfTemplates={pdfTemplates}
              selectedPdfTemplate={selectedPdfTemplate}
              isGeneratingPdf={isGeneratingPdf}
              generatedPdfUrl={generatedPdfUrl}
              onSelectTemplate={setSelectedPdfTemplate}
              onGeneratePdf={handleGeneratePdf}
            />
          )}
          {currentStep === 3 && (
            <WizardEmailStep
              selectedBodyshop={selectedBodyshop}
              emailTemplates={emailTemplates}
              emailTo={emailTo}
              emailSubject={emailSubject}
              emailBody={emailBody}
              selectedEmailTemplateId={selectedEmailTemplateId}
              claim={claim}
              onEmailToChange={setEmailTo}
              onEmailSubjectChange={setEmailSubject}
              onEmailBodyChange={setEmailBody}
              onTemplateSelect={setSelectedEmailTemplateId}
            />
          )}
          {currentStep === 4 && (
            <WizardConfirmStep
              claim={claim}
              selectedBodyshop={selectedBodyshop}
              isAllocating={isAllocating}
              onAllocate={handleAllocate}
            />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 lg:p-5 border-t border-border flex justify-between gap-3 flex-shrink-0 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <Button variant="outline"
            onClick={() => currentStep === 0 ? onClose() : setCurrentStep(currentStep - 1)}
            className="flex-1 max-w-[140px] h-10">
            <ChevronLeft className="w-4 h-4 mr-2" />
            <span>{currentStep === 0 ? 'Cancel' : 'Back'}</span>
          </Button>

          {currentStep === 0 && (
            <Button onClick={handleSaveValidation} disabled={missingFields.length > 0 || isSavingValidation} className="flex-1 max-w-[160px] h-10">
              {isSavingValidation ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <>Save & Continue <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}

          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()} className="flex-1 max-w-[140px] h-10">
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}