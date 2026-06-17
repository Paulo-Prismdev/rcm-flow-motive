import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, MapPin, CheckCircle, Phone, Mail, MapPinned, AlertCircle, Loader,
  ChevronRight, ChevronLeft, FileText, Send, Building2, Settings, ClipboardCheck, Wrench,
  User, Car, Pencil
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import InsurerCombobox from '../shared/InsurerCombobox';
import CustomSelect from '../shared/CustomSelect';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const bodyshopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const bodyshopSelectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Replace placeholders in template with actual data
const replacePlaceholders = (text, itemData) => {
  if (!text || !itemData) return text;
  let result = text;
  Object.keys(itemData).forEach(key => {
    const value = itemData[key];
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  });
  return result;
};

const STEPS = [
  { id: 'validate', title: 'Validate Details', icon: ClipboardCheck },
  { id: 'map', title: 'Find Repairer', icon: MapPin },
  { id: 'instruction', title: 'Generate Instruction', icon: FileText },
  { id: 'email', title: 'Compose Email', icon: Mail },
  { id: 'confirm', title: 'Confirm Allocation', icon: CheckCircle },
];

// Required fields for allocation
const REQUIRED_FIELDS = [
  { key: 'claim_type', label: 'Claim Type', type: 'select', options: ['Credit Repair', 'Fault Claim', 'Non-Fault Claim', 'Total Loss', 'Glass Claim'] },
  { key: 'client_name', label: 'Client Name', type: 'text' },
  { key: 'client_address_line_1', label: 'Client Address', type: 'text' },
  { key: 'driver_contact_name', label: 'Contact Name', type: 'text' },
  { key: 'client_email', label: 'Client Email', type: 'email' },
  { key: 'client_phone', label: 'Client Phone', type: 'text' },
  { key: 'client_vat_status', label: 'Client VAT Status', type: 'select', options: ['VAT Registered', 'Non-VAT', 'Unknown'] },
  { key: 'make_model', label: 'Vehicle Make/Model', type: 'text' },
  { key: 'reg', label: 'Vehicle Registration', type: 'text' },
  { key: 'vehicle_location', label: 'Vehicle Location', type: 'text' },
  { key: 'vehicle_damage', label: 'Vehicle Damage', type: 'textarea' },
  { key: 'recovery_required', label: 'Urgent Recovery Required', type: 'boolean' },
  { key: 'unroadworthy', label: 'Vehicle Unroadworthy', type: 'boolean' },
  { key: 'courtesy_car_required', label: 'Courtesy Car Required', type: 'boolean' },
  { key: 'claim_ref', label: 'Insurer Claim Number', type: 'text' },
  { key: 'policy_number', label: 'Policy Number', type: 'text' },
  { key: 'send_estimate_email', label: 'Email Estimate To', type: 'email' },
  { key: 'audatex_code', label: 'Audatex Code', type: 'text' },
  { key: 'policy_excess', label: 'Policy Excess (£)', type: 'number' },
  { key: 'referral_fee_repairer', label: 'Repairer Fee (%)', type: 'number' },
];

