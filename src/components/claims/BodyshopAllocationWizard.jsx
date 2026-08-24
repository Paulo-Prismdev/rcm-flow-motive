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
import { sanitizeClaimData } from '@/components/shared/sanitizeClaimData';

// Derive the PDF template from the instruction type captured in the Pre-Check
// (authorised_by). Orkin is a branded variant the user can still pick on the
// Generate Instruction step.
const deriveTemplate = (ab) => {
  if (ab === 'Third Party') return 'third_party';
  if (ab === 'Uninsured') return 'private';
  return 'standard';
};

export default function BodyshopAllocationWizard({ claim, isOpen, onClose, onAllocationComplete, startStep = 0, preSelectedBodyshop = null }) {
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
  const [isSavingInstructionToDocs, setIsSavingInstructionToDocs] = useState(false);
  const [instructionSavedToDocs, setInstructionSavedToDocs] = useState(false);
  const [contactType, setContactType] = useState('client');
  const [customContact, setCustomContact] = useState({ name: '', phone: '', email: '' });
  const [authorisedBy, setAuthorisedBy] = useState('Client Insurer');

  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');

  const [isAllocating, setIsAllocating] = useState(false);

  const hasAttemptedGeocode = useRef(false);
  const initializedForClaimId = useRef(null);
  const wasOpen = useRef(false);
  const mapCenterInit = useRef(false);
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

  const vehicleLocation = useMemo(() => claim?.vehicle_location?.trim(), [claim]);

  const hasValidAddress = useMemo(() => {
    if (!claim) return false;
    return !!vehicleLocation && vehicleLocation.length >= 3;
  }, [claim, vehicleLocation]);

  // ── Reset wizard state ONLY when the modal opens fresh or for a different
  // claim.  Depends on claim?.id (not claim) so query refetches that change
  // the claim object reference do NOT re-run this effect and reset the step. ──
  useEffect(() => {
    if (isOpen && claim) {
      const isFreshOpen = !wasOpen.current || initializedForClaimId.current !== claim.id;
      wasOpen.current = true;
      initializedForClaimId.current = claim.id;

      if (isFreshOpen) {
        hasAttemptedGeocode.current = false;
        mapCenterInit.current = false;
        setCurrentStep(startStep);
        setSelectedBodyshop(preSelectedBodyshop);
        setClientLocation(null);
        setGeocodeMessage(null);
        setGeneratedPdfUrl(null);
        setEmailTo(''); setEmailSubject(''); setEmailBody('');
        setSelectedEmailTemplateId('');
        setContactType(claim.last_contact_source ? claim.last_contact_source.toLowerCase() : 'client');
        setCustomContact({ name: '', phone: '', email: '' });
        setAuthorisedBy(claim.authorised_by || 'Client Insurer');
        setSelectedPdfTemplate(deriveTemplate(claim.authorised_by));

        const initialValidation = {};
        REQUIRED_FIELDS.forEach(field => {
          initialValidation[field.key] = claim[field.key] ?? (field.type === 'boolean' ? false : '');
        });
        // Seed insurance + instruction-contact fields so any inline edits in
        // the review step are tracked and saved.
        ['insurer', 'claim_ref', 'policy_number', 'policy_excess', 'audatex_code', 'send_estimate_email',
         'tp_insurer', 'tp_claim_ref', 'tp_policy_number', 'tp_policy_excess',
         'tp_name', 'tp_phone', 'tp_email', 'tp_address_line_1', 'tp_address_line_2', 'tp_town', 'tp_county', 'tp_postcode',
         'instruction_contact_name', 'instruction_contact_email', 'instruction_contact_phone',
        ].forEach(key => {
          initialValidation[key] = claim[key] ?? '';
        });
        setValidationData(initialValidation);
      }
    } else {
      wasOpen.current = false;
    }
  }, [isOpen, claim?.id, startStep, preSelectedBodyshop]);

  // ── Map center: set once when bodyshops load or pre-selected shop exists ──
  useEffect(() => {
    if (!isOpen || !claim || mapCenterInit.current) return;
    if (preSelectedBodyshop?.latitude && preSelectedBodyshop?.longitude) {
      setMapCenter([parseFloat(preSelectedBodyshop.latitude), parseFloat(preSelectedBodyshop.longitude)]);
      setMapZoom(11);
      mapCenterInit.current = true;
    } else if (validBodyshops.length > 0) {
      const avgLat = validBodyshops.reduce((sum, b) => sum + parseFloat(b.latitude), 0) / validBodyshops.length;
      const avgLng = validBodyshops.reduce((sum, b) => sum + parseFloat(b.longitude), 0) / validBodyshops.length;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(7);
      mapCenterInit.current = true;
    }
  }, [isOpen, validBodyshops, preSelectedBodyshop, claim]);

  // Essentials that must be present before allocation. These are normally
  // captured in the Instruction Pre-Check panel; the review step only flags
  // what's still missing and lets the user inline-edit those.
  const missingFields = useMemo(() => {
    if (!claim) return [];
    const ab = claim.authorised_by || 'Client Insurer';
    const isInsurer = ab === 'Client Insurer' || ab === 'Third Party Insurer';
    const isTp = ab === 'Third Party';
    const list = [];
    const has = (key, fallback = '') => {
      const v = validationData[key] ?? claim[key] ?? fallback;
      return !(v === null || v === undefined || v === '');
    };
    if (!has('claim_type')) list.push({ key: 'claim_type', label: 'Claim Type', type: 'select', options: ['Fault Claim', '3rd Party Insurer Direct', '3rd Party Paying Privately', 'Credit Repair', 'Glass Claim', 'Paying Privately'] });
    if (!has('client_name')) list.push({ key: 'client_name', label: 'Client Name', type: 'text' });
    if (!has('instruction_contact_email', claim.client_email)) list.push({ key: 'instruction_contact_email', label: 'Contact Email', type: 'email' });
    if (!has('instruction_contact_phone', claim.client_phone)) list.push({ key: 'instruction_contact_phone', label: 'Contact Phone', type: 'text' });
    if (isInsurer) {
      const insKey = ab === 'Client Insurer' ? 'insurer' : 'tp_insurer';
      const refKey = ab === 'Client Insurer' ? 'claim_ref' : 'tp_claim_ref';
      if (!has(insKey)) list.push({ key: insKey, label: 'Insurer Name', type: 'text' });
      if (!has(refKey)) list.push({ key: refKey, label: 'Claim Reference', type: 'text' });
    }
    if (isTp && !has('tp_name')) list.push({ key: 'tp_name', label: 'Third Party Name', type: 'text' });
    return list;
  }, [validationData, claim]);

  const handleValidationChange = (key, value) => {
    setValidationData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveValidation = async () => {
    setIsSavingValidation(true);
    try {
      // The Pre-Check panel already persists instruction details. Here we only
      // save any essentials the user inline-edited in the review step.
      const dataToSave = {};
      Object.keys(validationData).forEach(k => {
        const v = validationData[k];
        if (v !== null && v !== undefined && v !== '' && v !== claim[k]) dataToSave[k] = v;
      });
      if (Object.keys(dataToSave).length > 0) {
        await base44.entities.Claim.update(claim.id, sanitizeClaimData(dataToSave));
        queryClient.invalidateQueries({ queryKey: ['claims'] });
        queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
      }
      // Bodyshop was selected in step 0 (Find Repairer), so proceed to Generate Instruction
      setCurrentStep(2);
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

    if (!hasValidAddress || !vehicleLocation) {
      setGeocodeMessage({ type: 'info', text: 'No vehicle location available. Showing all bodyshops on the map.' });
      hasAttemptedGeocode.current = true;
      return;
    }

    hasAttemptedGeocode.current = true;

    const geocodeVehicleLocation = async () => {
      setIsGeocoding(true);
      try {
        const result = await geocodeAddress({ address: vehicleLocation });
        const data = result?.data || result;

        let coordinates = null;
        if (data && data.latitude && data.longitude) {
          coordinates = { lat: data.latitude, lng: data.longitude, display_name: data.display_name || vehicleLocation };
        }

        if (coordinates) {
          setClientLocation(coordinates);
          setMapCenter([coordinates.lat, coordinates.lng]);
          setMapZoom(10);
          setGeocodeMessage({ type: 'success', text: `Vehicle location found: ${coordinates.display_name}` });
        } else {
          setGeocodeMessage({ type: 'warning', text: 'Could not find vehicle location. Showing all bodyshops.' });
        }
      } catch (error) {
        setGeocodeMessage({ type: 'warning', text: 'Unable to locate vehicle location. Showing all bodyshops.' });
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeVehicleLocation();
  }, [isOpen, hasValidAddress, vehicleLocation, isGeocoding]);

  // ── Pre-fill email when bodyshop is selected ──
  useEffect(() => {
    if (selectedBodyshop && currentStep >= 2) {
      setEmailTo(selectedBodyshop.email || '');
    }
  }, [selectedBodyshop, currentStep]);

  const handleBodyshopClick = (bodyshop) => {
    setSelectedBodyshop(bodyshop);
    setMapCenter([parseFloat(bodyshop.latitude), parseFloat(bodyshop.longitude)]);
    setMapZoom(11);
    // NOTE: The bodyshop is NOT saved to the claim here — it is persisted in
    // handleSaveValidation and handleAllocate so that clicking a pin doesn't
    // trigger a query refetch that resets the wizard step.
  };

  // Contact details used on the instruction PDF. The Pre-Check panel writes
  // these to the dedicated instruction_contact_* fields; fall back to the
  // client fields if they haven't been set.
  const getContactOverrides = () => ({
    name: validationData.instruction_contact_name || claim.instruction_contact_name || claim.client_name || '',
    phone: validationData.instruction_contact_phone || claim.instruction_contact_phone || claim.client_phone || '',
    email: validationData.instruction_contact_email || claim.instruction_contact_email || claim.client_email || '',
  });

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const contactOverrides = getContactOverrides();
      // Generate without persisting to docs — the PDF is only saved to the
      // claim at the point of allocating the repairer (handleAllocate), so
      // regenerating here doesn't leave unused PDFs in the docs list.
      const response = await base44.functions.invoke('generateBodyshopInstructionPdf', {
        claimId: claim.id,
        contactOverrides,
        templateType: selectedPdfTemplate,
        saveToClaim: false,
        repairerName: selectedBodyshop?.name || '',
      });

      const { file_url } = response.data;
      if (!file_url) throw new Error('No file URL returned');
      setGeneratedPdfUrl(file_url);
      setInstructionSavedToDocs(false);
      window.open(file_url, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Optionally save the generated instruction PDF to the claim's docs
  // immediately (before allocation), so it's persisted even if the wizard
  // is closed without completing allocation.
  const handleSaveInstructionToDocs = async () => {
    if (!generatedPdfUrl) return;
    setIsSavingInstructionToDocs(true);
    try {
      const currentFileUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
      // Avoid duplicating if already saved
      if (!currentFileUrls.includes(generatedPdfUrl)) {
        await base44.entities.Claim.update(claim.id, {
          file_urls: [...currentFileUrls, generatedPdfUrl],
          instruction_pdf_url: generatedPdfUrl,
        });
      } else {
        await base44.entities.Claim.update(claim.id, {
          instruction_pdf_url: generatedPdfUrl,
        });
      }
      setInstructionSavedToDocs(true);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    } catch (error) {
      console.error('Error saving instruction to docs:', error);
      alert('Failed to save instruction to claim docs. Please try again.');
    } finally {
      setIsSavingInstructionToDocs(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedBodyshop) return;
    setIsAllocating(true);
    try {
      const updateData = {
        bs_instructed: new Date().toISOString().split('T')[0],
        bodyshop_id: selectedBodyshop.id,
        bodyshop: selectedBodyshop.name,
        bodyshop_email: selectedBodyshop.email || '',
      };

      // Persist the generated instruction PDF to the claim's docs now —
      // only the PDF actually used at allocation is saved.
      if (generatedPdfUrl) {
        const currentFileUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
        updateData.file_urls = currentFileUrls.includes(generatedPdfUrl)
          ? currentFileUrls
          : [...currentFileUrls, generatedPdfUrl];
        updateData.instruction_pdf_url = generatedPdfUrl;
      }

      await base44.entities.Claim.update(claim.id, updateData);

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
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
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
      case 0: return !!selectedBodyshop;
      case 1: return missingFields.length === 0;
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

  const isLocked = !!claim?.bs_instructed;

  if (!isOpen || !claim) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent
        className="max-w-6xl w-full min-h-[500px] max-h-[95vh] p-0 overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header with Steps */}
        <div className="px-3 lg:px-4 py-2.5 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm lg:text-base font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="truncate">Allocate - {claim.job_number || claim.reg}</span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <React.Fragment key={step.id}>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${
                    isActive ? 'bg-primary text-primary-foreground' :
                    isCompleted ? 'bg-green-100 text-green-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <StepIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium whitespace-nowrap">{step.title}</span>
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
        <div className="flex-1 overflow-y-auto p-3 lg:p-4" style={{ minHeight: 0, maxHeight: 'calc(95vh - 120px)' }}>
          {currentStep === 0 && (
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
          {currentStep === 1 && (
            <WizardValidateStep
              claim={claim}
              validationData={validationData}
              missingFields={missingFields}
              onValidationChange={handleValidationChange}
              isLocked={isLocked}
            />
          )}
          {currentStep === 2 && (
            <WizardInstructionStep
              selectedBodyshop={selectedBodyshop}
              pdfTemplates={pdfTemplates}
              selectedPdfTemplate={selectedPdfTemplate}
              isGeneratingPdf={isGeneratingPdf}
              generatedPdfUrl={generatedPdfUrl}
              isSavingToDocs={isSavingInstructionToDocs}
              savedToDocs={instructionSavedToDocs}
              onSelectTemplate={setSelectedPdfTemplate}
              onGeneratePdf={handleGeneratePdf}
              onSaveToDocs={handleSaveInstructionToDocs}
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
        <div className="px-3 lg:px-4 py-2.5 border-t border-border flex justify-between gap-3 flex-shrink-0 pb-[max(env(safe-area-inset-bottom),0.625rem)]">
          <Button variant="outline"
            onClick={() => currentStep === 0 ? onClose() : setCurrentStep(currentStep - 1)}
            className="flex-1 max-w-[140px] h-10">
            <ChevronLeft className="w-4 h-4 mr-2" />
            <span>{currentStep === 0 ? 'Cancel' : 'Back'}</span>
          </Button>

          {currentStep === 1 && (
            <Button onClick={handleSaveValidation} disabled={missingFields.length > 0 || isSavingValidation} className="flex-1 max-w-[160px] h-10">
              {isSavingValidation ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <>Save & Continue <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}

          {currentStep !== 1 && currentStep < STEPS.length - 1 && (
            <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()} className="flex-1 max-w-[140px] h-10">
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}