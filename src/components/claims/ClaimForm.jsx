import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, Plus, Search, Loader, AlertCircle, Sparkles } from "lucide-react";
import InsurerCombobox from "../shared/InsurerCombobox";
import BodyshopCombobox from "../shared/BodyshopCombobox";
import FileUpload from '../shared/FileUpload';
import ClientCombobox from '../shared/ClientCombobox';
import ReferrerCombobox from '../shared/ReferrerCombobox';
import ManufacturerModelCombobox from '../shared/ManufacturerModelCombobox';
import AddClientModal from '../shared/AddClientModal';
import StatusMultiSelect from '../shared/StatusMultiSelect';
import ClaimIndemnityFields from './ClaimIndemnityFields';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AddressLookupInput from '../shared/AddressLookupInput';
import AIExtractConfirmDialog from '../shared/AIExtractConfirmDialog';

// Geocoding function
const geocodeAddress = async (address) => {
  if (!address || address.trim() === '') {
    return null;
  }
  await new Promise(resolve => setTimeout(resolve, 300));
  const lowerAddress = address.toLowerCase();
  if (lowerAddress.includes("london")) {
    return { lat: 51.5074, lng: 0.1278 };
  } else if (lowerAddress.includes("new york")) {
    return { lat: 40.7128, lng: -74.0060 };
  } else if (lowerAddress.includes("paris")) {
    return { lat: 48.8566, lng: 2.3522 };
  } else if (lowerAddress.includes("berlin")) {
    return { lat: 52.5200, lng: 13.4050 };
  } else if (lowerAddress.includes("tokyo")) {
    return { lat: 35.6895, lng: 139.6917 };
  }
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

  // Check if user is internal - with loading state
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

  // Debug logging
  React.useEffect(() => {
    if (currentUser) {
      console.log('Current user in ClaimForm:', {
        email: currentUser.email,
        role: currentUser.role,
        user_type: currentUser.user_type,
        isInternalUser: isInternalUser
      });
    }
  }, [currentUser, isInternalUser]);

  const [formData, setFormData] = useState(claim || {
    job_number: '',
    reg: '',
    job_statuses: ['New'], // Changed from job_status to array
    claim_type: 'Credit Repair',
    circumstances: '',
    loss_date: '',
    loss_time: '',
    incident_location: '',
    vehicle_use: '',
    courtesy_car_required: false,
    has_third_party: false, // Added to control third-party step
    requires_indemnity: false, // NEW
    file_urls: [],
    insurer: '',
    claim_ref: '',
    policy_number: '',
    policy_excess: 0,
    referrer: '',
    referrer_id: null,
    referrer_ref: '',
    file_handler: '',
    referrer_email: '',
    percent_to_referrer: 0,
    client_name: '',
    client_id: null,
    client_phone: '',
    driver_contact_name: '',
    client_email: '',
    client_address_line_1: '',
    client_address_line_2: '',
    client_town: '',
    client_county: '',
    client_postcode: '',
    client_vat_status: 'Unknown',
    business_division: '',
    client_lat: null,
    client_lng: null,
    make_model: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_colour: '',
    vehicle_fuel_type: '',
    vehicle_year_of_manufacture: null,
    vehicle_engine_capacity: null,
    vehicle_co2_emissions: null,
    vehicle_euro_status: '',
    vehicle_mot_status: '',
    vehicle_mot_expiry_date: '',
    vehicle_tax_status: '',
    vehicle_tax_due_date: '',
    vehicle_date_of_last_v5c_issued: '',
    vehicle_wheelplan: '',
    vehicle_revenue_weight: null,
    vehicle_location: '',
    vehicle_damage: '',
    vehicle_type: 'Car',
    unroadworthy: false,
    recovery_required: false,
    tp_name: '',
    tp_phone: '',
    tp_driver_contact: '',
    tp_email: '',
    tp_address_line_1: '',
    tp_address_line_2: '',
    tp_town: '',
    tp_county: '',
    tp_postcode: '',
    tp_vat_status: 'Unknown',
    tp_reg: '',
    tp_make_model: '',
    tp_vehicle_colour: '',
    tp_vehicle_fuel_type: '',
    tp_vehicle_year_of_manufacture: null,
    tp_insurer: '',
    tp_policy_number: '',
    tp_claim_ref: '',
    tp_vehicle_location: '',
    tp_vehicle_damage: '',
    tp_vehicle_type: 'Car',
    tp_unroadworthy: false,
    tp_recovery_required: false,
    bodyshop: '',
    bodyshop_id: null,
    bodyshop_email: '',
    authorising_party: '',
    audatex_code: '',
    send_estimate_email: '',
    artura_est_url: '',
    est_fee: 0,
    referral_fee_repairer: 0,
    percent_bld_instruction: 0,
    date_received: new Date().toISOString().split('T')[0],
    estimate_completed: '',
    authority_received: '',
    bs_instructed: '',
    booking_in_date: '',
    on_site_date: '',
    all_parts_on_site: '',
    ecd: '',
    completion_date: '',
    invoice_received_repairer: '',
    invoice_sent_referrer: '',
    estimate_cost_net: 0,
    authority_cost_net: 0,
    estimate_cost_gross: 0,
    authority_cost_gross: 0,
    final_repair_cost: 0,
    total_invoice_repairer: 0,
    // NEW: Indemnity fields - FIXED: strings instead of booleans
    indemnity_driver_dob: '',
    indemnity_registered_owner: '',
    indemnity_pending_prosecutions: '',
    indemnity_dvla_medical_restrictions: '',
    indemnity_full_license_12_months: '',
    indemnity_convictions_last_5_years: '',
    indemnity_vehicle_use_at_incident: '',
    indemnity_vehicle_modifications: '',
  });

  // If editing existing claim, skip the wizard
  const isEditing = !!claim;

  // SIMPLIFIED: Just populate form fields, don't create entities yet
  const handleAIExtract = async (extractedData) => {
    console.log('AI extracted data:', extractedData);
    
    // Simply populate the form with all extracted data
    // User will review and save entities manually in the wizard
    setAiExtractDialog({
      isOpen: true,
      data: extractedData
    });
  };

  // UPDATED: Handle confirmation from the new dialog
  const handleAIExtractConfirm = (selectedData) => {
    if (selectedData) {
      setFormData(prev => ({
        ...prev,
        ...selectedData
      }));
    }
    setAiExtractDialog({ isOpen: false, data: null }); // Close dialog after confirmation
  };

  // New handler for vehicle lookup
  const handleVehicleLookup = async () => {
    if (!formData.reg || formData.reg.trim().length < 3) {
      setVehicleLookupError('Please enter a valid registration number');
      return;
    }

    setIsLookingUpVehicle(true);
    setVehicleLookupError(null); // Clear previous errors

    try {
      const response = await base44.functions.invoke('lookupVehicleData', {
        registrationNumber: formData.reg,
        // useTestKey: !useProductionKey // Use the opposite of useProductionKey - REMOVED
      });

      // FIXED: Access data from response.data (axios response object)
      const result = response.data;

      if (result.success) {
        // Update form with vehicle data - including all DVLA fields
        setFormData(prev => ({
          ...prev,
          make_model: result.make_model || '',
          vehicle_make: result.make || '',
          vehicle_model: result.model || '',
          vehicle_colour: result.colour || '',
          vehicle_fuel_type: result.fuel_type || '',
          vehicle_year_of_manufacture: result.year_of_manufacture || null,
          vehicle_engine_capacity: result.engine_capacity || null,
          vehicle_co2_emissions: result.co2_emissions || null,
          vehicle_euro_status: result.euro_status || '',
          vehicle_mot_status: result.mot_status || '',
          vehicle_mot_expiry_date: result.mot_expiry_date || '',
          vehicle_tax_status: result.tax_status || '',
          vehicle_tax_due_date: result.tax_due_date || '',
          vehicle_date_of_last_v5c_issued: result.date_of_last_v5c_issued || '',
          vehicle_wheelplan: result.wheelplan || '',
          vehicle_revenue_weight: result.revenue_weight || null,
        }));
        
        // Clear error if successful
        setVehicleLookupError(null);
      } else {
        setVehicleLookupError(result.message || 'Vehicle not found');
      }
    } catch (error) {
      console.error('Vehicle lookup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unable to lookup vehicle. Please try again.';
      setVehicleLookupError(errorMessage);
    } finally {
      setIsLookingUpVehicle(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Strip system/AI-extracted fields to avoid conflicts
    const { id: _id, created_date: _cd, updated_date: _ud, created_by: _cb, ...submitData } = formData;

    // If creating a new claim (not editing), generate job number
    if (!claim) {
      try {
        const response = await base44.functions.invoke('generateJobNumber', {
          entityType: 'Claim'
        });
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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIncidentLocationChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      incident_location: addressData.display_name || addressData.address || ''
    }));
  };

  const handleVehicleLocationChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      vehicle_location: addressData.display_name || addressData.address || ''
    }));
  };

  const handleBodyshopChange = (bodyshop) => {
    setFormData(prev => ({
      ...prev,
      bodyshop: bodyshop.name,
      bodyshop_id: bodyshop.id,
      bodyshop_email: bodyshop.email || ''
    }));
  };

  const handleClientChange = async (client) => {
    // Build the full client address
    const fullAddress = [
      client.address_line_1,
      client.address_line_2,
      client.town,
      client.county,
      client.postcode
    ].filter(Boolean).join(', ');

    const newClientData = {
      client_name: client.name,
      client_id: client.id,
      client_phone: client.phone || '',
      client_email: client.email || '',
      client_address_line_1: client.address_line_1 || '',
      client_address_line_2: client.address_line_2 || '',
      client_town: client.town || '',
      client_county: client.county || '',
      client_postcode: client.postcode || '',
      vehicle_location: fullAddress || '', // Auto-fill vehicle location with client address
    };

    let geocodedLat = null;
    let geocodedLng = null;

    if (fullAddress) {
      try {
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          geocodedLat = coords.lat;
          geocodedLng = coords.lng;
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
      }
    }

    setFormData(prev => ({
      ...prev,
      ...newClientData,
      client_lat: geocodedLat,
      client_lng: geocodedLng,
    }));
  };

  // NEW: Function to save current client form data as a new Client entity
  const handleSaveClientToDatabase = async () => {
    if (!formData.client_name) {
      alert('Please enter a client name');
      return;
    }

    if (!formData.client_phone && !formData.client_email) {
      alert('Please enter at least a phone number or email');
      return;
    }

    try {
      const newClientData = {
        name: formData.client_name,
        phone: formData.client_phone || '',
        email: formData.client_email || '',
        address_line_1: formData.client_address_line_1 || '',
        address_line_2: formData.client_address_line_2 || '',
        town: formData.client_town || '',
        county: formData.client_county || '',
        postcode: formData.client_postcode || ''
      };

      const newClient = await base44.entities.Client.create(newClientData);
      
      // Update form with the new client ID
      setFormData(prev => ({
        ...prev,
        client_id: newClient.id
      }));

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      alert('Client saved to database successfully!');
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please try again.');
    }
  };

  // New handler for successful client modal submission
  const handleClientModalSuccess = (newClient) => {
    console.log('Client modal success, updating form data');
    queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate client list cache
    handleClientChange(newClient); // Update form data with the new client
    setShowClientModal(false); // Close the modal
  };

  // New handler for third-party client change
  const handleTPChange = async (client) => {
    const newTPData = {
      tp_name: client.name,
      tp_phone: client.phone || '',
      tp_email: client.email || '',
      tp_address_line_1: client.address_line_1 || '',
      tp_address_line_2: client.address_line_2 || '',
      tp_town: client.town || '',
      tp_county: client.county || '',
      tp_postcode: client.postcode || '',
    };

    setFormData(prev => ({
      ...prev,
      ...newTPData,
    }));
  };

  // New handler for successful third-party client modal submission
  const handleTPModalSuccess = (newClient) => {
    console.log('TP modal success, updating form data');
    queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate client list cache
    handleTPChange(newClient); // Update form data with the new client
    setShowTPModal(false); // Close the modal
  };

  // Third party vehicle lookup
  const handleTPVehicleLookup = async () => {
    if (!formData.tp_reg || formData.tp_reg.trim().length < 3) {
      setTpVehicleLookupError('Please enter a valid registration number');
      return;
    }

    setIsLookingUpTPVehicle(true);
    setTpVehicleLookupError(null);

    try {
      const response = await base44.functions.invoke('lookupVehicleData', {
        registrationNumber: formData.tp_reg,
      });

      const result = response.data;

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          tp_make_model: result.make_model || '',
          tp_vehicle_colour: result.colour || '',
          tp_vehicle_fuel_type: result.fuel_type || '',
          tp_vehicle_year_of_manufacture: result.year_of_manufacture || null,
        }));
        setTpVehicleLookupError(null);
      } else {
        setTpVehicleLookupError(result.message || 'Vehicle not found');
      }
    } catch (error) {
      console.error('TP Vehicle lookup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unable to lookup vehicle. Please try again.';
      setTpVehicleLookupError(errorMessage);
    } finally {
      setIsLookingUpTPVehicle(false);
    }
  };

  const handleReferrerChange = (referrer) => {
    setFormData(prev => ({
      ...prev,
      referrer: referrer.name,
      referrer_id: referrer.id,
      referrer_email: referrer.email || ''
    }));
  };

  const handleCheckboxChange = (field, checked) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const generateSteps = () => {
    const dynamicSteps = [
      { title: "Basic Info", key: "basic" },
      { title: "Referrer", key: "referrer" },
      { title: "Client & Vehicle", key: "client_vehicle" },
      { title: "Insurance", key: "insurance" },
      // Removed bodyshop from required steps - it can be added later
    ];

    if (formData.has_third_party) {
      dynamicSteps.push({ title: "Third Party", key: "third_party" });
    }

    if (formData.requires_indemnity) { // NEW
      dynamicSteps.push({ title: "Indemnity", key: "indemnity" }); // NEW
    }

    dynamicSteps.push({ title: "Review", key: "review" });

    return dynamicSteps.map((step, index) => ({
      ...step,
      number: index + 1,
    }));
  };

  const steps = generateSteps();
  const getStepNumber = (key) => steps.find(s => s.key === key)?.number;

  // If editing existing claim, show all fields in traditional form
  if (isEditing) {
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
        {/* Header - Fixed */}
        <div className="neomorph p-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={onCancel} className="neomorph-flat p-3 transition-all active:neomorph-pressed">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-700">Edit Claim</h1>
              <p className="text-sm text-gray-500 mt-1">Update claim details</p>
            </div>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm text-gray-600 mb-2">Registration *</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        value={formData.reg}
                        onChange={(e) => {
                          handleChange('reg', e.target.value);
                          setVehicleLookupError(null); // Clear error when typing
                        }}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                        required
                      />
                      <Button
                        type="button"
                        onClick={handleVehicleLookup}
                        disabled={isLookingUpVehicle || !formData.reg}
                        className="neomorph-flat px-4 py-3 whitespace-nowrap"
                        title="Lookup vehicle details from DVLA"
                      >
                        {isLookingUpVehicle ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {/* Removed production key toggle for editing mode */}
                    {vehicleLookupError && (
                      <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-800 whitespace-pre-line">{vehicleLookupError}</p>
                      </div>
                    )}
                    {formData.make_model && !vehicleLookupError && (
                      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 font-medium">
                          ✓ Vehicle found: <span className="font-bold">{formData.make_model}</span>
                          {formData.vehicle_colour && <span className="font-normal"> • {formData.vehicle_colour}</span>}
                          {formData.vehicle_year_of_manufacture && <span className="font-normal"> • {formData.vehicle_year_of_manufacture}</span>}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Job Statuses</label>
                  <StatusMultiSelect
                    selectedStatuses={formData.job_statuses || []}
                    onStatusesChange={(statuses) => handleChange('job_statuses', statuses)}
                    availableStatuses={['New', 'In Progress', 'Awaiting Authority', 'Placed', 'In Repair', 'Completed', 'Cancelled', 'Total Loss']}
                    placeholder="Select statuses..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Claim Type</label>
                  <select
                    value={formData.claim_type}
                    onChange={(e) => handleChange('claim_type', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value="Credit Repair">Credit Repair</option>
                    <option value="Fault Claim">Fault Claim</option>
                    <option value="Non-Fault Claim">Non-Fault Claim</option>
                    <option value="Total Loss">Total Loss</option>
                    <option value="Glass Claim">Glass Claim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Date of Loss</label>
                  <Input
                    type="date"
                    value={formData.loss_date}
                    onChange={(e) => handleChange('loss_date', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Time of Loss</label>
                  <Input
                    type="time"
                    value={formData.loss_time}
                    onChange={(e) => handleChange('loss_time', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Use of Vehicle</label>
                  <select
                    value={formData.vehicle_use}
                    onChange={(e) => handleChange('vehicle_use', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value="">Not specified</option>
                    <option value="Business">Business</option>
                    <option value="Social">Social</option>
                    <option value="Commuting">Commuting</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Incident Location</label>
                <AddressLookupInput
                  value={formData.incident_location}
                  onChange={handleIncidentLocationChange}
                  placeholder="Start typing address or postcode..."
                  className="neomorph-inset"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Circumstances</label>
                <Textarea
                  value={formData.circumstances}
                  onChange={(e) => handleChange('circumstances', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="courtesy_car_required"
                  checked={formData.courtesy_car_required}
                  onChange={(e) => handleCheckboxChange('courtesy_car_required', e.target.checked)}
                  className="neomorph-inset"
                />
                <label htmlFor="courtesy_car_required" className="text-sm text-gray-600">Courtesy Car Required</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="has_third_party_edit"
                  checked={formData.has_third_party}
                  onChange={(e) => handleCheckboxChange('has_third_party', e.target.checked)}
                  className="neomorph-inset"
                />
                <label htmlFor="has_third_party_edit" className="text-sm text-gray-600">Third Party Involved</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires_indemnity_edit"
                  checked={formData.requires_indemnity}
                  onChange={(e) => handleCheckboxChange('requires_indemnity', e.target.checked)}
                  className="neomorph-inset"
                />
                <label htmlFor="requires_indemnity_edit" className="text-sm text-gray-600">Indemnity Details Required</label>
              </div>
            </div>

            {/* Client Details */}
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Client Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Client Name *</label>
                  {isInternalUser ? (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <ClientCombobox
                          value={formData.client_name}
                          onChange={handleClientChange}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          console.log('Plus button clicked, user:', currentUser);
                          if (!isInternalUser) {
                            alert('You do not have permission to add clients');
                            return;
                          }
                          setShowClientModal(true);
                        }}
                        className="neomorph-flat p-3"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <ClientCombobox
                      value={formData.client_name}
                      onChange={handleClientChange}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Client Phone</label>
                  <Input
                    value={formData.client_phone}
                    onChange={(e) => handleChange('client_phone', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Driver/Contact Name</label>
                  <Input
                    value={formData.driver_contact_name}
                    onChange={(e) => handleChange('driver_contact_name', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Client Email</label>
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => handleChange('client_email', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Address Line 1</label>
                <Input
                  value={formData.client_address_line_1}
                  onChange={(e) => handleChange('client_address_line_1', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Address Line 2</label>
                <Input
                  value={formData.client_address_line_2}
                  onChange={(e) => handleChange('client_address_line_2', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Town</label>
                  <Input
                    value={formData.client_town}
                    onChange={(e) => handleChange('client_town', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">County</label>
                  <Input
                    value={formData.client_county}
                    onChange={(e) => handleChange('client_county', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Postcode</label>
                  <Input
                    value={formData.client_postcode}
                    onChange={(e) => handleChange('client_postcode', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Client VAT Status</label>
                <select
                  value={formData.client_vat_status}
                  onChange={(e) => handleChange('client_vat_status', e.target.value)}
                  className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                >
                  <option value="VAT Registered">VAT Registered</option>
                  <option value="Non-VAT">Non-VAT</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Vehicle Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Make/Model</label>
                  <ManufacturerModelCombobox
                    value={formData.make_model}
                    onChange={(value) => handleChange('make_model', value)}
                    placeholder="Select make & model..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Vehicle Type</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => handleChange('vehicle_type', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="HGV">HGV</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Vehicle Location</label>
                  <AddressLookupInput
                    value={formData.vehicle_location}
                    onChange={handleVehicleLocationChange}
                    placeholder="Start typing address..."
                    className="neomorph-inset"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Vehicle Damage</label>
                <Textarea
                  value={formData.vehicle_damage}
                  onChange={(e) => handleChange('vehicle_damage', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                />
              </div>
            </div>

            {/* Insurance Details */}
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Insurance Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Insurer</label>
                  <InsurerCombobox
                    value={formData.insurer}
                    onChange={(value) => handleChange('insurer', value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Claim Reference</label>
                  <Input value={formData.claim_ref} onChange={(e) => handleChange('claim_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Policy Number</label>
                  <Input value={formData.policy_number} onChange={(e) => handleChange('policy_number', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Policy Excess (£)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.policy_excess || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handleChange('policy_excess', value === '' ? 0 : parseFloat(value) || 0);
                      }
                    }}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Referrer Details */}
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Referrer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Referrer</label>
                  <ReferrerCombobox
                    value={formData.referrer}
                    onChange={handleReferrerChange}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Referrer Email</label>
                  <Input
                    type="email"
                    value={formData.referrer_email}
                    onChange={(e) => handleChange('referrer_email', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    placeholder="Auto-filled from selection"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Referrer Ref</label>
                  <Input value={formData.referrer_ref} onChange={(e) => handleChange('referrer_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">File Handler</label>
                  <Input value={formData.file_handler} onChange={(e) => handleChange('file_handler', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                </div>
              </div>
            </div>

            {/* Bodyshop Details */}
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Bodyshop Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Bodyshop</label>
                  <BodyshopCombobox
                    value={formData.bodyshop}
                    onChange={handleBodyshopChange}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Bodyshop Email</label>
                  <Input
                    type="email"
                    value={formData.bodyshop_email}
                    onChange={(e) => handleChange('bodyshop_email', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    placeholder="Auto-filled from selection"
                  />
                </div>
              </div>
            </div>

            {/* Third Party Details */}
            {formData.has_third_party && (
              <div className="neomorph-flat p-6 space-y-4">
                <h3 className="font-bold text-gray-700 mb-4">Third Party Details</h3>
                
                {/* Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Name</label>
                    <Input
                      value={formData.tp_name}
                      onChange={(e) => handleChange('tp_name', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Phone</label>
                    <Input
                      value={formData.tp_phone}
                      onChange={(e) => handleChange('tp_phone', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Email</label>
                    <Input
                      type="email"
                      value={formData.tp_email}
                      onChange={(e) => handleChange('tp_email', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Address Line 1</label>
                  <Input
                    value={formData.tp_address_line_1}
                    onChange={(e) => handleChange('tp_address_line_1', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Address Line 2</label>
                  <Input
                    value={formData.tp_address_line_2}
                    onChange={(e) => handleChange('tp_address_line_2', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Town</label>
                    <Input
                      value={formData.tp_town}
                      onChange={(e) => handleChange('tp_town', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">County</label>
                    <Input
                      value={formData.tp_county}
                      onChange={(e) => handleChange('tp_county', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Postcode</label>
                    <Input
                      value={formData.tp_postcode}
                      onChange={(e) => handleChange('tp_postcode', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                </div>

                {/* Vehicle Details */}
                <h4 className="font-semibold text-gray-700 mt-6 mb-3">Third Party Vehicle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-2">Vehicle Registration</label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.tp_reg}
                        onChange={(e) => {
                          handleChange('tp_reg', e.target.value.toUpperCase());
                          setTpVehicleLookupError(null);
                        }}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0 flex-1"
                        placeholder="e.g. AB12 CDE"
                      />
                      <Button
                        type="button"
                        onClick={handleTPVehicleLookup}
                        disabled={isLookingUpTPVehicle || !formData.tp_reg}
                        className="neomorph-flat px-4 py-3 whitespace-nowrap"
                        title="Lookup vehicle details from DVLA"
                      >
                        {isLookingUpTPVehicle ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {tpVehicleLookupError && (
                      <div className="flex items-start gap-2 p-3 mt-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-800">{tpVehicleLookupError}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Make/Model</label>
                    <Input
                      value={formData.tp_make_model}
                      onChange={(e) => handleChange('tp_make_model', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      placeholder="e.g. Ford Focus"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Vehicle Type</label>
                    <select
                      value={formData.tp_vehicle_type}
                      onChange={(e) => handleChange('tp_vehicle_type', e.target.value)}
                      className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                    >
                      <option value="Car">Car</option>
                      <option value="Van">Van</option>
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="HGV">HGV</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Insurance Details */}
                <h4 className="font-semibold text-gray-700 mt-6 mb-3">Third Party Insurance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Their Insurer</label>
                    <InsurerCombobox
                      value={formData.tp_insurer}
                      onChange={(value) => handleChange('tp_insurer', value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Their Claim Reference</label>
                    <Input
                      value={formData.tp_claim_ref}
                      onChange={(e) => handleChange('tp_claim_ref', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-2">Their Policy Number</label>
                    <Input
                      value={formData.tp_policy_number}
                      onChange={(e) => handleChange('tp_policy_number', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Indemnity Details (Edit Mode) */}
            {formData.requires_indemnity && (
              <ClaimIndemnityFields formData={formData} handleChange={handleChange} />
            )}

            {/* File Uploads */}
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">File Uploads</h3>
              <FileUpload
                value={Array.isArray(formData.file_urls) ? formData.file_urls : []}
                onChange={(urls) => handleChange('file_urls', urls)}
                enableAI={true}
                analysisType="claim"
                onAIExtract={handleAIExtract}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                onClick={onCancel}
                className="neomorph-flat px-6 py-3 font-medium text-gray-700 transition-all active:neomorph-pressed"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="neomorph-flat px-6 py-3 font-medium text-blue-600 transition-all active:neomorph-pressed"
              >
                Update Claim
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Wizard mode for new claims
  return (
    <>
      <AIExtractConfirmDialog
        isOpen={aiExtractDialog.isOpen}
        onClose={() => setAiExtractDialog({ isOpen: false, data: null })}
        onConfirm={handleAIExtractConfirm}
        extractedData={aiExtractDialog.data}
        existingData={formData}
        title="AI Data Extraction"
      />

      <div className="h-full flex flex-col gap-4 md:gap-6">
        {!isLoadingUser && isInternalUser && (
          <>
            <AddClientModal
              isOpen={showClientModal}
              onClose={() => setShowClientModal(false)}
              onSuccess={handleClientModalSuccess}
            />
            <AddClientModal
              isOpen={showTPModal}
              onClose={() => setShowTPModal(false)}
              onSuccess={handleTPModalSuccess}
            />
          </>
        )}

        {/* Header & Progress - Fixed */}
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

          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className={`flex flex-col items-center group ${currentStep === step.number ? 'scale-105' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep > step.number
                      ? 'bg-green-600 text-white'
                      : currentStep === step.number
                        ? 'bg-gold text-black'
                        : 'bg-gray-300 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <span className="text-xs text-gray-500 mt-2 hidden md:block">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 transition-all ${
                    currentStep > step.number ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {currentStep === getStepNumber("basic") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Let's start with the basics</h3>

                {/* AI Document Upload Section */}
                <div className="neomorph-flat p-5 bg-purple-50/50 dark:bg-purple-900/10 border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Quick Start with AI</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload your instruction document and let AI automatically extract claim details. Any missing fields can be filled in manually as you continue through the wizard.
                      </p>
                    </div>
                  </div>
                  <FileUpload
                    value={Array.isArray(formData.file_urls) ? formData.file_urls : []}
                    onChange={(urls) => handleChange('file_urls', urls)}
                    enableAI={true}
                    analysisType="claim"
                    onAIExtract={handleAIExtract}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-background text-gray-500">Or enter details manually</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Vehicle Registration *</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        value={formData.reg}
                        onChange={(e) => {
                          handleChange('reg', e.target.value);
                          setVehicleLookupError(null);
                        }}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0 text-lg"
                        placeholder="e.g. AB12 CDE"
                        required
                        autoFocus
                      />
                      <Button
                        type="button"
                        onClick={handleVehicleLookup}
                        disabled={isLookingUpVehicle || !formData.reg || formData.reg.length < 3}
                        className="neomorph-flat px-4 py-3 whitespace-nowrap"
                        title="Lookup vehicle details from DVLA"
                      >
                        {isLookingUpVehicle ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin mr-2" />
                            <span className="hidden sm:inline">Looking up...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Lookup</span>
                          </>
                        )}
                      </Button>
                    </div>
                    {vehicleLookupError && (
                      <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-800 whitespace-pre-line">{vehicleLookupError}</p>
                      </div>
                    )}
                    {formData.make_model && !vehicleLookupError && (
                      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          ✓ <span className="font-bold">Vehicle found:</span>
                          <br />
                          <span className="font-bold text-base">{formData.make_model}</span>
                          {formData.vehicle_colour && <span className="font-normal"> • {formData.vehicle_colour}</span>}
                          {formData.vehicle_year_of_manufacture && <span className="font-normal"> • {formData.vehicle_year_of_manufacture}</span>}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Claim Type *</label>
                  <select
                    value={formData.claim_type}
                    onChange={(e) => handleChange('claim_type', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                    required
                  >
                    <option value="Credit Repair">Credit Repair</option>
                    <option value="Fault Claim">Fault Claim</option>
                    <option value="Non-Fault Claim">Non-Fault Claim</option>
                    <option value="Total Loss">Total Loss</option>
                    <option value="Glass Claim">Glass Claim</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Date of Loss</label>
                    <Input
                      type="date"
                      value={formData.loss_date}
                      onChange={(e) => handleChange('loss_date', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Time of Loss</label>
                    <Input
                      type="time"
                      value={formData.loss_time}
                      onChange={(e) => handleChange('loss_time', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Incident Location</label>
                  <AddressLookupInput
                    value={formData.incident_location}
                    onChange={handleIncidentLocationChange}
                    placeholder="Start typing address or postcode..."
                    className="neomorph-inset"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Use of Vehicle</label>
                  <select
                    value={formData.vehicle_use}
                    onChange={(e) => handleChange('vehicle_use', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value="">Select...</option>
                    <option value="Business">Business</option>
                    <option value="Social">Social</option>
                    <option value="Commuting">Commuting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">What happened?</label>
                  <Textarea
                    value={formData.circumstances}
                    onChange={(e) => handleChange('circumstances', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-32"
                    placeholder="Brief description of the incident..."
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="courtesy_car"
                      checked={formData.courtesy_car_required}
                      onChange={(e) => handleCheckboxChange('courtesy_car_required', e.target.checked)}
                      className="neomorph-inset"
                    />
                    <label htmlFor="courtesy_car" className="text-sm text-gray-600">Customer needs a courtesy car</label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="has_third_party"
                      checked={formData.has_third_party}
                      onChange={(e) => handleCheckboxChange('has_third_party', e.target.checked)}
                      className="neomorph-inset"
                    />
                    <label htmlFor="has_third_party" className="text-sm text-gray-600">Third party involved</label>
                  </div>

                  {/* NEW: Requires Indemnity checkbox */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="requires_indemnity"
                      checked={formData.requires_indemnity}
                      onChange={(e) => handleCheckboxChange('requires_indemnity', e.target.checked)}
                      className="neomorph-inset"
                    />
                    <label htmlFor="requires_indemnity" className="text-sm text-gray-600">Indemnity details required</label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Referrer */}
            {currentStep === getStepNumber("referrer") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Referrer Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Referrer</label>
                    <ReferrerCombobox
                      value={formData.referrer}
                      onChange={handleReferrerChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Referrer Email</label>
                    <Input
                      type="email"
                      value={formData.referrer_email}
                      onChange={(e) => handleChange('referrer_email', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      placeholder="Auto-filled from selection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Referrer Reference</label>
                    <Input
                      value={formData.referrer_ref}
                      onChange={(e) => handleChange('referrer_ref', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">File Handler</label>
                    <Input
                      value={formData.file_handler}
                      onChange={(e) => handleChange('file_handler', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
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
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <ClientCombobox
                          value={formData.client_name}
                          onChange={handleClientChange}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Search for existing client or enter a new name below
                    </p>
                  </div>

                  {/* Manual Client Details Entry */}
                  <div className="neomorph-inset p-4 space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">Client Details</p>
                      {isInternalUser && formData.client_name && !formData.client_id && (
                        <Button
                          type="button"
                          onClick={handleSaveClientToDatabase}
                          className="neomorph-flat px-4 py-2 text-sm flex items-center gap-2 bg-green-50 hover:bg-green-100"
                        >
                          <Plus className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Save Client to Database</span>
                        </Button>
                      )}
                      {formData.client_id && (
                        <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          ✓ Linked to Database
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name *</label>
                      <Input
                        value={formData.client_name}
                        onChange={(e) => handleChange('client_name', e.target.value)}
                        className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                        placeholder="Enter client name"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <Input
                          value={formData.client_phone}
                          onChange={(e) => handleChange('client_phone', e.target.value)}
                          className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                          placeholder="Phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <Input
                          type="email"
                          value={formData.client_email}
                          onChange={(e) => handleChange('client_email', e.target.value)}
                          className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                          placeholder="Email address"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Address Line 1</label>
                      <Input
                        value={formData.client_address_line_1}
                        onChange={(e) => handleChange('client_address_line_1', e.target.value)}
                        className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                        placeholder="Street address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Address Line 2</label>
                      <Input
                        value={formData.client_address_line_2}
                        onChange={(e) => handleChange('client_address_line_2', e.target.value)}
                        className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                        placeholder="Optional"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Town</label>
                        <Input
                          value={formData.client_town}
                          onChange={(e) => handleChange('client_town', e.target.value)}
                          className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">County</label>
                        <Input
                          value={formData.client_county}
                          onChange={(e) => handleChange('client_county', e.target.value)}
                          className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Postcode</label>
                        <Input
                          value={formData.client_postcode}
                          onChange={(e) => handleChange('client_postcode', e.target.value)}
                          className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">VAT Status</label>
                      <select
                        value={formData.client_vat_status}
                        onChange={(e) => handleChange('client_vat_status', e.target.value)}
                        className="neomorph-inset w-full px-3 py-2 text-sm text-gray-700 border-0 rounded-xl"
                      >
                        <option value="VAT Registered">VAT Registered</option>
                        <option value="Non-VAT">Non-VAT</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Driver/Contact Name</label>
                    <Input
                      value={formData.driver_contact_name}
                      onChange={(e) => handleChange('driver_contact_name', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      placeholder="If different from client"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Vehicle Information</h4>
                  
                  {/* Display DVLA captured data as read-only */}
                  {formData.make_model ? (
                    <div className="neomorph-inset p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <p className="text-xs text-green-600 font-medium">Vehicle details from DVLA</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Make & Model</p>
                          <p className="font-medium text-gray-700">{formData.make_model}</p>
                        </div>
                        
                        {formData.vehicle_colour && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Colour</p>
                            <p className="font-medium text-gray-700">{formData.vehicle_colour}</p>
                          </div>
                        )}
                        
                        {formData.vehicle_year_of_manufacture && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Year</p>
                            <p className="font-medium text-gray-700">{formData.vehicle_year_of_manufacture}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="neomorph-inset p-4 text-center text-sm text-gray-500">
                      No vehicle details captured yet. Use the DVLA lookup in Step 1.
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Vehicle Type</label>
                    <select
                      value={formData.vehicle_type}
                      onChange={(e) => handleChange('vehicle_type', e.target.value)}
                      className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                    >
                      <option value="Car">Car</option>
                      <option value="Van">Van</option>
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="HGV">HGV</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Vehicle Location</label>
                    <AddressLookupInput
                      value={formData.vehicle_location}
                      onChange={handleVehicleLocationChange}
                      placeholder="Start typing address or where is the vehicle now..."
                      className="neomorph-inset"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Damage Description</label>
                    <Textarea
                      value={formData.vehicle_damage}
                      onChange={(e) => handleChange('vehicle_damage', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                      placeholder="Describe the damage..."
                    />
                  </div>

                  <div className="flex gap-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="unroadworthy"
                        checked={formData.unroadworthy}
                        onChange={(e) => handleCheckboxChange('unroadworthy', e.target.checked)}
                        className="w-5 h-5"
                      />
                      <label htmlFor="unroadworthy" className="text-sm text-gray-600">Vehicle is unroadworthy</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="recovery"
                        checked={formData.recovery_required}
                        onChange={(e) => handleCheckboxChange('recovery_required', e.target.checked)}
                        className="w-5 h-5"
                      />
                      <label htmlFor="recovery" className="text-sm text-gray-600">Recovery required</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Insurance */}
            {currentStep === getStepNumber("insurance") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Insurance Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Insurer</label>
                    <InsurerCombobox
                      value={formData.insurer}
                      onChange={(value) => handleChange('insurer', value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Claim Reference</label>
                    <Input
                      value={formData.claim_ref}
                      onChange={(e) => handleChange('claim_ref', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Policy Number</label>
                    <Input
                      value={formData.policy_number}
                      onChange={(e) => handleChange('policy_number', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Policy Excess (£)</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.policy_excess || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handleChange('policy_excess', value === '' ? 0 : parseFloat(value) || 0);
                        }
                      }}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step: Third Party (conditional) */}
            {formData.has_third_party && currentStep === getStepNumber("third_party") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Third Party Details</h3>
                <p className="text-sm text-gray-500 mb-4">Enter the details of the third party involved</p>

                {/* Third Party Contact Details */}
                <div className="neomorph-inset p-4 space-y-4">
                  <h4 className="font-semibold text-gray-700">Contact Details</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Third Party Name *</label>
                    {isInternalUser ? (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <ClientCombobox
                            value={formData.tp_name}
                            onChange={handleTPChange}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            console.log('TP plus button clicked, user:', currentUser);
                            if (!isInternalUser) {
                              alert('You do not have permission to add clients');
                              return;
                            }
                            setShowTPModal(true);
                          }}
                          className="neomorph-flat p-3"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <ClientCombobox
                        value={formData.tp_name}
                        onChange={handleTPChange}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Phone</label>
                      <Input
                        value={formData.tp_phone}
                        onChange={(e) => handleChange('tp_phone', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Email</label>
                      <Input
                        type="email"
                        value={formData.tp_email}
                        onChange={(e) => handleChange('tp_email', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Address Line 1</label>
                    <Input
                      value={formData.tp_address_line_1}
                      onChange={(e) => handleChange('tp_address_line_1', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Address Line 2</label>
                    <Input
                      value={formData.tp_address_line_2}
                      onChange={(e) => handleChange('tp_address_line_2', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Town</label>
                      <Input
                        value={formData.tp_town}
                        onChange={(e) => handleChange('tp_town', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">County</label>
                      <Input
                        value={formData.tp_county}
                        onChange={(e) => handleChange('tp_county', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Postcode</label>
                      <Input
                        value={formData.tp_postcode}
                        onChange={(e) => handleChange('tp_postcode', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Third Party Vehicle Details */}
                <div className="neomorph-inset p-4 space-y-4">
                  <h4 className="font-semibold text-gray-700">Vehicle Details</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Vehicle Registration</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          value={formData.tp_reg}
                          onChange={(e) => {
                            handleChange('tp_reg', e.target.value.toUpperCase());
                            setTpVehicleLookupError(null);
                          }}
                          className="neomorph-inset px-4 py-3 text-gray-700 border-0 text-lg flex-1"
                          placeholder="e.g. AB12 CDE"
                        />
                        <Button
                          type="button"
                          onClick={handleTPVehicleLookup}
                          disabled={isLookingUpTPVehicle || !formData.tp_reg || formData.tp_reg.length < 3}
                          className="neomorph-flat px-4 py-3 whitespace-nowrap"
                          title="Lookup vehicle details from DVLA"
                        >
                          {isLookingUpTPVehicle ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin mr-2" />
                              <span className="hidden sm:inline">Looking up...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Lookup</span>
                            </>
                          )}
                        </Button>
                      </div>
                      {tpVehicleLookupError && (
                        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-800 whitespace-pre-line">{tpVehicleLookupError}</p>
                        </div>
                      )}
                      {formData.tp_make_model && !tpVehicleLookupError && (
                        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-700">
                            ✓ <span className="font-bold">Vehicle found:</span>
                            <br />
                            <span className="font-bold text-base">{formData.tp_make_model}</span>
                            {formData.tp_vehicle_colour && <span className="font-normal"> • {formData.tp_vehicle_colour}</span>}
                            {formData.tp_vehicle_year_of_manufacture && <span className="font-normal"> • {formData.tp_vehicle_year_of_manufacture}</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Make/Model</label>
                      <Input
                        value={formData.tp_make_model}
                        onChange={(e) => handleChange('tp_make_model', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                        placeholder="e.g. Ford Focus"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Vehicle Type</label>
                      <select
                        value={formData.tp_vehicle_type}
                        onChange={(e) => handleChange('tp_vehicle_type', e.target.value)}
                        className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                      >
                        <option value="Car">Car</option>
                        <option value="Van">Van</option>
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="HGV">HGV</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Third Party Insurance Details */}
                <div className="neomorph-inset p-4 space-y-4">
                  <h4 className="font-semibold text-gray-700">Insurance Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Their Insurer</label>
                      <InsurerCombobox
                        value={formData.tp_insurer}
                        onChange={(value) => handleChange('tp_insurer', value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Their Claim Reference</label>
                      <Input
                        value={formData.tp_claim_ref}
                        onChange={(e) => handleChange('tp_claim_ref', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 mb-2">Their Policy Number</label>
                      <Input
                        value={formData.tp_policy_number}
                        onChange={(e) => handleChange('tp_policy_number', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Third Party Vehicle Damage */}
                <div className="neomorph-inset p-4 space-y-4">
                  <h4 className="font-semibold text-gray-700">Vehicle Damage</h4>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Third Party Damage Description</label>
                    <Textarea
                      value={formData.tp_vehicle_damage}
                      onChange={(e) => handleChange('tp_vehicle_damage', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0 min-h-[100px]"
                      placeholder="Describe the damage to the third party's vehicle..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NEW: Step: Indemnity (conditional) */}
            {formData.requires_indemnity && currentStep === getStepNumber("indemnity") && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Indemnity Details</h3>
                <p className="text-sm text-gray-500 mb-4">Please provide the following details for indemnity purposes.</p>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Driver's Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.indemnity_driver_dob}
                    onChange={(e) => handleChange('indemnity_driver_dob', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Registered Owner (Full Name)</label>
                  <Input
                    value={formData.indemnity_registered_owner}
                    onChange={(e) => handleChange('indemnity_registered_owner', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Any pending prosecutions?</label>
                  <Textarea
                    value={formData.indemnity_pending_prosecutions}
                    onChange={(e) => handleChange('indemnity_pending_prosecutions', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                    placeholder="Enter details or 'None'"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Any DVLA medical restrictions?</label>
                  <Textarea
                    value={formData.indemnity_dvla_medical_restrictions}
                    onChange={(e) => handleChange('indemnity_dvla_medical_restrictions', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                    placeholder="Enter details or 'None'"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Held full UK/EU license for 12+ months?</label>
                  <Textarea
                    value={formData.indemnity_full_license_12_months}
                    onChange={(e) => handleChange('indemnity_full_license_12_months', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                    placeholder="Enter details..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Motoring convictions/points in last 5 years?</label>
                  <Textarea
                    value={formData.indemnity_convictions_last_5_years}
                    onChange={(e) => handleChange('indemnity_convictions_last_5_years', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                    placeholder="Enter details or 'None'"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Vehicle Use at Time of Incident</label>
                  <Input
                    value={formData.indemnity_vehicle_use_at_incident}
                    onChange={(e) => handleChange('indemnity_vehicle_use_at_incident', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    placeholder="e.g., Personal, Commuting, Business"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Any vehicle modifications?</label>
                  <Textarea
                    value={formData.indemnity_vehicle_modifications}
                    onChange={(e) => handleChange('indemnity_vehicle_modifications', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                    placeholder="Enter details or 'None'"
                  />
                </div>
              </div>
            )}

            {/* Final Step: Review */}
            {currentStep === steps.length && (
              <div className="neomorph-flat p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Review & Create</h3>
                <p className="text-sm text-gray-500 mb-6">Check the details below. You can add bodyshop and other details after creating the claim.</p>

                <div className="space-y-4">
                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Vehicle Registration</p>
                    <p className="font-bold text-lg text-gold">{formData.reg}</p>
                  </div>

                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Claim Type</p>
                    <p className="font-medium text-gray-700">{formData.claim_type}</p>
                  </div>

                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Client</p>
                    <p className="font-medium text-gray-700">{formData.client_name || 'Not specified'}</p>
                  </div>

                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Vehicle</p>
                    <p className="font-medium text-gray-700">{formData.make_model || 'Not specified'}</p>
                  </div>

                  {/* Insurance is always a step, show if data exists */}
                  {formData.insurer && (
                    <div className="neomorph-inset p-4">
                      <p className="text-sm text-gray-500 mb-2">Insurer</p>
                      <p className="font-medium text-gray-700">{formData.insurer}</p>
                    </div>
                  )}

                  {/* Referrer is always a step, show if data exists */}
                  {formData.referrer && (
                    <div className="neomorph-inset p-4">
                      <p className="text-sm text-gray-500 mb-2">Referrer</p>
                      <p className="font-medium text-gray-700">{formData.referrer}</p>
                    </div>
                  )}

                  {formData.has_third_party && formData.tp_name && (
                    <div className="neomorph-inset p-4">
                      <p className="text-sm text-gray-500 mb-2">Third Party</p>
                      <p className="font-medium text-gray-700">{formData.tp_name}</p>
                    </div>
                  )}

                  {formData.requires_indemnity && (
                    <div className="neomorph-inset p-4">
                      <p className="text-sm text-gray-500 mb-2">Indemnity Required</p>
                      <p className="font-medium text-gray-700">Yes</p>
                    </div>
                  )}
                </div>

                <div className="neomorph-flat p-6">
                  <h4 className="font-semibold text-gray-700 mb-4">Upload Files (Optional)</h4>
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-purple-800">
                        <strong>AI Document Analysis:</strong> Upload invoices, repair quotes, or incident reports and click the sparkle icon to automatically extract and fill in claim details.
                      </p>
                    </div>
                  </div>
                  <FileUpload
                    value={Array.isArray(formData.file_urls) ? formData.file_urls : []}
                    onChange={(urls) => handleChange('file_urls', urls)}
                    enableAI={true}
                    analysisType="claim"
                    onAIExtract={handleAIExtract}
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 && (
                <Button
                  type="button"
                  onClick={prevStep}
                  className="neomorph-flat px-6 py-3 font-medium text-gray-700 transition-all active:neomorph-pressed flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}

              <div className="flex-1" />

              {currentStep < steps.length && (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="neomorph-flat px-6 py-3 font-medium text-blue-600 transition-all active:neomorph-pressed flex items-center gap-2"
                  disabled={currentStep === getStepNumber("basic") && !formData.reg}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {currentStep === steps.length && (
                <Button
                  type="submit"
                  className="neomorph-flat px-8 py-3 font-medium text-gold transition-all active:neomorph-pressed flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Create Claim
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}