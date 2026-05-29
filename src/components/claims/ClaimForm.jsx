import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, Plus, Search, Loader, AlertCircle, Sparkles, Send, Copy } from "lucide-react";

function CopyLinkButton({ url }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 whitespace-nowrap transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}
import ClientFormLink from './ClientFormLink';
import ClaimEditForm from './ClaimEditForm';
import InsurerCombobox from "../shared/InsurerCombobox";
import FileUpload from '../shared/FileUpload';
import ClientCombobox from '../shared/ClientCombobox';
import ReferrerCombobox from '../shared/ReferrerCombobox';
import AddClientModal from '../shared/AddClientModal';
import StatusMultiSelect from '../shared/StatusMultiSelect';
import ClaimIndemnityFields from './ClaimIndemnityFields';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AddressLookupInput from '../shared/AddressLookupInput';
import AIExtractConfirmDialog from '../shared/AIExtractConfirmDialog';

const geocodeAddress = async (address) => {
  if (!address || address.trim() === '') return null;
  await new Promise(resolve => setTimeout(resolve, 300));
  const l = address.toLowerCase();
  if (l.includes("london")) return { lat: 51.5074, lng: 0.1278 };
  return null;
};

export default function ClaimForm({ claim, onSubmit, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showTPModal, setShowTPModal] = useState(false);
  const [isLookingUpVehicle, setIsLookingUpVehicle] = useState(false);
  const [vehicleLookupError, setVehicleLookupError] = useState(null);
  const [isLookingUpTPVehicle, setIsLookingUpTPVehicle] = useState(false);
  const [tpVehicleLookupError, setTpVehicleLookupError] = useState(null);
  const [aiExtractDialog, setAiExtractDialog] = useState({ isOpen: false, data: null });
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

  const [formData, setFormData] = useState(claim || {
    job_number: '', reg: '', job_statuses: ['New'], claim_type: 'Credit Repair',
    circumstances: '', loss_date: '', loss_time: '', incident_location: '',
    vehicle_use: '', courtesy_car_required: false, has_third_party: false,
    requires_indemnity: false, file_urls: [], insurer: '', claim_ref: '',
    policy_number: '', policy_excess: 0, referrer: '', referrer_id: null,
    referrer_ref: '', file_handler: '', referrer_email: '', percent_to_referrer: 0,
    client_name: '', client_id: null, client_phone: '', driver_contact_name: '',
    client_email: '', client_address_line_1: '', client_address_line_2: '',
    client_town: '', client_county: '', client_postcode: '', client_vat_status: 'Unknown',
    business_division: '', client_lat: null, client_lng: null,
    make_model: '', vehicle_make: '', vehicle_model: '', vehicle_colour: '',
    vehicle_fuel_type: '', vehicle_year_of_manufacture: null, vehicle_engine_capacity: null,
    vehicle_co2_emissions: null, vehicle_euro_status: '', vehicle_mot_status: '',
    vehicle_mot_expiry_date: '', vehicle_tax_status: '', vehicle_tax_due_date: '',
    vehicle_date_of_last_v5c_issued: '', vehicle_wheelplan: '', vehicle_revenue_weight: null,
    vehicle_location: '', vehicle_damage: '', vehicle_type: 'Car',
    unroadworthy: false, recovery_required: false,
    tp_name: '', tp_phone: '', tp_driver_contact: '', tp_email: '',
    tp_address_line_1: '', tp_address_line_2: '', tp_town: '', tp_county: '',
    tp_postcode: '', tp_vat_status: 'Unknown', tp_reg: '', tp_make_model: '',
    tp_vehicle_colour: '', tp_vehicle_fuel_type: '', tp_vehicle_year_of_manufacture: null,
    tp_insurer: '', tp_policy_number: '', tp_claim_ref: '', tp_vehicle_location: '',
    tp_vehicle_damage: '', tp_vehicle_type: 'Car', tp_unroadworthy: false,
    tp_recovery_required: false, bodyshop: '', bodyshop_id: null, bodyshop_email: '',
    authorising_party: '', audatex_code: '', send_estimate_email: '', artura_est_url: '',
    est_fee: 0, referral_fee_repairer: 0, percent_bld_instruction: 0,
    date_received: new Date().toISOString().split('T')[0],
    estimate_completed: '', authority_received: '', bs_instructed: '',
    booking_in_date: '', on_site_date: '', all_parts_on_site: '', ecd: '',
    completion_date: '', invoice_received_repairer: '', invoice_sent_referrer: '',
    estimate_cost_net: 0, authority_cost_net: 0, estimate_cost_gross: 0,
    authority_cost_gross: 0, final_repair_cost: 0, total_invoice_repairer: 0,
    indemnity_driver_dob: '', indemnity_registered_owner: '',
    indemnity_pending_prosecutions: '', indemnity_dvla_medical_restrictions: '',
    indemnity_full_license_12_months: '', indemnity_convictions_last_5_years: '',
    indemnity_vehicle_use_at_incident: '', indemnity_vehicle_modifications: '',
  });

  const isEditing = !!claim;
  const [choiceStep, setChoiceStep] = useState(!isEditing); // show choice screen for new claims

  const handleAIExtract = async (extractedData) => {
    setAiExtractDialog({ isOpen: true, data: extractedData });
  };

  const handleAIExtractConfirm = (selectedData) => {
    if (selectedData) setFormData(prev => ({ ...prev, ...selectedData }));
    setAiExtractDialog({ isOpen: false, data: null });
  };

  const handleVehicleLookup = async () => {
    if (!formData.reg || formData.reg.trim().length < 3) {
      setVehicleLookupError('Please enter a valid registration number');
      return;
    }
    setIsLookingUpVehicle(true);
    setVehicleLookupError(null);
    try {
      const response = await base44.functions.invoke('lookupVehicleData', { registrationNumber: formData.reg });
      const result = response.data;
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          make_model: result.make_model || '', vehicle_make: result.make || '',
          vehicle_model: result.model || '', vehicle_colour: result.colour || '',
          vehicle_fuel_type: result.fuel_type || '',
          vehicle_year_of_manufacture: result.year_of_manufacture || null,
          vehicle_engine_capacity: result.engine_capacity || null,
          vehicle_co2_emissions: result.co2_emissions || null,
          vehicle_euro_status: result.euro_status || '', vehicle_mot_status: result.mot_status || '',
          vehicle_mot_expiry_date: result.mot_expiry_date || '', vehicle_tax_status: result.tax_status || '',
          vehicle_tax_due_date: result.tax_due_date || '',
          vehicle_date_of_last_v5c_issued: result.date_of_last_v5c_issued || '',
          vehicle_wheelplan: result.wheelplan || '', vehicle_revenue_weight: result.revenue_weight || null,
        }));
        setVehicleLookupError(null);
      } else {
        setVehicleLookupError(result.message || 'Vehicle not found');
      }
    } catch (error) {
      setVehicleLookupError(error.response?.data?.message || error.message || 'Unable to lookup vehicle.');
    } finally {
      setIsLookingUpVehicle(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { id: _id, created_date: _cd, updated_date: _ud, created_by: _cb, ...submitData } = formData;
    if (!claim) {
      try {
        const response = await base44.functions.invoke('generateJobNumber', { entityType: 'Claim' });
        if (response.data.success) {
          submitData.job_number = response.data.job_number;
        } else {
          alert('Failed to generate job number. Please try again.');
          return;
        }
      } catch (error) {
        alert('Failed to generate job number. Please try again.');
        return;
      }
      if (submitData.claim_type === 'Fault Claim') {
        submitData.third_party_pursuit_status = 'Awaiting Details';
      }
    }
    onSubmit(submitData);
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleCheckboxChange = (field, checked) => setFormData(prev => ({ ...prev, [field]: checked }));

  const handleIncidentLocationChange = (addressData) => handleChange('incident_location', addressData.display_name || addressData.address || '');
  const handleVehicleLocationChange = (addressData) => handleChange('vehicle_location', addressData.display_name || addressData.address || '');

  const handleBodyshopChange = (bodyshop) => setFormData(prev => ({
    ...prev, bodyshop: bodyshop.name, bodyshop_id: bodyshop.id, bodyshop_email: bodyshop.email || ''
  }));

  const handleClientChange = async (client) => {
    const fullAddress = [client.address_line_1, client.address_line_2, client.town, client.county, client.postcode].filter(Boolean).join(', ');
    let geocodedLat = null, geocodedLng = null;
    if (fullAddress) {
      try {
        const coords = await geocodeAddress(fullAddress);
        if (coords) { geocodedLat = coords.lat; geocodedLng = coords.lng; }
      } catch (error) { console.error("Geocoding failed:", error); }
    }
    setFormData(prev => ({
      ...prev,
      client_name: client.name, client_id: client.id, client_phone: client.phone || '',
      client_email: client.email || '', client_address_line_1: client.address_line_1 || '',
      client_address_line_2: client.address_line_2 || '', client_town: client.town || '',
      client_county: client.county || '', client_postcode: client.postcode || '',
      vehicle_location: fullAddress || '', client_lat: geocodedLat, client_lng: geocodedLng,
    }));
  };

  const handleSaveClientToDatabase = async () => {
    if (!formData.client_name) { alert('Please enter a client name'); return; }
    if (!formData.client_phone && !formData.client_email) { alert('Please enter at least a phone number or email'); return; }
    try {
      const newClient = await base44.entities.Client.create({
        name: formData.client_name, phone: formData.client_phone || '', email: formData.client_email || '',
        address_line_1: formData.client_address_line_1 || '', address_line_2: formData.client_address_line_2 || '',
        town: formData.client_town || '', county: formData.client_county || '', postcode: formData.client_postcode || ''
      });
      setFormData(prev => ({ ...prev, client_id: newClient.id }));
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      alert('Client saved to database successfully!');
    } catch (error) {
      alert('Failed to save client. Please try again.');
    }
  };

  const handleClientModalSuccess = (newClient) => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    handleClientChange(newClient);
    setShowClientModal(false);
  };

  const handleTPChange = async (client) => {
    setFormData(prev => ({
      ...prev, tp_name: client.name, tp_phone: client.phone || '', tp_email: client.email || '',
      tp_address_line_1: client.address_line_1 || '', tp_address_line_2: client.address_line_2 || '',
      tp_town: client.town || '', tp_county: client.county || '', tp_postcode: client.postcode || '',
    }));
  };

  const handleTPModalSuccess = (newClient) => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    handleTPChange(newClient);
    setShowTPModal(false);
  };

  const handleTPVehicleLookup = async () => {
    if (!formData.tp_reg || formData.tp_reg.trim().length < 3) {
      setTpVehicleLookupError('Please enter a valid registration number'); return;
    }
    setIsLookingUpTPVehicle(true);
    setTpVehicleLookupError(null);
    try {
      const response = await base44.functions.invoke('lookupVehicleData', { registrationNumber: formData.tp_reg });
      const result = response.data;
      if (result.success) {
        setFormData(prev => ({
          ...prev, tp_make_model: result.make_model || '', tp_vehicle_colour: result.colour || '',
          tp_vehicle_fuel_type: result.fuel_type || '', tp_vehicle_year_of_manufacture: result.year_of_manufacture || null,
        }));
        setTpVehicleLookupError(null);
      } else {
        setTpVehicleLookupError(result.message || 'Vehicle not found');
      }
    } catch (error) {
      setTpVehicleLookupError(error.response?.data?.message || error.message || 'Unable to lookup vehicle.');
    } finally {
      setIsLookingUpTPVehicle(false);
    }
  };

  const [referrerCompanyId, setReferrerCompanyId] = useState(claim?.referrer_id || null);

  const { data: referrerUsers = [] } = useQuery({
    queryKey: ['users', 'company', referrerCompanyId],
    queryFn: () => base44.entities.User.filter({ company_id: referrerCompanyId }),
    enabled: !!referrerCompanyId,
  });

  const handleReferrerChange = (referrer) => {
    setReferrerCompanyId(referrer.id);
    setFormData(prev => ({
      ...prev, referrer: referrer.name, referrer_id: referrer.id, referrer_email: referrer.email || '', file_handler: ''
    }));
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const generateSteps = () => {
    const dynamicSteps = [
      { title: "Basic Info", key: "basic" },
      { title: "Referrer", key: "referrer" },
      { title: "Client & Vehicle", key: "client_vehicle" },
      { title: "Insurance", key: "insurance" },
    ];
    if (formData.has_third_party) dynamicSteps.push({ title: "Third Party", key: "third_party" });
    if (formData.requires_indemnity) dynamicSteps.push({ title: "Indemnity", key: "indemnity" });
    dynamicSteps.push({ title: "Review", key: "review" });
    return dynamicSteps.map((step, index) => ({ ...step, number: index + 1 }));
  };

  const steps = generateSteps();
  const getStepNumber = (key) => steps.find(s => s.key === key)?.number;

  // Choice screen for new claims
  if (choiceStep) {
    const appOrigin = window.location.hostname.includes('base44.app')
      ? `https://${window.location.hostname.replace(/^preview-sandbox--/, '')}`
      : window.location.origin;
    const formUrl = `${appOrigin}/client-claim-form`;

    return (
      <div className="h-full flex flex-col gap-4 md:gap-6">
        <div className="neomorph p-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={onCancel} className="neomorph-flat p-3 transition-all active:neomorph-pressed">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-700">New Claim</h1>
              <p className="text-sm text-gray-500 mt-1">How would you like to create this claim?</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-4 p-1">
          {/* Option 1: Send to client */}
          <div className="flex-1 neomorph-flat p-8 flex flex-col items-center text-center gap-4 cursor-pointer border-2 border-transparent hover:border-blue-300 transition-all rounded-2xl"
            onClick={() => {/* just show the link below */}}>
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
              <Send className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Send to Client</h3>
              <p className="text-sm text-gray-500">Share a link with your client so they fill in their own details and sign a Statement of Truth. The claim is created automatically when they submit.</p>
            </div>
            <div className="w-full mt-2 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={formUrl}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 truncate"
                />
                <CopyLinkButton url={formUrl} />
              </div>
              <p className="text-xs text-blue-600 font-medium">Once sent, you can close this — no need to fill anything in.</p>
            </div>
          </div>

          <div className="flex items-center justify-center text-gray-400 font-bold text-sm">OR</div>

          {/* Option 2: Fill in manually */}
          <div
            className="flex-1 neomorph-flat p-8 flex flex-col items-center text-center gap-4 cursor-pointer border-2 border-transparent hover:border-green-300 transition-all rounded-2xl"
            onClick={() => setChoiceStep(false)}
          >
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Fill In Manually</h3>
              <p className="text-sm text-gray-500">You have all the information and want to create the claim yourself using the step-by-step wizard.</p>
            </div>
            <Button
              type="button"
              onClick={() => setChoiceStep(false)}
              className="mt-2 neomorph-flat px-6 py-3 font-medium text-green-600 border border-green-300 hover:bg-green-50"
            >
              Start Wizard →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode — use extracted component
  if (isEditing) {
    return (
      <ClaimEditForm
        formData={formData}
        handleChange={handleChange}
        handleCheckboxChange={handleCheckboxChange}
        handleSubmit={handleSubmit}
        onCancel={onCancel}
        handleVehicleLookup={handleVehicleLookup}
        isLookingUpVehicle={isLookingUpVehicle}
        vehicleLookupError={vehicleLookupError}
        handleTPVehicleLookup={handleTPVehicleLookup}
        isLookingUpTPVehicle={isLookingUpTPVehicle}
        tpVehicleLookupError={tpVehicleLookupError}
        setTpVehicleLookupError={setTpVehicleLookupError}
        handleClientChange={handleClientChange}
        handleReferrerChange={handleReferrerChange}
        handleBodyshopChange={handleBodyshopChange}
        handleIncidentLocationChange={handleIncidentLocationChange}
        handleVehicleLocationChange={handleVehicleLocationChange}
        handleTPChange={handleTPChange}
        isInternalUser={isInternalUser}
        setShowClientModal={setShowClientModal}
        aiExtractDialog={aiExtractDialog}
        setAiExtractDialog={setAiExtractDialog}
        handleAIExtractConfirm={handleAIExtractConfirm}
        handleAIExtract={handleAIExtract}
      />
    );
  }

  // Wizard mode for new claims
  return (
    <div className="h-full flex flex-col gap-4 md:gap-6">
      <AIExtractConfirmDialog
        isOpen={aiExtractDialog.isOpen}
        onClose={() => setAiExtractDialog({ isOpen: false, data: null })}
        onConfirm={handleAIExtractConfirm}
        extractedData={aiExtractDialog.data}
        existingData={formData}
        title="AI Data Extraction"
      />
        {!isLoadingUser && isInternalUser && (
          <>
            <AddClientModal isOpen={showClientModal} onClose={() => setShowClientModal(false)} onSuccess={handleClientModalSuccess} />
            <AddClientModal isOpen={showTPModal} onClose={() => setShowTPModal(false)} onSuccess={handleTPModalSuccess} />
          </>
        )}

        {/* Header & Progress */}
        <div className="neomorph p-6 flex-shrink-0">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={onCancel} className="neomorph-flat p-3 transition-all active:neomorph-pressed">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-700">New Claim</h1>
              <p className="text-sm text-gray-500 mt-1">Step {currentStep} of {steps.length}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className={`flex flex-col items-center ${currentStep === step.number ? 'scale-105' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep > step.number ? 'bg-green-600 text-white' : currentStep === step.number ? 'bg-gold text-black' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <span className="text-xs text-gray-500 mt-2 hidden md:block">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 transition-all ${currentStep > step.number ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4">
          <form id="claim-wizard-form" onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {currentStep === getStepNumber("basic") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Let's start with the basics</h3>

                {/* Send to client */}
                <ClientFormLink />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-3 bg-background text-gray-500">Or fill in manually / use AI</span></div>
                </div>

                {/* AI Upload */}
                <div className="neomorph-flat p-5 bg-purple-50/50 dark:bg-purple-900/10 border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Quick Start with AI</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Upload your instruction document and let AI automatically extract claim details.</p>
                    </div>
                  </div>
                  <FileUpload value={Array.isArray(formData.file_urls) ? formData.file_urls : []} onChange={(urls) => handleChange('file_urls', urls)} enableAI={true} analysisType="claim" onAIExtract={handleAIExtract} />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-3 bg-background text-gray-500">Or enter details manually</span></div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Vehicle Registration *</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input value={formData.reg} onChange={(e) => { handleChange('reg', e.target.value); setVehicleLookupError(null); }} className="neomorph-inset px-4 py-3 text-gray-700 border-0 text-lg" placeholder="e.g. AB12 CDE" required autoFocus />
                      <Button type="button" onClick={handleVehicleLookup} disabled={isLookingUpVehicle || !formData.reg || formData.reg.length < 3} className="neomorph-flat px-4 py-3 whitespace-nowrap">
                        {isLookingUpVehicle ? <><Loader className="w-4 h-4 animate-spin mr-2" /><span className="hidden sm:inline">Looking up...</span></> : <><Search className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Lookup</span></>}
                      </Button>
                    </div>
                    {vehicleLookupError && <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"><AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-orange-800">{vehicleLookupError}</p></div>}
                    {formData.make_model && !vehicleLookupError && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-700">✓ <span className="font-bold">Vehicle found:</span><br /><span className="font-bold text-base">{formData.make_model}</span>{formData.vehicle_colour && ` • ${formData.vehicle_colour}`}{formData.vehicle_year_of_manufacture && ` • ${formData.vehicle_year_of_manufacture}`}</p></div>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Claim Type *</label>
                  <select value={formData.claim_type} onChange={(e) => handleChange('claim_type', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl" required>
                    <option>Credit Repair</option><option>Fault Claim</option><option>Non-Fault Claim</option><option>Total Loss</option><option>Glass Claim</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-600 mb-2">Date of Loss</label><Input type="date" value={formData.loss_date} onChange={(e) => handleChange('loss_date', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Time of Loss</label><Input type="time" value={formData.loss_time} onChange={(e) => handleChange('loss_time', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                </div>

                <div><label className="block text-sm text-gray-600 mb-2">Incident Location</label><AddressLookupInput value={formData.incident_location} onChange={handleIncidentLocationChange} placeholder="Start typing address or postcode..." className="neomorph-inset" /></div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Use of Vehicle</label>
                  <select value={formData.vehicle_use} onChange={(e) => handleChange('vehicle_use', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl">
                    <option value="">Select...</option><option>Business</option><option>Social</option><option>Commuting</option>
                  </select>
                </div>

                <div><label className="block text-sm text-gray-600 mb-2">What happened?</label><Textarea value={formData.circumstances} onChange={(e) => handleChange('circumstances', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-32" placeholder="Brief description of the incident..." /></div>

                <div className="flex flex-col gap-3">
                  {[['courtesy_car','courtesy_car_required','Customer needs a courtesy car'],['has_third_party','has_third_party','Third party involved'],['requires_indemnity','requires_indemnity','Indemnity details required']].map(([id, key, label]) => (
                    <div key={id} className="flex items-center gap-3">
                      <input type="checkbox" id={id} checked={formData[key]} onChange={(e) => handleCheckboxChange(key, e.target.checked)} className="neomorph-inset" />
                      <label htmlFor={id} className="text-sm text-gray-600">{label}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Referrer */}
            {currentStep === getStepNumber("referrer") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Referrer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-600 mb-2">Referrer</label><ReferrerCombobox value={formData.referrer} onChange={handleReferrerChange} /></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Referrer Email</label><Input type="email" value={formData.referrer_email} onChange={(e) => handleChange('referrer_email', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Referrer Reference</label><Input value={formData.referrer_ref} onChange={(e) => handleChange('referrer_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">File Handler</label>
                    {referrerUsers.length > 0 ? (
                      <select
                        value={formData.file_handler}
                        onChange={(e) => handleChange('file_handler', e.target.value)}
                        className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                      >
                        <option value="">Select a file handler...</option>
                        {referrerUsers.map(u => (
                          <option key={u.id} value={u.full_name}>{u.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input value={formData.file_handler} onChange={(e) => handleChange('file_handler', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" placeholder="Enter file handler name" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Client & Vehicle */}
            {currentStep === getStepNumber("client_vehicle") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Client & Vehicle Details</h3>
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Client Information</h4>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Client Name *</label>
                    <ClientCombobox value={formData.client_name} onChange={handleClientChange} />
                    <p className="text-xs text-gray-500 mt-1">Search for existing client or enter a new name below</p>
                  </div>
                  <div className="neomorph-inset p-4 space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">Client Details</p>
                      {isInternalUser && formData.client_name && !formData.client_id && (
                        <Button type="button" onClick={handleSaveClientToDatabase} className="neomorph-flat px-4 py-2 text-sm flex items-center gap-2 bg-green-50 hover:bg-green-100">
                          <Plus className="w-4 h-4 text-green-600" /><span className="text-green-600 font-medium">Save Client to Database</span>
                        </Button>
                      )}
                      {formData.client_id && <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">✓ Linked to Database</span>}
                    </div>
                    <div><label className="block text-xs text-gray-500 mb-1">Name *</label><Input value={formData.client_name} onChange={(e) => handleChange('client_name', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" placeholder="Enter client name" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs text-gray-500 mb-1">Phone</label><Input value={formData.client_phone} onChange={(e) => handleChange('client_phone', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Email</label><Input type="email" value={formData.client_email} onChange={(e) => handleChange('client_email', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" /></div>
                    </div>
                    <div><label className="block text-xs text-gray-500 mb-1">Address Line 1</label><Input value={formData.client_address_line_1} onChange={(e) => handleChange('client_address_line_1', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Address Line 2</label><Input value={formData.client_address_line_2} onChange={(e) => handleChange('client_address_line_2', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" /></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className="block text-xs text-gray-500 mb-1">Town</label><Input value={formData.client_town} onChange={(e) => handleChange('client_town', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">County</label><Input value={formData.client_county} onChange={(e) => handleChange('client_county', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Postcode</label><Input value={formData.client_postcode} onChange={(e) => handleChange('client_postcode', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0" /></div>
                    </div>
                    <div><label className="block text-xs text-gray-500 mb-1">VAT Status</label><select value={formData.client_vat_status} onChange={(e) => handleChange('client_vat_status', e.target.value)} className="neomorph-inset w-full px-3 py-2 text-sm text-gray-700 border-0 rounded-xl"><option>VAT Registered</option><option>Non-VAT</option><option>Unknown</option></select></div>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-2">Driver/Contact Name</label><Input value={formData.driver_contact_name} onChange={(e) => handleChange('driver_contact_name', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" placeholder="If different from client" /></div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Vehicle Information</h4>
                  {formData.make_model ? (
                    <div className="neomorph-inset p-4">
                      <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><p className="text-xs text-green-600 font-medium">Vehicle details from DVLA</p></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div><p className="text-xs text-gray-500 mb-1">Make & Model</p><p className="font-medium text-gray-700">{formData.make_model}</p></div>
                        {formData.vehicle_colour && <div><p className="text-xs text-gray-500 mb-1">Colour</p><p className="font-medium text-gray-700">{formData.vehicle_colour}</p></div>}
                        {formData.vehicle_year_of_manufacture && <div><p className="text-xs text-gray-500 mb-1">Year</p><p className="font-medium text-gray-700">{formData.vehicle_year_of_manufacture}</p></div>}
                      </div>
                    </div>
                  ) : (
                    <div className="neomorph-inset p-4 text-center text-sm text-gray-500">No vehicle details captured yet. Use the DVLA lookup in Step 1.</div>
                  )}
                  <div><label className="block text-sm text-gray-600 mb-2">Vehicle Type</label><select value={formData.vehicle_type} onChange={(e) => handleChange('vehicle_type', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"><option>Car</option><option>Van</option><option>Motorcycle</option><option>HGV</option><option>Other</option></select></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Vehicle Location</label><AddressLookupInput value={formData.vehicle_location} onChange={handleVehicleLocationChange} placeholder="Where is the vehicle now..." className="neomorph-inset" /></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Damage Description</label><Textarea value={formData.vehicle_damage} onChange={(e) => handleChange('vehicle_damage', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Describe the damage..." /></div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="unroadworthy" checked={formData.unroadworthy} onChange={(e) => handleCheckboxChange('unroadworthy', e.target.checked)} className="w-5 h-5" /><span className="text-sm text-gray-600">Vehicle is unroadworthy</span></label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="recovery" checked={formData.recovery_required} onChange={(e) => handleCheckboxChange('recovery_required', e.target.checked)} className="w-5 h-5" /><span className="text-sm text-gray-600">Recovery required</span></label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Insurance */}
            {currentStep === getStepNumber("insurance") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Insurance Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-600 mb-2">Insurer</label><InsurerCombobox value={formData.insurer} onChange={(v) => handleChange('insurer', v)} /></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Claim Reference</label><Input value={formData.claim_ref} onChange={(e) => handleChange('claim_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Policy Number</label><Input value={formData.policy_number} onChange={(e) => handleChange('policy_number', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  <div><label className="block text-sm text-gray-600 mb-2">Policy Excess (£)</label><Input type="text" inputMode="decimal" value={formData.policy_excess || ''} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleChange('policy_excess', v === '' ? 0 : parseFloat(v) || 0); }} className="neomorph-inset px-4 py-3 text-gray-700 border-0" placeholder="0.00" /></div>
                </div>
              </div>
            )}

            {/* Step: Third Party */}
            {formData.has_third_party && currentStep === getStepNumber("third_party") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Third Party Details</h3>
                <div className="neomorph-inset p-4 space-y-4">
                  <h4 className="font-semibold text-gray-700">Contact Details</h4>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Third Party Name</label>
                    {isInternalUser ? (
                      <div className="flex gap-2"><div className="flex-1"><ClientCombobox value={formData.tp_name} onChange={handleTPChange} /></div><Button type="button" onClick={() => setShowTPModal(true)} className="neomorph-flat p-3"><Plus className="w-4 h-4" /></Button></div>
                    ) : <ClientCombobox value={formData.tp_name} onChange={handleTPChange} />}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm text-gray-600 mb-2">Phone</label><Input value={formData.tp_phone} onChange={(e) => handleChange('tp_phone', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                    <div><label className="block text-sm text-gray-600 mb-2">Email</label><Input type="email" value={formData.tp_email} onChange={(e) => handleChange('tp_email', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-sm text-gray-600 mb-2">Town</label><Input value={formData.tp_town} onChange={(e) => handleChange('tp_town', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                    <div><label className="block text-sm text-gray-600 mb-2">County</label><Input value={formData.tp_county} onChange={(e) => handleChange('tp_county', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                    <div><label className="block text-sm text-gray-600 mb-2">Postcode</label><Input value={formData.tp_postcode} onChange={(e) => handleChange('tp_postcode', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  </div>
                </div>
                <div className="neomorph-inset p-4 space-y-4">
                  <h4 className="font-semibold text-gray-700">Vehicle Details</h4>
                  <div className="flex gap-2">
                    <Input value={formData.tp_reg} onChange={(e) => { handleChange('tp_reg', e.target.value.toUpperCase()); setTpVehicleLookupError(null); }} className="neomorph-inset px-4 py-3 text-gray-700 border-0 flex-1" placeholder="e.g. AB12 CDE" />
                    <Button type="button" onClick={handleTPVehicleLookup} disabled={isLookingUpTPVehicle || !formData.tp_reg || formData.tp_reg.length < 3} className="neomorph-flat px-4 py-3">
                      {isLookingUpTPVehicle ? <><Loader className="w-4 h-4 animate-spin mr-2" /><span className="hidden sm:inline">Looking up...</span></> : <><Search className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Lookup</span></>}
                    </Button>
                  </div>
                  {tpVehicleLookupError && <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"><AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-orange-800">{tpVehicleLookupError}</p></div>}
                  {formData.tp_make_model && !tpVehicleLookupError && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-700">✓ <span className="font-bold">{formData.tp_make_model}</span>{formData.tp_vehicle_colour && ` • ${formData.tp_vehicle_colour}`}</p></div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm text-gray-600 mb-2">Make/Model</label><Input value={formData.tp_make_model} onChange={(e) => handleChange('tp_make_model', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                    <div><label className="block text-sm text-gray-600 mb-2">Their Insurer</label><InsurerCombobox value={formData.tp_insurer} onChange={(v) => handleChange('tp_insurer', v)} /></div>
                    <div><label className="block text-sm text-gray-600 mb-2">Their Claim Ref</label><Input value={formData.tp_claim_ref} onChange={(e) => handleChange('tp_claim_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                    <div><label className="block text-sm text-gray-600 mb-2">Their Policy No.</label><Input value={formData.tp_policy_number} onChange={(e) => handleChange('tp_policy_number', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-2">Third Party Damage</label><Textarea value={formData.tp_vehicle_damage} onChange={(e) => handleChange('tp_vehicle_damage', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-20" /></div>
                </div>
              </div>
            )}

            {/* Step: Indemnity */}
            {formData.requires_indemnity && currentStep === getStepNumber("indemnity") && (
              <ClaimIndemnityFields formData={formData} handleChange={handleChange} />
            )}

            {/* Final Step: Review */}
            {currentStep === steps.length && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Review & Create</h3>
                <p className="text-sm text-gray-500 mb-6">Check the details below. You can add bodyshop and other details after creating the claim.</p>
                <div className="space-y-4">
                  {[['Vehicle Registration', formData.reg, true],['Claim Type', formData.claim_type],['Client', formData.client_name || 'Not specified'],['Vehicle', formData.make_model || 'Not specified']].map(([label, value, isGold]) => (
                    <div key={label} className="neomorph-inset p-4">
                      <p className="text-sm text-gray-500 mb-2">{label}</p>
                      <p className={`font-medium ${isGold ? 'font-bold text-lg text-gold' : 'text-gray-700'}`}>{value}</p>
                    </div>
                  ))}
                  {formData.insurer && <div className="neomorph-inset p-4"><p className="text-sm text-gray-500 mb-2">Insurer</p><p className="font-medium text-gray-700">{formData.insurer}</p></div>}
                  {formData.referrer && <div className="neomorph-inset p-4"><p className="text-sm text-gray-500 mb-2">Referrer</p><p className="font-medium text-gray-700">{formData.referrer}</p></div>}
                  {formData.has_third_party && formData.tp_name && <div className="neomorph-inset p-4"><p className="text-sm text-gray-500 mb-2">Third Party</p><p className="font-medium text-gray-700">{formData.tp_name}</p></div>}
                </div>
                <div className="neomorph-flat p-6">
                  <h4 className="font-semibold text-gray-700 mb-4">Upload Files (Optional)</h4>
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-800"><strong>AI Document Analysis:</strong> Upload documents and click the sparkle icon to auto-extract claim details.</p>
                  </div>
                  <FileUpload value={Array.isArray(formData.file_urls) ? formData.file_urls : []} onChange={(urls) => handleChange('file_urls', urls)} enableAI={true} analysisType="claim" onAIExtract={handleAIExtract} />
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Navigation — outside scroll area so always visible */}
        <div className="flex justify-between pt-3 pb-2 flex-shrink-0">
          {currentStep > 1 && (
            <Button type="button" onClick={prevStep} className="neomorph-flat px-6 py-3 font-medium text-gray-700 transition-all active:neomorph-pressed flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>
          )}
          <div className="flex-1" />
          {currentStep < steps.length && (
            <Button type="button" onClick={nextStep} className="neomorph-flat px-6 py-3 font-medium text-blue-600 transition-all active:neomorph-pressed flex items-center gap-2" disabled={currentStep === getStepNumber("basic") && !formData.reg}>
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          {currentStep === steps.length && (
            <Button type="button" onClick={handleSubmit} className="neomorph-flat px-8 py-3 font-medium text-gold transition-all active:neomorph-pressed flex items-center gap-2">
              <Check className="w-5 h-5" /> Create Claim
            </Button>
          )}
        </div>
    </div>
  );
}