import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useLinkedClientSync from '@/hooks/useLinkedClientSync';
import { ArrowLeft, ArrowRight, Check, Plus, Search, Loader, AlertCircle, Sparkles, Send, Copy, Users, Phone, Mail, Star } from "lucide-react";
import ClientFormLink from './ClientFormLink';
import ClaimEditForm from './ClaimEditForm';
import InsurerCombobox from "../shared/InsurerCombobox";
import FileUpload from '../shared/FileUpload';
import ClientCombobox from '../shared/ClientCombobox';
import ReferrerCombobox from '../shared/ReferrerCombobox';
import AddClientModal from '../shared/AddClientModal';
import AddInsurerModal from '../shared/AddInsurerModal';
import StatusMultiSelect from '../shared/StatusMultiSelect';
import ClaimIndemnityFields from './ClaimIndemnityFields';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AddressLookupInput from '../shared/AddressLookupInput';
import AIExtractConfirmDialog from '../shared/AIExtractConfirmDialog';
import AIEntityLinker from '../shared/AIEntityLinker';
import { COURTESY_CAR_OPTIONS, normalizeCourtesyCar } from '../shared/courtesyCarOptions';

// ── Helpers ──

function CopyLinkButton({ url }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button type="button"
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 whitespace-nowrap transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}

const BoolToggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex gap-0.5">
      <button type="button" onClick={() => onChange(true)}
        className={`px-3 py-1.5 rounded-l-lg text-xs font-medium transition-colors ${
          value === true ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Yes</button>
      <button type="button" onClick={() => onChange(false)}
        className={`px-3 py-1.5 rounded-r-lg text-xs font-medium transition-colors ${
          value === false ? 'bg-muted-foreground/20 text-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>No</button>
    </div>
  </div>
);

const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center gap-1 overflow-x-auto pb-1">
    {steps.map((s, i) => {
      const isActive = s.number === currentStep;
      const isDone = s.number < currentStep;
      return (
        <React.Fragment key={s.key}>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all flex-shrink-0 ${
            isActive ? 'bg-accent text-accent-foreground shadow-sm' :
            isDone ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground opacity-60'}`}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
              ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-accent-foreground/20' : 'bg-muted-foreground/20'}">
              {isDone ? <Check className="w-2.5 h-2.5" /> : s.number}
            </span>
            <span className="hidden sm:inline font-medium">{s.title}</span>
          </div>
          {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
        </React.Fragment>
      );
    })}
  </div>
);

const ReviewRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm ${value ? 'font-medium' : 'text-amber-600 italic'}`}>{value || '—'}</p>
  </div>
);

const geocodeAddress = async (address) => {
  if (!address || address.trim() === '') return null;
  await new Promise(r => setTimeout(r, 300));
  const l = address.toLowerCase();
  if (l.includes("london")) return { lat: 51.5074, lng: 0.1278 };
  return null;
};

const TRACKED_FIELDS = [
  'reg', 'claim_type', 'loss_date', 'client_name', 'client_email', 'client_phone',
  'client_address_line_1', 'client_town', 'client_postcode',
  'insurer', 'claim_ref', 'policy_number', 'referrer',
  'vehicle_location', 'vehicle_damage', 'vehicle_type',
];

// ── Component ──

export default function ClaimForm({ claim, onSubmit, onCancel, isSubmitting, defaultClaimType }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showInsurerModal, setShowInsurerModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLookingUpVehicle, setIsLookingUpVehicle] = useState(false);
  const [vehicleLookupError, setVehicleLookupError] = useState(null);
  const [isLookingUpTPVehicle, setIsLookingUpTPVehicle] = useState(false);
  const [tpVehicleLookupError, setTpVehicleLookupError] = useState(null);
  const [aiExtractDialog, setAiExtractDialog] = useState({ isOpen: false, data: null, linkedEntityTypes: [] });
  const [aiEntityLinker, setAiEntityLinker] = useState({ isOpen: false, data: null });
  const [linkedContacts, setLinkedContacts] = useState([]);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const isInternalUser = currentUser?.user_type === 'internal' ||
    ['admin', 'super_admin', 'company_admin'].includes(currentUser?.role);

  const [formData, setFormData] = useState(claim || {
    job_number: '', reg: '', job_statuses: ['New'], secondary_status: 'New', claim_type: defaultClaimType || '',
    circumstances: '', loss_date: '', loss_time: '', incident_location: '',
    vehicle_use: '', courtesy_car_required: 'No', has_third_party: false,
    requires_indemnity: false, file_urls: [], insurer: '', claim_ref: '',
    policy_number: '', policy_excess: 0, referrer: '', referrer_id: null,
    referrer_ref: '', file_handler: '', referrer_email: '', percent_to_referrer: 0,
    client_name: '', client_id: null, client_phone: '', driver_contact_name: '',
    driver_contact_phone: '', driver_contact_email: '', driver_contact_address_line_1: '',
    driver_contact_address_line_2: '', driver_contact_town: '', driver_contact_county: '',
    driver_contact_postcode: '',
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
    est_fee: 0, referral_fee_repairer: 20, percent_bld_instruction: 0,
    date_received: new Date().toISOString().split('T')[0],
    estimate_completed: '', authority_received: '', bs_instructed: '',
    booking_in_date: '', on_site_date: '', all_parts_on_site: '', ecd: '',
    completion_date: '', invoice_received_repairer: '', invoice_sent_referrer: '',
    estimate_cost_net: 0, authority_cost_net: 0, estimate_cost_gross: 0,
    authority_cost_gross: 0, final_repair_cost: 0, total_invoice_repairer: 0,
    indemnity_driver_dob: '', indemnity_registered_owner: '',
    indemnity_pending_prosecutions: '', indemnity_dvla_medical_restrictions: '',
    indemnity_full_license_12_months: '', indemnity_convictions_last_5_years: '',
    indemnity_vehicle_use_at_incident: '', indemnity_vehicle_modifications: ''
  });

  useLinkedClientSync(formData.client_id, setFormData, setLinkedContacts);

  const isEditing = !!claim;
  const [choiceStep, setChoiceStep] = useState(!isEditing);
  const [entryMode, setEntryMode] = useState(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [referrerCompanyId, setReferrerCompanyId] = useState(claim?.referrer_id || null);

  const { data: referrerUsers = [] } = useQuery({
    queryKey: ['users', 'company', referrerCompanyId],
    queryFn: () => base44.entities.User.filter({ company_id: referrerCompanyId }),
    enabled: !!referrerCompanyId
  });

  const filledCount = TRACKED_FIELDS.filter(k => {
    const v = formData[k];
    return v !== null && v !== undefined && v !== '' && v !== 0;
  }).length;

  // ── Handlers (unchanged logic) ──

  const handleAIExtract = async (extractedData) => {
    const hasLinkable = extractedData?.client_name || extractedData?.referrer || extractedData?.bodyshop;
    if (hasLinkable) setAiEntityLinker({ isOpen: true, data: extractedData });
    else setAiExtractDialog({ isOpen: true, data: extractedData, linkedEntityTypes: [] });
  };

  const handleEntityLinkerConfirm = (enrichedData, linkedTypes) => {
    setAiEntityLinker({ isOpen: false, data: null });
    setAiExtractDialog({ isOpen: true, data: enrichedData, linkedEntityTypes: linkedTypes || [] });
  };

  const handleAIExtractConfirm = (selectedData) => {
    if (selectedData) setFormData(prev => ({ ...prev, ...selectedData }));
    setAiExtractDialog({ isOpen: false, data: null });
  };

  const handleVehicleLookup = async () => {
    if (!formData.reg || formData.reg.trim().length < 3) {
      setVehicleLookupError('Please enter a valid registration number'); return;
    }
    setIsLookingUpVehicle(true); setVehicleLookupError(null);
    try {
      const response = await base44.functions.invoke('lookupVehicleData', { registrationNumber: formData.reg });
      const result = response.data;
      if (result.success) {
        setFormData(prev => ({
          ...prev, make_model: result.make_model || '', vehicle_make: result.make || '',
          vehicle_model: result.model || '', vehicle_colour: result.colour || '',
          vehicle_fuel_type: result.fuel_type || '', vehicle_year_of_manufacture: result.year_of_manufacture || null,
          vehicle_engine_capacity: result.engine_capacity || null, vehicle_co2_emissions: result.co2_emissions || null,
          vehicle_euro_status: result.euro_status || '', vehicle_mot_status: result.mot_status || '',
          vehicle_mot_expiry_date: result.mot_expiry_date || '', vehicle_tax_status: result.tax_status || '',
          vehicle_tax_due_date: result.tax_due_date || '', vehicle_date_of_last_v5c_issued: result.date_of_last_v5c_issued || '',
          vehicle_wheelplan: result.wheelplan || '', vehicle_revenue_weight: result.revenue_weight || null
        }));
      } else setVehicleLookupError(result.message || 'Vehicle not found');
    } catch (error) {
      setVehicleLookupError(error.response?.data?.message || error.message || 'Unable to lookup vehicle.');
    } finally { setIsLookingUpVehicle(false); }
  };

  const handleTPVehicleLookup = async () => {
    if (!formData.tp_reg || formData.tp_reg.trim().length < 3) {
      setTpVehicleLookupError('Please enter a valid registration number'); return;
    }
    setIsLookingUpTPVehicle(true); setTpVehicleLookupError(null);
    try {
      const response = await base44.functions.invoke('lookupVehicleData', { registrationNumber: formData.tp_reg });
      const result = response.data;
      if (result.success) {
        setFormData(prev => ({
          ...prev, tp_make_model: result.make_model || '', tp_vehicle_colour: result.colour || '',
          tp_vehicle_fuel_type: result.fuel_type || '', tp_vehicle_year_of_manufacture: result.year_of_manufacture || null
        }));
      } else setTpVehicleLookupError(result.message || 'Vehicle not found');
    } catch (error) {
      setTpVehicleLookupError(error.response?.data?.message || error.message || 'Unable to lookup vehicle.');
    } finally { setIsLookingUpTPVehicle(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (isCreating) return;
    setIsCreating(true);
    const { id: _id, created_date: _cd, updated_date: _ud, created_by: _cb, ...submitData } = formData;
    submitData.courtesy_car_required = normalizeCourtesyCar(submitData.courtesy_car_required);
    if (!claim) {
      try {
        const response = await base44.functions.invoke('generateJobNumber', { entityType: 'Claim' });
        if (response.data.success) submitData.job_number = response.data.job_number;
        else { alert(`Failed to generate job number: ${response.data.error || 'Unknown error'}`); return; }
      } catch (error) {
        alert(`Failed to generate job number: ${error.response?.data?.error || error.message}. Please try again.`);
        setIsCreating(false); return;
      }
      if (submitData.claim_type === 'Fault Claim') submitData.third_party_pursuit_status = 'Awaiting Details';
    }
    onSubmit(submitData);
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      if (!formData.reg) { alert('Please enter at least the vehicle registration to save as draft.'); setIsSavingDraft(false); return; }
      const { id: _id, created_date: _cd, updated_date: _ud, created_by: _cb, ...submitData } = formData;
      submitData.courtesy_car_required = normalizeCourtesyCar(submitData.courtesy_car_required);
      let draftData = submitData;
      if (!claim) {
        try {
          const response = await base44.functions.invoke('generateJobNumber', { entityType: 'Claim' });
          if (response.data.success) draftData = { ...submitData, job_number: response.data.job_number };
        } catch (e) { console.error('Job number gen failed:', e); }
      }
      if (claim) await base44.entities.Claim.update(claim.id, draftData);
      else await base44.entities.Claim.create(draftData);
      alert('Claim saved as draft.');
      onCancel();
    } catch (error) { console.error('Draft save failed:', error); alert('Failed to save draft.'); }
    finally { setIsSavingDraft(false); }
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleCheckboxChange = (field, checked) => setFormData(prev => ({ ...prev, [field]: checked }));

  const handleDriverSameToggle = (v) => {
    setFormData(prev => ({
      ...prev,
      driver_same_as_client: v,
      ...(v && {
        driver_contact_name: '', driver_contact_phone: '', driver_contact_email: '',
        driver_contact_address_line_1: '', driver_contact_address_line_2: '',
        driver_contact_town: '', driver_contact_county: '', driver_contact_postcode: ''
      })
    }));
  };

  const handleIncidentLocationChange = (addr) => handleChange('incident_location', addr.display_name || addr.address || '');
  const handleVehicleLocationChange = (addr) => handleChange('vehicle_location', addr.display_name || addr.address || '');

  const handleBodyshopChange = (b) => setFormData(prev => ({ ...prev, bodyshop: b.name, bodyshop_id: b.id, bodyshop_email: b.email || '' }));

  const handleClientChange = async (client) => {
    // Fetch the freshest client record by ID so VAT status and contacts are current
    // (the combobox list can be stale if the directory was edited elsewhere).
    let fresh = client;
    if (client?.id) {
      try { fresh = await base44.entities.Client.get(client.id) || client; } catch {}
    }
    const fullAddress = [fresh.address_line_1, fresh.address_line_2, fresh.town, fresh.county, fresh.postcode].filter(Boolean).join(', ');
    let geocodedLat = null, geocodedLng = null;
    if (fullAddress) {
      try { const c = await geocodeAddress(fullAddress); if (c) { geocodedLat = c.lat; geocodedLng = c.lng; } } catch {}
    }
    const contacts = fresh.contacts || [];
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0] || null;
    setLinkedContacts(contacts);
    setFormData(prev => ({
      ...prev, client_name: fresh.name, client_id: fresh.id,
      client_phone: fresh.phone || primaryContact?.phone || fresh.company_contact_phone || '',
      client_email: fresh.email || primaryContact?.email || fresh.company_contact_email || '',
      client_address_line_1: fresh.address_line_1 || '',
      client_address_line_2: fresh.address_line_2 || '', client_town: fresh.town || '',
      client_county: fresh.county || '', client_postcode: fresh.postcode || '',
      client_vat_status: fresh.vat_status || 'Unknown', business_division: '', client_lat: geocodedLat, client_lng: geocodedLng,
      driver_same_as_client: true, driver_contact_name: '', driver_contact_phone: '',
      driver_contact_email: '', driver_contact_address_line_1: '', driver_contact_address_line_2: '',
      driver_contact_town: '', driver_contact_county: '', driver_contact_postcode: ''
    }));
  };

  const handleReferrerChange = (referrer) => {
    setReferrerCompanyId(referrer.id);
    if (!referrer) {
      setFormData(prev => ({ ...prev, referrer: '', referrer_id: null, referrer_email: '', file_handler: '', percent_to_referrer: 0, referral_fee_repairer: 20 }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      referrer: referrer.name,
      referrer_id: referrer.id,
      referrer_email: referrer.email || '',
      file_handler: '',
      ...(referrer.default_percent_to_referrer != null && { percent_to_referrer: referrer.default_percent_to_referrer }),
      ...(referrer.default_repairer_referral_fee != null && { referral_fee_repairer: referrer.default_repairer_referral_fee }),
    }));
  };

  const handleTPChange = async (client) => {
    setFormData(prev => ({
      ...prev, tp_name: client.name, tp_phone: client.phone || '', tp_email: client.email || '',
      tp_address_line_1: client.address_line_1 || '', tp_address_line_2: client.address_line_2 || '',
      tp_town: client.town || '', tp_county: client.county || '', tp_postcode: client.postcode || ''
    }));
  };

  const handleInsurerModalSuccess = (newInsurer) => {
    queryClient.invalidateQueries({ queryKey: ['insurers'] });
    handleChange('insurer', newInsurer.name);
    setShowInsurerModal(false);
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const generateSteps = () => {
    const steps = [
      { title: 'Vehicle & Incident', key: 'incident' },
      { title: 'Client', key: 'client' },
      { title: 'Insurance', key: 'insurance' },
      { title: 'Referrer', key: 'referrer' },
      { title: 'Vehicle Condition', key: 'condition' },
    ];
    if (formData.has_third_party) steps.push({ title: 'Third Party', key: 'third_party' });
    if (formData.requires_indemnity) steps.push({ title: 'Indemnity', key: 'indemnity' });
    steps.push({ title: 'Review', key: 'review' });
    return steps.map((s, i) => ({ ...s, number: i + 1 }));
  };

  const steps = generateSteps();
  const getStepNumber = (key) => steps.find(s => s.key === key)?.number || 0;

  // ── Choice Screen ──
  if (choiceStep) {
    const appOrigin = window.location.hostname.includes('base44.app')
      ? `https://${window.location.hostname.replace(/^preview-sandbox--/, '')}` : window.location.origin;
    const formUrl = `${appOrigin}/client-claim-form`;

    return (
      <div className="h-full flex flex-col gap-4 md:gap-6">
        <div className="neomorph p-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={onCancel} className="neomorph-flat p-3"><ArrowLeft className="w-4 h-4 text-gray-600" /></Button>
            <div><h1 className="text-2xl font-bold text-gray-700">New Claim</h1><p className="text-sm text-gray-500 mt-1">How would you like to create this claim?</p></div>
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-1">
          <div className="flex-1 neomorph-flat p-6 flex flex-col items-center text-center gap-4 border-2 border-transparent hover:border-blue-300 transition-all rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><Send className="w-8 h-8 text-white" /></div>
            <div><h3 className="text-lg font-bold text-gray-700 mb-2">Send to Client</h3><p className="text-sm text-gray-500">Share a link so your client fills in their details and signs a Statement of Truth.</p></div>
            <div className="w-full mt-auto space-y-3">
              <div className="flex gap-2"><input readOnly value={formUrl} className="flex-1 text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 truncate" /><CopyLinkButton url={formUrl} /></div>
              <p className="text-xs text-blue-600 font-medium">Close this once sent — nothing else to fill in.</p>
            </div>
          </div>
          <div className="flex items-center justify-center text-gray-400 font-bold text-sm">OR</div>
          <div className="flex-1 neomorph-flat p-6 flex flex-col items-center text-center gap-4 border-2 border-transparent hover:border-purple-300 transition-all rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><Sparkles className="w-8 h-8 text-white" /></div>
            <div><h3 className="text-lg font-bold text-gray-700 mb-2">Upload & Use AI</h3><p className="text-sm text-gray-500">Upload your instruction document and let AI extract all claim details automatically.</p></div>
            <div className="w-full mt-auto">
              <FileUpload value={Array.isArray(formData.file_urls) ? formData.file_urls : []} onChange={urls => handleChange('file_urls', urls)}
                enableAI={true} analysisType="claim" onAIExtract={data => { handleAIExtract(data); setEntryMode('ai'); setChoiceStep(false); }} />
              <p className="text-xs text-purple-600 font-medium mt-2">Upload a document — AI extracts details and pre-fills the form.</p>
            </div>
          </div>
          <div className="flex items-center justify-center text-gray-400 font-bold text-sm">OR</div>
          <div className="flex-1 neomorph-flat p-6 flex flex-col items-center text-center gap-4 cursor-pointer border-2 border-transparent hover:border-green-300 transition-all rounded-2xl"
            onClick={() => { setEntryMode('manual'); setChoiceStep(false); }}>
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0"><Check className="w-8 h-8 text-white" /></div>
            <div><h3 className="text-lg font-bold text-gray-700 mb-2">Fill In Manually</h3><p className="text-sm text-gray-500">You have all the information and want to create the claim yourself.</p></div>
            <Button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setEntryMode('manual'); setChoiceStep(false); }}
              className="mt-auto neomorph-flat px-6 py-3 font-medium text-green-600 border border-green-300 hover:bg-green-50">Start Wizard →</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit Mode ──
  if (isEditing) {
    return (<>
      <AIEntityLinker isOpen={aiEntityLinker.isOpen} onClose={() => setAiEntityLinker({ isOpen: false, data: null })}
        extractedData={aiEntityLinker.data} onConfirm={handleEntityLinkerConfirm} />
      <ClaimEditForm formData={formData} handleChange={handleChange} handleCheckboxChange={handleCheckboxChange}
        handleSubmit={handleSubmit} onCancel={onCancel} handleVehicleLookup={handleVehicleLookup}
        isLookingUpVehicle={isLookingUpVehicle} vehicleLookupError={vehicleLookupError}
        handleTPVehicleLookup={handleTPVehicleLookup} isLookingUpTPVehicle={isLookingUpTPVehicle}
        tpVehicleLookupError={tpVehicleLookupError} setTpVehicleLookupError={setTpVehicleLookupError}
        handleClientChange={handleClientChange} handleReferrerChange={handleReferrerChange}
        handleBodyshopChange={handleBodyshopChange} handleIncidentLocationChange={handleIncidentLocationChange}
        handleVehicleLocationChange={handleVehicleLocationChange} handleTPChange={handleTPChange}
        isInternalUser={isInternalUser} aiExtractDialog={aiExtractDialog} setAiExtractDialog={setAiExtractDialog}
        handleAIExtractConfirm={handleAIExtractConfirm} handleAIExtract={handleAIExtract} />
    </>);
  }

  // ── Wizard ──
  return (
    <div className="h-full flex flex-col gap-3 md:gap-4">
      <AIEntityLinker isOpen={aiEntityLinker.isOpen} onClose={() => setAiEntityLinker({ isOpen: false, data: null })}
        extractedData={aiEntityLinker.data} onConfirm={handleEntityLinkerConfirm} />
      <AIExtractConfirmDialog isOpen={aiExtractDialog.isOpen}
        onClose={() => setAiExtractDialog({ isOpen: false, data: null, linkedEntityTypes: [] })}
        onConfirm={handleAIExtractConfirm} extractedData={aiExtractDialog.data} existingData={formData}
        linkedEntityTypes={aiExtractDialog.linkedEntityTypes} title="AI Data Extraction" />

      {!isLoadingUser && isInternalUser && <AddInsurerModal isOpen={showInsurerModal} onClose={() => setShowInsurerModal(false)} onSuccess={handleInsurerModalSuccess} />}

      {/* Header + Step Indicator */}
      <div className="bg-card border border-border rounded-[10px] p-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4 mb-3">
          <Button onClick={onCancel} variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">New Claim</h1>
            <p className="text-xs text-muted-foreground">Step {currentStep} of {steps.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(filledCount / TRACKED_FIELDS.length) * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{filledCount}/{TRACKED_FIELDS.length}</span>
          </div>
        </div>
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Scrollable Step Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {currentStep === getStepNumber('incident') && renderIncidentStep()}
        {currentStep === getStepNumber('client') && renderClientStep()}
        {currentStep === getStepNumber('insurance') && renderInsuranceStep()}
        {currentStep === getStepNumber('referrer') && renderReferrerStep()}
        {currentStep === getStepNumber('condition') && renderConditionStep()}
        {formData.has_third_party && currentStep === getStepNumber('third_party') && renderThirdPartyStep()}
        {formData.requires_indemnity && currentStep === getStepNumber('indemnity') && renderIndemnityStep()}
        {currentStep === getStepNumber('review') && renderReviewStep()}
      </div>

      {/* Navigation — fixed at bottom */}
      <div className="flex justify-between items-center pt-2 pb-2 flex-shrink-0 gap-3">
        {currentStep > 1 ? (
          <Button type="button" variant="outline" onClick={prevStep} className="flex-1 max-w-[130px] h-10 gap-2">
            <ArrowLeft className="w-4 h-4" /> Previous
          </Button>
        ) : <div className="flex-1 max-w-[130px]" />}

        <Button type="button" onClick={handleSaveDraft} disabled={isSavingDraft || !formData.reg}
          variant="outline" className="gap-2 h-10 flex-1 max-w-[140px]">
          {isSavingDraft ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : '💾 Save Draft'}
        </Button>

        <div className="flex-1" />

        {currentStep < steps.length ? (
          <Button type="button" onClick={nextStep} className="flex-1 max-w-[130px] h-10 gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || isCreating}
            className="flex-1 max-w-[170px] h-10 gap-2 bg-accent text-accent-foreground">
            {isSubmitting || isCreating ? <><Loader className="w-4 h-4 animate-spin" /> Creating...</> : <><Check className="w-5 h-5" /> Create Claim</>}
          </Button>
        )}
      </div>
    </div>
  );

  // ─── STEP RENDERERS ───

  function renderIncidentStep() {
    return (
      <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-5 shadow-sm">
        <h3 className="font-bold text-lg">Vehicle & Incident</h3>

        {/* Reg lookup */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Vehicle Registration *</label>
          <div className="flex gap-2">
            <Input value={formData.reg} onChange={e => { handleChange('reg', e.target.value); setVehicleLookupError(null); }}
              className="text-lg font-mono" placeholder="e.g. AB12 CDE" autoFocus />
            <Button type="button" variant="outline" onClick={handleVehicleLookup} disabled={isLookingUpVehicle || !formData.reg || formData.reg.length < 3}
              className="whitespace-nowrap h-9">{isLookingUpVehicle ? <><Loader className="w-4 h-4 animate-spin mr-2" />Looking up...</> : <><Search className="w-4 h-4 mr-2" />Lookup</>}</Button>
          </div>
          {vehicleLookupError && <div className="flex gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800"><AlertCircle className="w-4 h-4 flex-shrink-0" />{vehicleLookupError}</div>}
          {formData.make_model && !vehicleLookupError && <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">✓ <span className="font-bold">{formData.make_model}</span>{formData.vehicle_colour && ` • ${formData.vehicle_colour}`}{formData.vehicle_year_of_manufacture && ` • ${formData.vehicle_year_of_manufacture}`}</div>}
        </div>

        {/* Claim type + dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Claim Type *</label>
            <select value={formData.claim_type} onChange={e => handleChange('claim_type', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[10px] border border-input bg-card text-foreground">
              <option value="">Select claim type...</option>
              <option>Fault Claim</option><option>3rd Party Insurer Direct</option><option>3rd Party Paying Privately</option><option>Credit Repair</option><option>Glass Claim</option><option>Paying Privately</option>
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Date of Loss</label><Input type="date" value={formData.loss_date} onChange={e => handleChange('loss_date', e.target.value)} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Time of Loss</label><Input type="time" value={formData.loss_time} onChange={e => handleChange('loss_time', e.target.value)} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Use of Vehicle</label>
            <select value={formData.vehicle_use} onChange={e => handleChange('vehicle_use', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[10px] border border-input bg-card text-foreground">
              <option value="">Select...</option><option>Business</option><option>Social</option><option>Commuting</option>
            </select>
          </div>
        </div>

        <div className="space-y-2"><label className="text-sm font-medium">Incident Location</label>
          <AddressLookupInput value={formData.incident_location} onChange={handleIncidentLocationChange} placeholder="Start typing address..." />
        </div>

        <div className="space-y-2"><label className="text-sm font-medium">What happened?</label>
          <Textarea value={formData.circumstances} onChange={e => handleChange('circumstances', e.target.value)}
            className="min-h-[80px]" placeholder="Brief description of the incident..." />
        </div>

        {/* Toggle options */}
        <div className="border rounded-lg p-3 divide-y space-y-0">
          <div className="py-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Courtesy car required</span>
            <select value={formData.courtesy_car_required || 'No'} onChange={e => handleChange('courtesy_car_required', e.target.value)} className="px-3 py-1.5 text-sm rounded-lg border border-input bg-card text-foreground">
              {COURTESY_CAR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="py-2"><BoolToggle label="Third party involved" value={formData.has_third_party} onChange={v => handleCheckboxChange('has_third_party', v)} /></div>
          <div className="py-2"><BoolToggle label="Indemnity details required" value={formData.requires_indemnity} onChange={v => handleCheckboxChange('requires_indemnity', v)} /></div>
        </div>
      </div>
    );
  }

  function renderClientStep() {
    return (
      <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-5 shadow-sm">
        <h3 className="font-bold text-lg">Client Details</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Client Name *</label>
          <ClientCombobox value={formData.client_name} onChange={handleClientChange} />
          {formData.client_name && !formData.client_id && (
            <p className="text-xs text-muted-foreground">Client not found — save as draft, add in Clients section, then return.</p>
          )}
        </div>

        {linkedContacts.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> Contacts at this business
            </div>
            <div className="space-y-1.5">
              {linkedContacts.map((c, i) => {
                const primary = c.is_primary || (i === 0 && !linkedContacts.some(x => x.is_primary));
                return (
                  <div key={i} className="rounded-lg border border-border bg-card p-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{c.name || '—'}</span>
                      {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                      {primary && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Primary
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          {formData.client_id && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium inline-block mb-2">✓ Linked to Database</span>}
          <div className="space-y-2"><label className="text-xs text-muted-foreground">Name *</label><Input value={formData.client_name} onChange={e => handleChange('client_name', e.target.value)} placeholder="Client name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Phone</label><Input value={formData.client_phone} onChange={e => handleChange('client_phone', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Email</label><Input type="email" value={formData.client_email} onChange={e => handleChange('client_email', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Address Line 1</label><Input value={formData.client_address_line_1} onChange={e => handleChange('client_address_line_1', e.target.value)} /></div>
          <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Address Line 2</label><Input value={formData.client_address_line_2} onChange={e => handleChange('client_address_line_2', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Town</label><Input value={formData.client_town} onChange={e => handleChange('client_town', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs text-muted-foreground">County</label><Input value={formData.client_county} onChange={e => handleChange('client_county', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Postcode</label><Input value={formData.client_postcode} onChange={e => handleChange('client_postcode', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs text-muted-foreground">VAT Status</label>
              <select value={formData.client_vat_status} onChange={e => handleChange('client_vat_status', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[10px] border border-input bg-card text-foreground">
                <option>VAT Registered</option><option>Non-VAT</option><option>Unknown</option>
              </select>
            </div>
            <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Business Division</label><Input value={formData.business_division} onChange={e => handleChange('business_division', e.target.value)} placeholder="e.g. Fleet, Retail, Commercial" /></div>
          </div>
        </div>

        {/* Driver / Repair Contact */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Same as the Client?</p>
              <p className="text-xs text-muted-foreground">If yes, the client details will be used as the repair contact</p>
            </div>
            <div className="flex gap-0.5 flex-shrink-0">
              <button type="button" onClick={() => handleDriverSameToggle(true)}
                className={`px-3 py-1.5 rounded-l-lg text-xs font-medium transition-colors ${formData.driver_same_as_client === true ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Yes</button>
              <button type="button" onClick={() => handleDriverSameToggle(false)}
                className={`px-3 py-1.5 rounded-r-lg text-xs font-medium transition-colors ${formData.driver_same_as_client === false ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>No</button>
            </div>
          </div>
          {formData.driver_same_as_client === false && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3 border-t border-border">
              <h5 className="font-medium text-sm text-muted-foreground">Driver Contact Details</h5>
              <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Contact Name</label><Input value={formData.driver_contact_name} onChange={e => handleChange('driver_contact_name', e.target.value)} placeholder="Driver / contact name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Phone</label><Input value={formData.driver_contact_phone} onChange={e => handleChange('driver_contact_phone', e.target.value)} /></div>
                <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Email</label><Input type="email" value={formData.driver_contact_email} onChange={e => handleChange('driver_contact_email', e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Address Line 1</label><Input value={formData.driver_contact_address_line_1} onChange={e => handleChange('driver_contact_address_line_1', e.target.value)} /></div>
              <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Address Line 2</label><Input value={formData.driver_contact_address_line_2} onChange={e => handleChange('driver_contact_address_line_2', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Town</label><Input value={formData.driver_contact_town} onChange={e => handleChange('driver_contact_town', e.target.value)} /></div>
                <div className="space-y-1.5"><label className="text-xs text-muted-foreground">County</label><Input value={formData.driver_contact_county} onChange={e => handleChange('driver_contact_county', e.target.value)} /></div>
                <div className="space-y-1.5"><label className="text-xs text-muted-foreground">Postcode</label><Input value={formData.driver_contact_postcode} onChange={e => handleChange('driver_contact_postcode', e.target.value)} /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderInsuranceStep() {
    return (
      <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-5 shadow-sm">
        <h3 className="font-bold text-lg">Insurance Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Insurer</label>
            <InsurerCombobox value={formData.insurer} onChange={v => handleChange('insurer', v)} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Claim Reference</label><Input value={formData.claim_ref} onChange={e => handleChange('claim_ref', e.target.value)} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Policy Number</label><Input value={formData.policy_number} onChange={e => handleChange('policy_number', e.target.value)} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Policy Excess (£)</label><Input type="text" inputMode="decimal" value={formData.policy_excess || ''}
            onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleChange('policy_excess', v === '' ? 0 : parseFloat(v) || 0); }} placeholder="0.00" /></div>
        </div>
      </div>
    );
  }

  function renderReferrerStep() {
    return (
      <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-5 shadow-sm">
        <h3 className="font-bold text-lg">Referrer Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><label className="text-sm font-medium">Referrer</label><ReferrerCombobox value={formData.referrer} onChange={handleReferrerChange} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Referrer Email</label><Input type="email" value={formData.referrer_email} onChange={e => handleChange('referrer_email', e.target.value)} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Referrer Reference</label><Input value={formData.referrer_ref} onChange={e => handleChange('referrer_ref', e.target.value)} /></div>
          <div className="space-y-2">
            <label className="text-sm font-medium">File Handler</label>
            {referrerUsers.length > 0 ? (
              <select value={formData.file_handler} onChange={e => handleChange('file_handler', e.target.value)}
                style={{ WebkitAppearance: 'menulist', appearance: 'menulist' }}
                className="w-full px-3 py-2 text-sm rounded-[10px] border border-input bg-card text-foreground">
                <option value="">Select file handler...</option>
                {referrerUsers.map(u => <option key={u.id} value={u.display_name || u.full_name}>{u.display_name || u.full_name}</option>)}
              </select>
            ) : <Input value={formData.file_handler} onChange={e => handleChange('file_handler', e.target.value)} placeholder="Enter file handler name" />}
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Percentage to Referrer (%)</label>
            <Input type="number" value={formData.percent_to_referrer ?? ''} onChange={e => handleChange('percent_to_referrer', parseFloat(e.target.value) || 0)} placeholder="e.g. 10" />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Repairer Referral Fee (%)</label>
            <Input type="number" value={formData.referral_fee_repairer ?? ''} onChange={e => handleChange('referral_fee_repairer', parseFloat(e.target.value) || 0)} placeholder="e.g. 20" />
          </div>
        </div>
      </div>
    );
  }

  function renderConditionStep() {
    return (
      <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-5 shadow-sm">
        <h3 className="font-bold text-lg">Vehicle Condition & Location</h3>

        {/* Vehicle info from DVLA */}
        {formData.make_model ? (
          <div className="p-3 rounded-lg bg-muted/50 grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Make & Model</p><p className="font-medium">{formData.make_model}</p></div>
            {formData.vehicle_colour && <div><p className="text-xs text-muted-foreground">Colour</p><p className="font-medium">{formData.vehicle_colour}</p></div>}
            {formData.vehicle_year_of_manufacture && <div><p className="text-xs text-muted-foreground">Year</p><p className="font-medium">{formData.vehicle_year_of_manufacture}</p></div>}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">No vehicle details captured yet — use the DVLA lookup in Step 1.</div>
        )}

        <div className="space-y-2"><label className="text-sm font-medium">Vehicle Type</label>
          <select value={formData.vehicle_type} onChange={e => handleChange('vehicle_type', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[10px] border border-input bg-card text-foreground">
            <option>Car</option><option>Van</option><option>Motorcycle</option><option>HGV</option><option>Other</option>
          </select>
        </div>

        <div className="space-y-2"><label className="text-sm font-medium">Vehicle Location</label>
          <AddressLookupInput value={formData.vehicle_location} onChange={handleVehicleLocationChange} placeholder="Where is the vehicle now?" />
        </div>

        <div className="space-y-2"><label className="text-sm font-medium">Damage Description</label>
          <Textarea value={formData.vehicle_damage} onChange={e => handleChange('vehicle_damage', e.target.value)}
            className="min-h-[80px]" placeholder="Describe the damage..." />
        </div>

        {/* Bool toggles */}
        <div className="border rounded-lg p-3 divide-y space-y-0">
          <div className="py-2"><BoolToggle label="Vehicle is unroadworthy" value={formData.unroadworthy} onChange={v => handleCheckboxChange('unroadworthy', v)} /></div>
          <div className="py-2"><BoolToggle label="Recovery required" value={formData.recovery_required} onChange={v => handleCheckboxChange('recovery_required', v)} /></div>
        </div>
      </div>
    );
  }

  function renderThirdPartyStep() {
    return (
      <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-5 shadow-sm">
        <h3 className="font-bold text-lg">Third Party Details</h3>

        {/* Contact */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground">Contact Details</h4>
          <div className="space-y-2"><label className="text-sm font-medium">Third Party Name</label><ClientCombobox value={formData.tp_name} onChange={handleTPChange} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">Phone</label><Input value={formData.tp_phone} onChange={e => handleChange('tp_phone', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input type="email" value={formData.tp_email} onChange={e => handleChange('tp_email', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">Town</label><Input value={formData.tp_town} onChange={e => handleChange('tp_town', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">County</label><Input value={formData.tp_county} onChange={e => handleChange('tp_county', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Postcode</label><Input value={formData.tp_postcode} onChange={e => handleChange('tp_postcode', e.target.value)} /></div>
          </div>
        </div>

        {/* Vehicle */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="font-semibold text-sm text-muted-foreground">Vehicle Details</h4>
          <div className="flex gap-2">
            <Input value={formData.tp_reg} onChange={e => { handleChange('tp_reg', e.target.value.toUpperCase()); setTpVehicleLookupError(null); }} placeholder="e.g. AB12 CDE" />
            <Button type="button" variant="outline" onClick={handleTPVehicleLookup} disabled={isLookingUpTPVehicle || !formData.tp_reg || formData.tp_reg.length < 3}
              className="whitespace-nowrap h-9">{isLookingUpTPVehicle ? <><Loader className="w-4 h-4 animate-spin mr-2" />Looking...</> : <><Search className="w-4 h-4 mr-2" />Lookup</>}</Button>
          </div>
          {tpVehicleLookupError && <div className="flex gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800"><AlertCircle className="w-4 h-4 flex-shrink-0" />{tpVehicleLookupError}</div>}
          {formData.tp_make_model && !tpVehicleLookupError && <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">✓ <span className="font-bold">{formData.tp_make_model}</span>{formData.tp_vehicle_colour && ` • ${formData.tp_vehicle_colour}`}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">Make/Model</label><Input value={formData.tp_make_model} onChange={e => handleChange('tp_make_model', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Their Insurer</label><InsurerCombobox value={formData.tp_insurer} onChange={v => handleChange('tp_insurer', v)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Their Claim Ref</label><Input value={formData.tp_claim_ref} onChange={e => handleChange('tp_claim_ref', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Their Policy No.</label><Input value={formData.tp_policy_number} onChange={e => handleChange('tp_policy_number', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Third Party Damage</label><Textarea value={formData.tp_vehicle_damage} onChange={e => handleChange('tp_vehicle_damage', e.target.value)} className="min-h-[80px]" /></div>
        </div>
      </div>
    );
  }

  function renderIndemnityStep() {
    return (
      <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 shadow-sm">
        <ClaimIndemnityFields formData={formData} handleChange={handleChange} />
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-5 shadow-sm">
          <h3 className="font-bold text-lg">Review & Create</h3>
          <p className="text-sm text-muted-foreground">Check everything below. Click Edit on any section to jump back and correct it.</p>

          {/* Incident */}
          <SectionCard title="Vehicle & Incident" onEdit={() => setCurrentStep(getStepNumber('incident'))}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReviewRow label="Registration" value={formData.reg} />
              <ReviewRow label="Claim Type" value={formData.claim_type} />
              <ReviewRow label="Date of Loss" value={formData.loss_date} />
              <ReviewRow label="Time of Loss" value={formData.loss_time} />
              <ReviewRow label="Vehicle Use" value={formData.vehicle_use} />
              <ReviewRow label="Courtesy Car" value={formData.courtesy_car_required || 'No'} />
              <ReviewRow label="Third Party" value={formData.has_third_party ? 'Yes' : 'No'} />
              <ReviewRow label="Indemnity" value={formData.requires_indemnity ? 'Yes' : 'No'} />
            </div>
            <div className="mt-3 space-y-2">
              <div><p className="text-xs text-muted-foreground mb-1">Incident Location</p><p className="text-sm p-2 bg-muted rounded">{formData.incident_location || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">Circumstances</p><p className="text-sm p-2 bg-muted rounded whitespace-pre-wrap">{formData.circumstances || '—'}</p></div>
            </div>
          </SectionCard>

          {/* Client */}
          <SectionCard title="Client" onEdit={() => setCurrentStep(getStepNumber('client'))}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReviewRow label="Name" value={formData.client_name} />
              <ReviewRow label="Phone" value={formData.client_phone} />
              <ReviewRow label="Email" value={formData.client_email} />
              <ReviewRow label="VAT Status" value={formData.client_vat_status} />
              <ReviewRow label="Business Division" value={formData.business_division} />
              <ReviewRow label="Address" value={[formData.client_address_line_1, formData.client_town, formData.client_postcode].filter(Boolean).join(', ')} />
              <ReviewRow label="Driver Contact" value={formData.driver_contact_name} />
            </div>
          </SectionCard>

          {/* Insurance */}
          <SectionCard title="Insurance" onEdit={() => setCurrentStep(getStepNumber('insurance'))}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReviewRow label="Insurer" value={formData.insurer} />
              <ReviewRow label="Claim Ref" value={formData.claim_ref} />
              <ReviewRow label="Policy Number" value={formData.policy_number} />
              <ReviewRow label="Excess" value={formData.policy_excess ? `£${formData.policy_excess}` : ''} />
            </div>
          </SectionCard>

          {/* Referrer */}
          <SectionCard title="Referrer" onEdit={() => setCurrentStep(getStepNumber('referrer'))}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReviewRow label="Referrer" value={formData.referrer} />
              <ReviewRow label="Referrer Ref" value={formData.referrer_ref} />
              <ReviewRow label="File Handler" value={formData.file_handler} />
              <ReviewRow label="Referrer Email" value={formData.referrer_email} />
            </div>
          </SectionCard>

          {/* Vehicle Condition */}
          <SectionCard title="Vehicle Condition" onEdit={() => setCurrentStep(getStepNumber('condition'))}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReviewRow label="Make/Model" value={formData.make_model} />
              <ReviewRow label="Vehicle Type" value={formData.vehicle_type} />
              <ReviewRow label="Unroadworthy" value={formData.unroadworthy ? 'Yes' : 'No'} />
              <ReviewRow label="Recovery" value={formData.recovery_required ? 'Yes' : 'No'} />
            </div>
            <div className="mt-3 space-y-2">
              <div><p className="text-xs text-muted-foreground mb-1">Vehicle Location</p><p className="text-sm p-2 bg-muted rounded">{formData.vehicle_location || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">Damage</p><p className="text-sm p-2 bg-muted rounded whitespace-pre-wrap">{formData.vehicle_damage || '—'}</p></div>
            </div>
          </SectionCard>

          {/* Third Party (if applicable) */}
          {formData.has_third_party && (
            <SectionCard title="Third Party" onEdit={() => setCurrentStep(getStepNumber('third_party'))}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <ReviewRow label="Name" value={formData.tp_name} />
                <ReviewRow label="Phone" value={formData.tp_phone} />
                <ReviewRow label="Email" value={formData.tp_email} />
                <ReviewRow label="Registration" value={formData.tp_reg} />
                <ReviewRow label="Make/Model" value={formData.tp_make_model} />
                <ReviewRow label="Their Insurer" value={formData.tp_insurer} />
                <ReviewRow label="Their Claim Ref" value={formData.tp_claim_ref} />
              </div>
            </SectionCard>
          )}

          {/* Indemnity (if applicable) */}
          {formData.requires_indemnity && (
            <SectionCard title="Indemnity" onEdit={() => setCurrentStep(getStepNumber('indemnity'))}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <ReviewRow label="Driver DOB" value={formData.indemnity_driver_dob} />
                <ReviewRow label="Registered Owner" value={formData.indemnity_registered_owner} />
                <ReviewRow label="Vehicle Use" value={formData.indemnity_vehicle_use_at_incident} />
              </div>
            </SectionCard>
          )}
        </div>

        {/* File Upload */}
        <div className="bg-card border border-border rounded-[10px] p-4 md:p-6 space-y-4 shadow-sm">
          <h4 className="font-semibold">Upload Files (Optional)</h4>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex gap-2 text-xs text-purple-800">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" /><span><strong>AI Analysis:</strong> Upload documents and use the sparkle icon to auto-extract claim details.</span>
          </div>
          <FileUpload value={Array.isArray(formData.file_urls) ? formData.file_urls : []} onChange={urls => handleChange('file_urls', urls)}
            enableAI={true} analysisType="claim" onAIExtract={handleAIExtract} />
        </div>
      </div>
    );
  }
}

// ── Section Card (review) ──
function SectionCard({ title, onEdit, children }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">{title}</h4>
        <Button type="button" variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={onEdit}>Edit</Button>
      </div>
      {children}
    </div>
  );
}