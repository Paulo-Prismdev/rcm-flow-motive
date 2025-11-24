import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, UserPlus, ExternalLink, Check, X, Search, Loader, XCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { formatUKRegistration } from '../shared/formatRegistration';
import ClientCombobox from '../shared/ClientCombobox';
import InsurerCombobox from '../shared/InsurerCombobox';
import AddressLookupInput from '../shared/AddressLookupInput';

export default function ThirdPartyPursuitSection({ claim, onUpdate }) {
  const [isCreatingClaim, setIsCreatingClaim] = useState(false);
  const [isRejectingCapture, setIsRejectingCapture] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isLookingUpVehicle, setIsLookingUpVehicle] = useState(false);
  const [vehicleLookupError, setVehicleLookupError] = useState(null);
  const [tpFormData, setTpFormData] = useState({
    tp_name: claim.tp_name || '',
    tp_phone: claim.tp_phone || '',
    tp_email: claim.tp_email || '',
    tp_reg: claim.tp_reg || '',
    tp_make_model: claim.tp_make_model || '',
    tp_vehicle_make: claim.tp_vehicle_make || '',
    tp_vehicle_model: claim.tp_vehicle_model || '',
    tp_vehicle_colour: claim.tp_vehicle_colour || '',
    tp_vehicle_year: claim.tp_vehicle_year || '',
    tp_vehicle_fuel_type: claim.tp_vehicle_fuel_type || '',
    tp_vehicle_engine_capacity: claim.tp_vehicle_engine_capacity || '',
    tp_insurer: claim.tp_insurer || '',
    tp_policy_number: claim.tp_policy_number || '',
    tp_address_line_1: claim.tp_address_line_1 || '',
    tp_address_line_2: claim.tp_address_line_2 || '',
    tp_town: claim.tp_town || '',
    tp_county: claim.tp_county || '',
    tp_postcode: claim.tp_postcode || '',
    tp_vehicle_damage: claim.tp_vehicle_damage || '',
    tp_vehicle_location: claim.tp_vehicle_location || '',
  });
  
  const queryClient = useQueryClient();

  // Vehicle lookup for third party
  const handleVehicleLookup = async () => {
    if (!tpFormData.tp_reg || tpFormData.tp_reg.trim().length < 3) {
      setVehicleLookupError('Please enter a valid registration number');
      return;
    }

    setIsLookingUpVehicle(true);
    setVehicleLookupError(null);

    try {
      const response = await base44.functions.invoke('lookupVehicleData', {
        registrationNumber: tpFormData.tp_reg,
      });

      const result = response.data;

      if (result.success) {
        setTpFormData(prev => ({
          ...prev,
          tp_make_model: result.make_model || '',
          tp_vehicle_make: result.make || '',
          tp_vehicle_model: result.model || '',
          tp_vehicle_colour: result.colour || '',
          tp_vehicle_year: result.year_of_manufacture || '',
          tp_vehicle_fuel_type: result.fuel_type || '',
          tp_vehicle_engine_capacity: result.engine_capacity || '',
        }));
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

  // Reject third party capture
  const handleRejectCapture = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for not capturing third party details');
      return;
    }
    
    onUpdate({
      ...claim,
      third_party_pursuit_status: 'N/A',
      tp_capture_rejected_reason: rejectReason,
    });
    setIsRejectingCapture(false);
    setRejectReason('');
  };

  // Handle client selection from combobox
  const handleClientSelect = (client) => {
    setTpFormData(prev => ({
      ...prev,
      tp_name: client.name || '',
      tp_phone: client.phone || '',
      tp_email: client.email || '',
      tp_address_line_1: client.address_line_1 || '',
      tp_address_line_2: client.address_line_2 || '',
      tp_town: client.town || '',
      tp_county: client.county || '',
      tp_postcode: client.postcode || '',
    }));
  };

  // Handle vehicle location change
  const handleVehicleLocationChange = (addressData) => {
    setTpFormData(prev => ({
      ...prev,
      tp_vehicle_location: addressData.display_name || addressData.address || '',
    }));
  };

  // Check if third party details are sufficient
  const hasTPDetails = claim.tp_name && (claim.tp_phone || claim.tp_email);

  // Fetch linked third party claim if exists
  const { data: linkedTPClaim } = useQuery({
    queryKey: ['claim', claim.linked_third_party_claim_id],
    queryFn: () => claim.linked_third_party_claim_id 
      ? base44.entities.Claim.get(claim.linked_third_party_claim_id) 
      : null,
    enabled: !!claim.linked_third_party_claim_id,
  });

  // Fetch original claim if this is a TP claim
  const { data: linkedOriginalClaim } = useQuery({
    queryKey: ['claim', claim.linked_original_claim_id],
    queryFn: () => claim.linked_original_claim_id 
      ? base44.entities.Claim.get(claim.linked_original_claim_id) 
      : null,
    enabled: !!claim.linked_original_claim_id,
  });

  const createTPClaimMutation = useMutation({
    mutationFn: async (tpData) => {
      // Generate job number for the new claim
      let jobNumber = '';
      try {
        const response = await base44.functions.invoke('generateJobNumber', {
          entityType: 'Claim'
        });
        if (response.data.success) {
          jobNumber = response.data.job_number;
        }
      } catch (error) {
        console.error('Failed to generate job number:', error);
      }

      // Create the new third-party claim with full mapping matching Claim entity fields
      const newClaim = await base44.entities.Claim.create({
        job_number: jobNumber,
        claim_type: 'Third Party',
        linked_original_claim_id: claim.id,
        // Third party becomes the client - full address mapping
        client_name: tpData.tp_name,
        client_phone: tpData.tp_phone,
        client_email: tpData.tp_email,
        client_address_line_1: tpData.tp_address_line_1,
        client_address_line_2: tpData.tp_address_line_2,
        client_town: tpData.tp_town,
        client_county: tpData.tp_county,
        client_postcode: tpData.tp_postcode,
        // Their vehicle details - full mapping to Claim vehicle fields
        reg: tpData.tp_reg,
        make_model: tpData.tp_make_model,
        vehicle_make: tpData.tp_vehicle_make,
        vehicle_model: tpData.tp_vehicle_model,
        vehicle_colour: tpData.tp_vehicle_colour,
        vehicle_fuel_type: tpData.tp_vehicle_fuel_type,
        vehicle_year_of_manufacture: tpData.tp_vehicle_year ? parseInt(tpData.tp_vehicle_year) : null,
        vehicle_engine_capacity: tpData.tp_vehicle_engine_capacity ? parseInt(tpData.tp_vehicle_engine_capacity) : null,
        vehicle_damage: tpData.tp_vehicle_damage,
        vehicle_location: tpData.tp_vehicle_location,
        // Insurance
        insurer: tpData.tp_insurer,
        policy_number: tpData.tp_policy_number,
        // Copy relevant info from original claim
        loss_date: claim.loss_date,
        loss_time: claim.loss_time,
        incident_location: claim.incident_location,
        circumstances: claim.circumstances,
        job_status: 'New',
        date_received: new Date().toISOString().split('T')[0],
      });
      
      return newClaim;
    },
    onSuccess: (newClaim) => {
      // Update original claim with link and status, mapping all TP fields
      onUpdate({
        ...claim,
        linked_third_party_claim_id: newClaim.id,
        third_party_pursuit_status: 'Claim Created',
        // Save all TP details to original claim
        tp_name: tpFormData.tp_name,
        tp_phone: tpFormData.tp_phone,
        tp_email: tpFormData.tp_email,
        tp_reg: tpFormData.tp_reg,
        tp_make_model: tpFormData.tp_make_model,
        tp_insurer: tpFormData.tp_insurer,
        tp_policy_number: tpFormData.tp_policy_number,
        tp_address_line_1: tpFormData.tp_address_line_1,
        tp_address_line_2: tpFormData.tp_address_line_2,
        tp_town: tpFormData.tp_town,
        tp_county: tpFormData.tp_county,
        tp_postcode: tpFormData.tp_postcode,
        tp_vehicle_damage: tpFormData.tp_vehicle_damage,
        tp_vehicle_location: tpFormData.tp_vehicle_location,
      });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setIsCreatingClaim(false);
    },
  });

  const updateTPDetailsMutation = useMutation({
    mutationFn: async () => {
      return onUpdate({
        ...claim,
        tp_name: tpFormData.tp_name,
        tp_phone: tpFormData.tp_phone,
        tp_email: tpFormData.tp_email,
        tp_reg: tpFormData.tp_reg,
        tp_make_model: tpFormData.tp_make_model,
        tp_insurer: tpFormData.tp_insurer,
        tp_policy_number: tpFormData.tp_policy_number,
        tp_address_line_1: tpFormData.tp_address_line_1,
        tp_address_line_2: tpFormData.tp_address_line_2,
        tp_town: tpFormData.tp_town,
        tp_county: tpFormData.tp_county,
        tp_postcode: tpFormData.tp_postcode,
        tp_vehicle_damage: tpFormData.tp_vehicle_damage,
        tp_vehicle_location: tpFormData.tp_vehicle_location,
        third_party_pursuit_status: 'Details Obtained',
      });
    },
    onSuccess: () => {
      setIsCreatingClaim(false);
    },
  });

  const handleInputChange = (field, value) => {
    setTpFormData(prev => ({ ...prev, [field]: value }));
  };

  const openLinkedClaim = (claimId) => {
    window.open(`/claims?id=${claimId}`, '_blank');
  };

  // Don't show for non-fault claims
  if (claim.claim_type !== 'Fault Claim') {
    return null;
  }

  // If rejected, show the reason
  if (claim.third_party_pursuit_status === 'N/A' && claim.tp_capture_rejected_reason) {
    return (
      <div className="neomorph-flat p-4 md:p-6 border-l-4 border-gray-400">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-5 h-5 text-gray-500" />
          <h3 className="font-bold">Third-Party Capture Not Required</h3>
        </div>
        <div className="neomorph-inset p-3 rounded-lg">
          <p className="text-xs font-semibold text-foreground-muted mb-1">Reason:</p>
          <p className="text-sm">{claim.tp_capture_rejected_reason}</p>
        </div>
        <Button
          onClick={() => {
            onUpdate({
              ...claim,
              third_party_pursuit_status: 'Awaiting Details',
              tp_capture_rejected_reason: '',
            });
          }}
          className="neomorph-flat px-4 py-2 mt-4 text-sm"
        >
          Re-enable Third Party Capture
        </Button>
      </div>
    );
  }

  // If a TP claim already exists, show the link
  if (claim.linked_third_party_claim_id && linkedTPClaim) {
    return (
      <div className="neomorph-flat p-4 md:p-6 border-l-4 border-green-500">
        <div className="flex items-center gap-3 mb-4">
          <Check className="w-5 h-5 text-green-500" />
          <h3 className="font-bold">Third-Party Claim Created</h3>
        </div>
        <p className="text-sm text-foreground-muted mb-4">
          A separate claim has been created to manage the third-party's repairs.
        </p>
        <button
          onClick={() => openLinkedClaim(linkedTPClaim.id)}
          className="neomorph-flat px-4 py-2 text-sm hover:neomorph transition-all cursor-pointer flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          <span>View Third-Party Claim: </span>
          <span className="font-medium text-accent">
            {linkedTPClaim.job_number || formatUKRegistration(linkedTPClaim.reg) || 'View Claim'}
          </span>
        </button>
      </div>
    );
  }

  // Show the creation form
  if (isCreatingClaim) {
    return (
      <div className="neomorph-flat p-4 md:p-6 border-l-4 border-amber-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold">Third-Party Details</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCreatingClaim(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-sm text-foreground-muted mb-4">
          Enter the third-party's details. Once saved, you can create a separate claim to manage their repairs.
        </p>

        {/* Third Party Client Details */}
        <div className="neomorph-inset p-4 mb-4">
          <h4 className="font-semibold text-sm mb-3">Third Party Details</h4>
          
          <div className="mb-3">
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Search Existing Client</label>
            <ClientCombobox
              value={tpFormData.tp_name}
              onChange={handleClientSelect}
            />
            <p className="text-xs text-foreground-muted mt-1">Select existing or enter details below</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Name *</label>
              <Input
                value={tpFormData.tp_name}
                onChange={(e) => handleInputChange('tp_name', e.target.value)}
                placeholder="Third party name"
                className="neomorph-inset"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Phone</label>
              <Input
                value={tpFormData.tp_phone}
                onChange={(e) => handleInputChange('tp_phone', e.target.value)}
                placeholder="Phone number"
                className="neomorph-inset"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Email</label>
              <Input
                type="email"
                value={tpFormData.tp_email}
                onChange={(e) => handleInputChange('tp_email', e.target.value)}
                placeholder="Email address"
                className="neomorph-inset"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Address Line 1</label>
            <Input
              value={tpFormData.tp_address_line_1}
              onChange={(e) => handleInputChange('tp_address_line_1', e.target.value)}
              placeholder="Street address"
              className="neomorph-inset"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Address Line 2</label>
            <Input
              value={tpFormData.tp_address_line_2}
              onChange={(e) => handleInputChange('tp_address_line_2', e.target.value)}
              placeholder="Optional"
              className="neomorph-inset"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Town/City</label>
              <Input
                value={tpFormData.tp_town}
                onChange={(e) => handleInputChange('tp_town', e.target.value)}
                placeholder="Town or city"
                className="neomorph-inset"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">County</label>
              <Input
                value={tpFormData.tp_county}
                onChange={(e) => handleInputChange('tp_county', e.target.value)}
                placeholder="County"
                className="neomorph-inset"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Postcode</label>
              <Input
                value={tpFormData.tp_postcode}
                onChange={(e) => handleInputChange('tp_postcode', e.target.value.toUpperCase())}
                placeholder="Postcode"
                className="neomorph-inset"
              />
            </div>
          </div>
        </div>

        {/* Third Party Vehicle Details */}
        <div className="neomorph-inset p-4 mb-4">
          <h4 className="font-semibold text-sm mb-3">Third Party Vehicle</h4>
          
          <div className="mb-3">
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Vehicle Registration</label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={tpFormData.tp_reg}
                  onChange={(e) => {
                    handleInputChange('tp_reg', e.target.value.toUpperCase());
                    setVehicleLookupError(null);
                  }}
                  placeholder="e.g. AB12 CDE"
                  className="neomorph-inset flex-1 text-lg"
                />
                <Button
                  type="button"
                  onClick={handleVehicleLookup}
                  disabled={isLookingUpVehicle || !tpFormData.tp_reg || tpFormData.tp_reg.length < 3}
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
              {tpFormData.tp_make_model && !vehicleLookupError && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-green-700">
                    <p className="font-bold mb-1">✓ Vehicle found:</p>
                    <p className="font-bold text-base">{tpFormData.tp_make_model}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                      {tpFormData.tp_vehicle_colour && (
                        <div><span className="text-green-600">Colour:</span> {tpFormData.tp_vehicle_colour}</div>
                      )}
                      {tpFormData.tp_vehicle_year && (
                        <div><span className="text-green-600">Year:</span> {tpFormData.tp_vehicle_year}</div>
                      )}
                      {tpFormData.tp_vehicle_fuel_type && (
                        <div><span className="text-green-600">Fuel:</span> {tpFormData.tp_vehicle_fuel_type}</div>
                      )}
                      {tpFormData.tp_vehicle_engine_capacity && (
                        <div><span className="text-green-600">Engine:</span> {tpFormData.tp_vehicle_engine_capacity}cc</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Make/Model</label>
              <Input
                value={tpFormData.tp_make_model}
                onChange={(e) => handleInputChange('tp_make_model', e.target.value)}
                placeholder="e.g. Ford Focus"
                className="neomorph-inset"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Vehicle Location</label>
              <AddressLookupInput
                value={tpFormData.tp_vehicle_location}
                onChange={handleVehicleLocationChange}
                placeholder="Where is the vehicle now?"
                className="neomorph-inset"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Vehicle Damage</label>
            <Textarea
              value={tpFormData.tp_vehicle_damage}
              onChange={(e) => handleInputChange('tp_vehicle_damage', e.target.value)}
              placeholder="Describe the damage to the third party's vehicle"
              className="neomorph-inset"
              rows={3}
            />
          </div>
        </div>

        {/* Third Party Insurance */}
        <div className="neomorph-inset p-4 mb-4">
          <h4 className="font-semibold text-sm mb-3">Third Party Insurance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Their Insurer</label>
              <InsurerCombobox
                value={tpFormData.tp_insurer}
                onChange={(value) => handleInputChange('tp_insurer', value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1 block">Their Policy Number</label>
              <Input
                value={tpFormData.tp_policy_number}
                onChange={(e) => handleInputChange('tp_policy_number', e.target.value)}
                placeholder="Policy number"
                className="neomorph-inset"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => updateTPDetailsMutation.mutate()}
            disabled={!tpFormData.tp_name || updateTPDetailsMutation.isPending}
            className="neomorph-flat px-4 py-2"
          >
            Save Details Only
          </Button>
          <Button
            onClick={() => createTPClaimMutation.mutate(tpFormData)}
            disabled={!tpFormData.tp_name || createTPClaimMutation.isPending}
            className="neomorph-flat px-4 py-2 bg-accent/10 text-accent font-medium"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Save & Create Third-Party Claim
          </Button>
        </div>
      </div>
    );
  }

  // Default: Show the prompt banner
  return (
    <div className="neomorph-flat p-4 md:p-6 border-l-4 border-amber-500">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold">Third-Party Pursuit Required</h3>
      </div>
      <p className="text-sm text-foreground-muted mb-4">
        This is a fault claim. You need to obtain the third-party's details to pursue their repairs separately.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-foreground-muted">Status:</span>
        <span className={`neomorph-flat px-2 py-1 text-xs font-medium ${
          claim.third_party_pursuit_status === 'Awaiting Details' 
            ? 'text-amber-600' 
            : claim.third_party_pursuit_status === 'Details Obtained'
            ? 'text-blue-600'
            : 'text-gray-600'
        }`}>
          {claim.third_party_pursuit_status || 'Awaiting Details'}
        </span>
      </div>
      {hasTPDetails && (
        <div className="neomorph-inset p-3 rounded-lg mb-4">
          <p className="text-xs font-semibold text-foreground-muted mb-2">Current Third-Party Info:</p>
          <p className="text-sm">{claim.tp_name} {claim.tp_phone && `• ${claim.tp_phone}`}</p>
        </div>
      )}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => setIsCreatingClaim(true)}
          className="neomorph-flat px-4 py-2 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {hasTPDetails ? 'Review Details & Create Claim' : 'Enter Third-Party Details'}
        </Button>
        <Button
          onClick={() => setIsRejectingCapture(true)}
          className="neomorph-flat px-4 py-2 flex items-center gap-2 text-gray-600"
        >
          <XCircle className="w-4 h-4" />
          Not Applicable
        </Button>
      </div>

      {isRejectingCapture && (
        <div className="mt-4 neomorph-inset p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Why is third-party capture not applicable?</p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Third party details unavailable, Single vehicle accident, etc."
            className="neomorph-inset mb-3"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleRejectCapture}
              className="neomorph-flat px-4 py-2 text-sm"
            >
              Confirm
            </Button>
            <Button
              onClick={() => {
                setIsRejectingCapture(false);
                setRejectReason('');
              }}
              className="neomorph-flat px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}