export default function BodyshopAllocationWizard({ claim, isOpen, onClose, onAllocationComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBodyshop, setSelectedBodyshop] = useState(null);
  const [clientLocation, setClientLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState(null);
  const [mapCenter, setMapCenter] = useState([54.5, -2.0]);
  const [mapZoom, setMapZoom] = useState(7);
  
  // Validation step
  const [validationData, setValidationData] = useState({});
  const [isSavingValidation, setIsSavingValidation] = useState(false);
  
  // Instruction step
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState('standard');
  const [contactType, setContactType] = useState('client');
  const [customContact, setCustomContact] = useState({ name: '', phone: '', email: '' });
  
  // Email step
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');
  
  // Allocation step
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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const validBodyshops = useMemo(() => 
    bodyshops.filter(b => 
      b.latitude && b.longitude && 
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude))
    ),
    [bodyshops]
  );

  const clientAddress = useMemo(() => 
    [
      claim?.client_address_line_1,
      claim?.client_address_line_2,
      claim?.client_town,
      claim?.client_county,
      claim?.client_postcode
    ].filter(Boolean).join(', '),
    [claim]
  );

  const hasValidAddress = useMemo(() => {
    if (!claim) return false;
    const hasPostcode = claim.client_postcode && claim.client_postcode.trim().length >= 5;
    const hasStreetAndTown = claim.client_address_line_1 && claim.client_address_line_1.trim().length > 3 && 
                             claim.client_town && claim.client_town.trim().length > 2;
    return hasPostcode || hasStreetAndTown;
  }, [claim]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen && claim) {
      hasAttemptedGeocode.current = false;
      setCurrentStep(0);
      setSelectedBodyshop(null);
      setClientLocation(null);
      setGeocodeMessage(null);
      setGeneratedPdfUrl(null);
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      setSelectedEmailTemplateId('');
      setContactType('client');
      setCustomContact({ name: '', phone: '', email: '' });
      
      // Initialize validation data from claim
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

  // Check which fields are missing
  const missingFields = useMemo(() => {
    return REQUIRED_FIELDS.filter(field => {
      const value = validationData[field.key];
      if (field.type === 'boolean') return false; // Booleans are always valid
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
      await base44.entities.Claim.update(claim.id, validationData);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setCurrentStep(1); // Move to map step
    } catch (error) {
      console.error('Error saving validation data:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSavingValidation(false);
    }
  };

  // Geocode client address
  useEffect(() => {
    if (!isOpen || hasAttemptedGeocode.current || isGeocoding) return;

    if (!hasValidAddress || !clientAddress.trim()) {
      setGeocodeMessage({
        type: 'info',
        text: 'No client address available. Showing all bodyshops on the map.'
      });
      hasAttemptedGeocode.current = true;
      return;
    }

    hasAttemptedGeocode.current = true;

    const geocodeClientAddress = async () => {
      setIsGeocoding(true);
      try {
        const result = await base44.functions.invoke('geocodeAddress', { address: clientAddress });
        
        let coordinates = null;
        if (result && result.latitude && result.longitude) {
          coordinates = { lat: result.latitude, lng: result.longitude, display_name: result.display_name || clientAddress };
        } else if (result?.data && result.data.latitude && result.data.longitude) {
          coordinates = { lat: result.data.latitude, lng: result.data.longitude, display_name: result.data.display_name || clientAddress };
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

  // When bodyshop is selected, pre-fill email
  useEffect(() => {
    if (selectedBodyshop && currentStep >= 2) {
      setEmailTo(selectedBodyshop.email || '');
    }
  }, [selectedBodyshop, currentStep]);

  const handleBodyshopClick = async (bodyshop) => {
    setSelectedBodyshop(bodyshop);
    setMapCenter([parseFloat(bodyshop.latitude), parseFloat(bodyshop.longitude)]);
    setMapZoom(11);
    
    // Save the bodyshop to the claim immediately (but don't notify yet)
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
      
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleEmailTemplateSelect = (templateId) => {
    setSelectedEmailTemplateId(templateId);
    
    if (templateId) {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        const itemData = {
          ...claim,
          bodyshop: selectedBodyshop?.name,
          bodyshop_name: selectedBodyshop?.name,
          bodyshop_email: selectedBodyshop?.email,
          bodyshop_phone: selectedBodyshop?.phone,
        };
        setEmailSubject(replacePlaceholders(template.subject, itemData));
        setEmailBody(replacePlaceholders(template.body, itemData));
      }
    }
  };

  const handleOpenInOutlook = () => {
    if (!emailTo) {
      alert('Please enter a recipient email');
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject || '')}&body=${encodeURIComponent(emailBody || '')}`;
    window.location.href = mailtoUrl;
  };

  const handleAllocate = async () => {
    if (!selectedBodyshop) return;
    
    setIsAllocating(true);
    try {
      // Update claim with instruction date (bodyshop already saved in step 1)
      await base44.entities.Claim.update(claim.id, {
        bs_instructed: new Date().toISOString().split('T')[0],
      });

      // Create notification for the bodyshop (best-effort — may fail for non-internal users)
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
          // Notification creation is non-critical — allocation still completes
          console.warn('Could not create bodyshop notification:', notifError.message);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['claims'] });
      
      if (onAllocationComplete) {
        onAllocationComplete(selectedBodyshop);
      }
      
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
      case 0: return missingFields.length === 0; // Validation step
      case 1: return !!selectedBodyshop; // Map step
      case 2: return true; // PDF generation is optional
      case 3: return true; // Email is optional
      case 4: return true; // Confirm step
      default: return false;
    }
  };

  const radiusInMeters = 30 * 1609.34;

  if (!isOpen || !claim) return null;

  const builtInPdfTemplates = [
    { id: 'standard', name: 'Standard Instructions', icon: FileText },
    { id: 'orkin', name: 'Orkin Instructions', icon: Wrench },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full min-h-[600px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Header with Steps */}
        <div className="p-3 lg:p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base lg:text-xl font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 lg:w-5 lg:h-5 text-accent" />
              <span className="truncate">Allocate - {claim.job_number || claim.reg}</span>
            </h2>
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <React.Fragment key={step.id}>
                  <div 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                      isActive ? 'bg-accent text-accent-foreground' : 
                      isCompleted ? 'bg-green-100 text-green-700' : 
                      'bg-surface text-foreground-muted'
                    }`}
                  >
                    <StepIcon className="w-4 h-4" />
                    <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4" style={{ minHeight: 0 }}>
          {/* Step 0: Validate Details */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {/* Instruction Contact */}
              <div>
                <h3 className="font-bold text-lg mb-2">Instruction Contact</h3>
                <p className="text-sm text-foreground-muted mb-3">
                  Who should the repairer contact for drop-off, updates and collection?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'client', label: 'Client', icon: User, description: 'Use client details', details: (validationData.client_name || claim.client_name) ? `${validationData.client_name || claim.client_name}${(validationData.client_phone || claim.client_phone) ? ' — ' + (validationData.client_phone || claim.client_phone) : ''}` : 'No client details' },
                    { value: 'driver', label: 'Driver / Repair Contact', icon: Car, description: 'Use driver details', disabled: !claim.driver_contact_name, details: claim.driver_contact_name ? `${claim.driver_contact_name}${claim.driver_contact_phone ? ' — ' + claim.driver_contact_phone : ''}` : 'No driver details on file' },
                    { value: 'custom', label: 'Custom', icon: Pencil, description: 'Enter custom details', details: null },
                  ].map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => !option.disabled && setContactType(option.value)}
                        disabled={option.disabled}
                        className={`text-left p-3 rounded-lg border-2 transition-all ${
                          contactType === option.value 
                            ? 'border-accent bg-accent/5' 
                            : 'border-border hover:border-gray-300'
                        } ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start gap-2">
                          <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${contactType === option.value ? 'text-accent' : 'text-foreground-muted'}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{option.label}</p>
                            <p className="text-xs text-foreground-muted">{option.description}</p>
                            {option.details && <p className="text-[11px] text-foreground-muted mt-1 truncate">{option.details}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {contactType === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 mt-3 rounded-lg bg-muted">
                    <div>
                      <label className="block text-xs text-foreground-muted mb-1">Contact Name</label>
                      <Input 
                        value={customContact.name} 
                        onChange={(e) => setCustomContact(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter name..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground-muted mb-1">Contact Phone</label>
                      <Input 
                        value={customContact.phone} 
                        onChange={(e) => setCustomContact(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground-muted mb-1">Contact Email</label>
                      <Input 
                        type="email"
                        value={customContact.email} 
                        onChange={(e) => setCustomContact(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Pre-Allocation Checklist</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Please ensure all required fields are completed before allocating to a repairer.
                      {missingFields.length > 0 && (
                        <span className="font-medium"> {missingFields.length} field(s) need attention.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_FIELDS.map(field => {
                  const isMissing = missingFields.some(f => f.key === field.key);
                  const value = validationData[field.key];
                  
                  return (
                    <div key={field.key} className={`p-3 rounded-lg border ${isMissing ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        {isMissing ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {field.label}
                        {isMissing && <span className="text-red-500">*</span>}
                      </label>
                      
                      {field.type === 'select' && (
                        <CustomSelect
                          value={value || ''}
                          onChange={(v) => handleValidationChange(field.key, v)}
                          options={field.options.map(opt => ({ value: opt, label: opt }))}
                          className="bg-white"
                        />
                      )}
                      
                      {field.type === 'text' && (
                        <Input
                          value={value || ''}
                          onChange={(e) => handleValidationChange(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="bg-white"
                        />
                      )}
                      
                      {field.type === 'email' && (
                        <Input
                          type="email"
                          value={value || ''}
                          onChange={(e) => handleValidationChange(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="bg-white"
                        />
                      )}
                      
                      {field.type === 'number' && (
                        <Input
                          type="number"
                          value={value || ''}
                          onChange={(e) => handleValidationChange(field.key, e.target.value ? parseFloat(e.target.value) : '')}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="bg-white"
                        />
                      )}
                      
                      {field.type === 'textarea' && (
                        <Textarea
                          value={value || ''}
                          onChange={(e) => handleValidationChange(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="bg-white min-h-[80px]"
                        />
                      )}
                      
                      {field.type === 'boolean' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={value || false}
                            onChange={(e) => handleValidationChange(field.key, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-foreground-muted">Yes</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {missingFields.length === 0 && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">All required fields are complete. You can proceed to select a repairer.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Map */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {isGeocoding && (
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-50/50 flex items-center gap-2">
                  <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                  <p className="text-xs">Locating client...</p>
                </div>
              )}

              {!isGeocoding && geocodeMessage && (
                <div className={`p-3 rounded-lg border ${
                  geocodeMessage.type === 'success' ? 'border-green-500/30 bg-green-50/50' : 
                  geocodeMessage.type === 'warning' ? 'border-orange-500/30 bg-orange-50/50' : 
                  'border-blue-500/30 bg-blue-50/50'
                }`}>
                  <div className="flex items-start gap-2">
                    {geocodeMessage.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    )}
                    <p className="text-xs">{geocodeMessage.text}</p>
                  </div>
                </div>
              )}

              {/* Legend - Compact */}
              <div className="flex flex-wrap gap-2 text-xs">
                {clientLocation && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="truncate">Client: {claim.client_name || 'Location'}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Bodyshops ({validBodyshops.length})</span>
                </div>
                {selectedBodyshop && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Selected</span>
                  </div>
                )}
              </div>

              {/* Map */}
              <div className="rounded-xl overflow-hidden border" style={{ height: '300px' }}>
                <MapContainer 
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                    maxZoom={20}
                  />
                  <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
                  
                  {clientLocation && (
                    <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon} />
                  )}

                  {validBodyshops.map((bodyshop) => {
                    const lat = parseFloat(bodyshop.latitude);
                    const lng = parseFloat(bodyshop.longitude);
                    if (isNaN(lat) || isNaN(lng)) return null;
                    
                    return (
                      <Marker 
                        key={bodyshop.id}
                        position={[lat, lng]}
                        icon={selectedBodyshop?.id === bodyshop.id ? bodyshopSelectedIcon : bodyshopIcon}
                        eventHandlers={{ click: () => handleBodyshopClick(bodyshop) }}
                      />
                    );
                  })}

                  {selectedBodyshop && (
                    <Circle
                      center={[parseFloat(selectedBodyshop.latitude), parseFloat(selectedBodyshop.longitude)]}
                      radius={radiusInMeters}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1, weight: 2 }}
                    />
                  )}
                </MapContainer>
              </div>

              {/* Selected Bodyshop Info - Compact */}
              {selectedBodyshop ? (
                <div className="p-2 lg:p-3 rounded-xl border-2 border-accent bg-accent/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs lg:text-sm flex items-center gap-1.5 text-accent mb-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Selected Repairer
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] lg:text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-xs lg:text-sm truncate">{selectedBodyshop.name}</p>
                          <p className="text-foreground-muted truncate">{selectedBodyshop.contact_name}</p>
                          <p className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{selectedBodyshop.phone}</span>
                          </p>
                          <p className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{selectedBodyshop.email}</span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] lg:text-xs text-foreground-muted flex items-center gap-1">
                            <MapPinned className="w-2.5 h-2.5" />
                            Address
                          </p>
                          <div className="text-[11px] lg:text-xs">
                            {selectedBodyshop.address_line_1 && <p className="truncate">{selectedBodyshop.address_line_1}</p>}
                            {selectedBodyshop.town && <p className="truncate">{selectedBodyshop.town}</p>}
                            {selectedBodyshop.postcode && <p className="font-semibold">{selectedBodyshop.postcode}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 -mt-1 -mr-1" onClick={() => setSelectedBodyshop(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-foreground-muted p-2 lg:p-3 bg-surface rounded-lg">
                  Click on a blue marker to select a repairer
                </div>
              )}
            </div>
          )}

          {/* Step 2: Instruction PDF */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="font-medium">Selected Repairer: {selectedBodyshop?.name}</p>
                <p className="text-sm text-foreground-muted">{selectedBodyshop?.email}</p>
              </div>

              <h3 className="font-bold text-lg">Select Template</h3>
              <p className="text-sm text-foreground-muted">
                Select a template to generate the bodyshop instruction PDF. This will open in a new tab and be saved to the claim.
              </p>

              {/* Built-in Templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {builtInPdfTemplates.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPdfTemplate === template.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                      onClick={() => setSelectedPdfTemplate(template.id)}
                    >
                      <div className="text-center">
                        <IconComponent className="w-8 h-8 mx-auto mb-2 text-accent" />
                        <p className="font-medium">{template.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Templates */}
              {pdfTemplates.filter(t => t.is_active).length > 0 && (
                <>
                  <h4 className="font-medium mt-4">Custom Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pdfTemplates.filter(t => t.is_active).map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPdfTemplate === template.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                        }`}
                        onClick={() => setSelectedPdfTemplate(template.id)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-accent" />
                          <p className="font-medium">{template.template_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Button 
                onClick={handleGeneratePdf} 
                disabled={isGeneratingPdf}
                className="w-full py-3"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate & View Instruction PDF
                  </>
                )}
              </Button>

              {generatedPdfUrl && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  PDF generated successfully and saved to claim attachments
                </div>
              )}

              <p className="text-xs text-foreground-muted">
                You can skip this step if you don't need to generate an instruction document.
              </p>
            </div>
          )}

          {/* Step 3: Email */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="font-medium">Selected Repairer: {selectedBodyshop?.name}</p>
                <p className="text-sm text-foreground-muted">{selectedBodyshop?.email}</p>
              </div>

              <h3 className="font-bold text-lg">Compose Email to Repairer</h3>
              <p className="text-sm text-foreground-muted">
                Send the instruction email to the bodyshop. This will open in your default email client (Outlook).
              </p>

              {/* Email Template Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Email Template (Optional)</label>
                <Select value={selectedEmailTemplateId} onValueChange={handleEmailTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template or write custom email" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None (Custom Email)</SelectItem>
                    {emailTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To Field */}
              <div>
                <label className="block text-sm font-medium mb-2">To *</label>
                <Input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              {/* Body Field */}
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Email message"
                  className="h-40"
                />
              </div>

              <Button onClick={handleOpenInOutlook} className="w-full py-3">
                <Mail className="w-4 h-4 mr-2" />
                Open in Outlook
              </Button>

              <p className="text-xs text-foreground-muted">
                You can skip this step if you prefer to send the email manually later.
              </p>
            </div>
          )}

          {/* Step 4: Confirm Allocation */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-bold text-xl mb-2">Ready to Allocate</h3>
                <p className="text-foreground-muted">
                  Confirm the allocation to complete the process
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-surface">
                <h4 className="font-bold mb-3">Allocation Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Job Reference:</span>
                    <span className="font-medium">{claim.job_number || claim.reg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Client:</span>
                    <span className="font-medium">{claim.client_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Vehicle:</span>
                    <span className="font-medium">{claim.make_model || claim.reg}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Allocated To:</span>
                    <span className="font-bold text-accent">{selectedBodyshop?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Contact:</span>
                    <span className="font-medium">{selectedBodyshop?.contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Email:</span>
                    <span className="font-medium">{selectedBodyshop?.email}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>What happens next:</strong>
                  <br />• The claim will be updated with the selected bodyshop
                  <br />• A notification will be sent to the repairer's portal
                  <br />• The instruction date will be set to today
                </p>
              </div>

              <Button 
                onClick={handleAllocate} 
                disabled={isAllocating}
                className="w-full py-4 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isAllocating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Allocating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Allocation
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer Navigation - Fixed at bottom with safe spacing */}
        <div className="p-4 lg:p-5 border-t border-border flex justify-between gap-3 flex-shrink-0 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <Button
            variant="outline"
            onClick={() => currentStep === 0 ? onClose() : setCurrentStep(currentStep - 1)}
            className="flex-1 max-w-[140px] h-10"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            <span>{currentStep === 0 ? 'Cancel' : 'Back'}</span>
          </Button>

          {currentStep === 0 && (
            <Button
              onClick={handleSaveValidation}
              disabled={missingFields.length > 0 || isSavingValidation}
              className="flex-1 max-w-[160px] h-10"
            >
              {isSavingValidation ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save & Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="flex-1 max-w-[140px] h-10"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}