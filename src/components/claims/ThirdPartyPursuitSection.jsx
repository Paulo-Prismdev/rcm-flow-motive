import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, UserPlus, ExternalLink, Check, X, Search, Loader, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { formatUKRegistration } from '../shared/formatRegistration';

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
    tp_insurer: claim.tp_insurer || '',
    tp_policy_number: claim.tp_policy_number || '',
    tp_address_line_1: claim.tp_address_line_1 || '',
    tp_town: claim.tp_town || '',
    tp_postcode: claim.tp_postcode || '',
    tp_vehicle_damage: claim.tp_vehicle_damage || '',
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
      // Create the new third-party claim
      const newClaim = await base44.entities.Claim.create({
        claim_type: 'Third Party',
        linked_original_claim_id: claim.id,
        // Third party becomes the client
        client_name: tpData.tp_name,
        client_phone: tpData.tp_phone,
        client_email: tpData.tp_email,
        client_address_line_1: tpData.tp_address_line_1,
        client_town: tpData.tp_town,
        client_postcode: tpData.tp_postcode,
        // Their vehicle details
        reg: tpData.tp_reg,
        make_model: tpData.tp_make_model,
        vehicle_damage: tpData.tp_vehicle_damage,
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
      // Update original claim with link and status
      onUpdate({
        ...claim,
        linked_third_party_claim_id: newClaim.id,
        third_party_pursuit_status: 'Claim Created',
        // Also save the TP details to original claim
        ...tpFormData,
      });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setIsCreatingClaim(false);
    },
  });

  const updateTPDetailsMutation = useMutation({
    mutationFn: async () => {
      return onUpdate({
        ...claim,
        ...tpFormData,
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              value={tpFormData.tp_email}
              onChange={(e) => handleInputChange('tp_email', e.target.value)}
              placeholder="Email address"
              className="neomorph-inset"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Vehicle Registration</label>
            <div className="flex gap-2">
              <Input
                value={tpFormData.tp_reg}
                onChange={(e) => {
                  handleInputChange('tp_reg', e.target.value.toUpperCase());
                  setVehicleLookupError(null);
                }}
                placeholder="e.g. AB12 CDE"
                className="neomorph-inset flex-1"
              />
              <Button
                type="button"
                onClick={handleVehicleLookup}
                disabled={isLookingUpVehicle || !tpFormData.tp_reg || tpFormData.tp_reg.length < 3}
                className="neomorph-flat px-4 py-2"
                title="Lookup vehicle details from DVLA"
              >
                {isLookingUpVehicle ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Lookup
                  </>
                )}
              </Button>
            </div>
            {vehicleLookupError && (
              <p className="text-xs text-orange-600 mt-1">{vehicleLookupError}</p>
            )}
            {tpFormData.tp_make_model && !vehicleLookupError && (
              <p className="text-xs text-green-600 mt-1">✓ {tpFormData.tp_make_model}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Vehicle Make/Model</label>
            <Input
              value={tpFormData.tp_make_model}
              onChange={(e) => handleInputChange('tp_make_model', e.target.value)}
              placeholder="e.g. Ford Focus"
              className="neomorph-inset"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Their Insurer</label>
            <Input
              value={tpFormData.tp_insurer}
              onChange={(e) => handleInputChange('tp_insurer', e.target.value)}
              placeholder="Insurance company"
              className="neomorph-inset"
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
          <div>
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Address</label>
            <Input
              value={tpFormData.tp_address_line_1}
              onChange={(e) => handleInputChange('tp_address_line_1', e.target.value)}
              placeholder="Street address"
              className="neomorph-inset"
            />
          </div>
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
            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Postcode</label>
            <Input
              value={tpFormData.tp_postcode}
              onChange={(e) => handleInputChange('tp_postcode', e.target.value.toUpperCase())}
              placeholder="Postcode"
              className="neomorph-inset"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Their Vehicle Damage</label>
          <Textarea
            value={tpFormData.tp_vehicle_damage}
            onChange={(e) => handleInputChange('tp_vehicle_damage', e.target.value)}
            placeholder="Describe the damage to the third party's vehicle"
            className="neomorph-inset"
            rows={3}
          />
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