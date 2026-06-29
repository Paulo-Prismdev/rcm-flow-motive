import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertCircle, User, Car, Building2, Phone } from 'lucide-react';
import { REQUIRED_FIELDS } from './WizardConstants';

export default function WizardValidateStep({
  claim, validationData, missingFields, contactType, customContact,
  authorisedBy, onContactTypeChange, onAuthorisedByChange, onCustomContactChange,
  onValidationChange, onSaveDefaults
}) {
  const [showDriverFields, setShowDriverFields] = useState(false);

  useEffect(() => {
    setShowDriverFields(!claim.driver_same_as_client);
  }, [claim.driver_same_as_client]);

  const contactOptions = [
    {
      value: 'client',
      label: 'Client',
      icon: User,
      description: 'Use client details',
      details: (validationData.client_name || claim.client_name)
        ? `${validationData.client_name || claim.client_name}${(validationData.client_phone || claim.client_phone) ? ' — ' + (validationData.client_phone || claim.client_phone) : ''}`
        : 'No client details',
      disabled: false
    },
    {
      value: 'driver',
      label: 'Driver / Contact',
      icon: Car,
      description: claim.driver_same_as_client ? 'Same as client' : 'Use driver details',
      details: (!claim.driver_same_as_client && (claim.driver_contact_name || validationData.driver_contact_name))
        ? `${claim.driver_contact_name || validationData.driver_contact_name}${(claim.driver_contact_phone || validationData.driver_contact_phone) ? ' — ' + (claim.driver_contact_phone || validationData.driver_contact_phone) : ''}`
        : (claim.driver_same_as_client ? 'Same as client' : 'Add driver details to claim'),
      disabled: claim.driver_same_as_client
    },
    {
      value: 'custom',
      label: 'Custom',
      icon: Phone,
      description: 'Enter custom details',
      details: customContact.name ? `${customContact.name}${customContact.phone ? ' — ' + customContact.phone : ''}` : null,
      disabled: false
    },
  ];

  const insurerOptions = [
    {
      value: 'Client Insurer',
      label: 'Client\'s Insurer',
      icon: Building2,
      subtitle: (claim.insurer)
        ? `${claim.insurer} — ${claim.claim_ref || 'No claim ref'}`
        : 'No insurer on file',
      disabled: !claim.insurer
    },
    {
      value: 'Third Party Insurer',
      label: 'Third Party Insurer',
      icon: Building2,
      subtitle: (claim.tp_insurer)
        ? `${claim.tp_insurer} — ${claim.tp_claim_ref || 'No claim ref'}`
        : 'No TP insurer on file',
      disabled: !claim.tp_insurer
    },
    {
      value: 'Uninsured',
      label: 'Uninsured / Client Direct',
      icon: Building2,
      subtitle: 'No insurer — client paying directly',
      disabled: false
    },
  ];

  const isClientInsurer = authorisedBy === 'Client Insurer';
  const isThirdPartyInsurer = authorisedBy === 'Third Party Insurer';
  const isUninsured = authorisedBy === 'Uninsured';

  const getInsurerFields = () => {
    if (isClientInsurer) {
      return {
        insurer_name: claim.insurer || '',
        claim_ref: claim.claim_ref || '',
        policy_number: claim.policy_number || '',
        policy_excess: claim.policy_excess || '0',
        audatex_code: claim.audatex_code || '',
        send_estimate_email: claim.send_estimate_email || '',
      };
    }
    if (isThirdPartyInsurer) {
      return {
        insurer_name: claim.tp_insurer || '',
        claim_ref: claim.tp_claim_ref || '',
        policy_number: claim.tp_policy_number || '',
        policy_excess: claim.tp_policy_excess || '0',
        audatex_code: '',
        send_estimate_email: '',
      };
    }
    return {
      insurer_name: '',
      claim_ref: '',
      policy_number: '',
      policy_excess: claim.policy_excess || '0',
      audatex_code: '',
      send_estimate_email: '',
    };
  };

  const insurerFields = getInsurerFields();

  const isFieldRequired = (fieldKey) => {
    if (!isClientInsurer) return false;
    return ['send_estimate_email', 'audatex_code'].includes(fieldKey);
  };

  const handleDriverSameAsClientChange = (value) => {
    const newValue = value;
    if (newValue) {
      setShowDriverFields(false);
      onValidationChange('driver_contact_name', validationData.client_name || claim.client_name || '');
      onValidationChange('driver_contact_phone', validationData.client_phone || claim.client_phone || '');
      onValidationChange('driver_contact_email', validationData.client_email || claim.client_email || '');
      if (contactType === 'driver') {
        onContactTypeChange('client');
      }
    } else {
      setShowDriverFields(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authorising Insurer Selection */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="mb-4">
          <h3 className="font-bold text-lg mb-2">Who is authorising the repair?</h3>
          <p className="text-sm text-muted-foreground">
            Select which insurer will authorise the repairs. This determines which insurance details appear on the instruction.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {insurerOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => !option.disabled && onAuthorisedByChange(option.label)}
                disabled={option.disabled}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  (authorisedBy === option.label || authorisedBy === option.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-gray-300'
                } ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start gap-2">
                  <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    (authorisedBy === option.label || authorisedBy === option.value) ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{option.subtitle}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instruction Contact Selection */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="mb-4">
          <h3 className="font-bold text-lg mb-2">Instruction Contact</h3>
          <p className="text-sm text-muted-foreground">
            Who should the repairer contact for drop-off, updates and collection?
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {contactOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => !option.disabled && onContactTypeChange(option.value)}
                disabled={option.disabled}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  contactType === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-gray-300'
                } ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start gap-2">
                  <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    contactType === option.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                    {option.details && <p className="text-[11px] text-muted-foreground mt-1 truncate">{option.details}</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {contactType === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-lg bg-muted">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Contact Name</label>
              <Input value={customContact.name} onChange={(e) => onCustomContactChange('name', e.target.value)} placeholder="Enter name..." />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Contact Phone</label>
              <Input value={customContact.phone} onChange={(e) => onCustomContactChange('phone', e.target.value)} placeholder="Enter phone..." />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Contact Email</label>
              <Input type="email" value={customContact.email} onChange={(e) => onCustomContactChange('email', e.target.value)} placeholder="Enter email..." />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Insurance Fields */}
      {!isUninsured && (
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-bold text-lg mb-3">Insurance Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Insurer Name</label>
              <Input
                value={insurerFields.insurer_name}
                onChange={(e) => {
                  if (isClientInsurer) onValidationChange('insurer', e.target.value);
                  else if (isThirdPartyInsurer) onValidationChange('tp_insurer', e.target.value);
                }}
                placeholder={isClientInsurer ? "Enter insurer name" : isThirdPartyInsurer ? "Enter TP insurer name" : "Enter insurer name"}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Claim Reference {isClientInsurer && '*'}</label>
              <Input
                value={insurerFields.claim_ref}
                onChange={(e) => {
                  if (isClientInsurer) onValidationChange('claim_ref', e.target.value);
                  else if (isThirdPartyInsurer) onValidationChange('tp_claim_ref', e.target.value);
                }}
                placeholder={isClientInsurer ? "Enter claim reference" : "Enter TP claim reference"}
                className={isFieldRequired('claim_ref') && !insurerFields.claim_ref ? 'border-red-300 bg-red-50' : ''}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Policy Number</label>
              <Input
                value={insurerFields.policy_number}
                onChange={(e) => {
                  if (isClientInsurer) onValidationChange('policy_number', e.target.value);
                  else if (isThirdPartyInsurer) onValidationChange('tp_policy_number', e.target.value);
                }}
                placeholder={isClientInsurer ? "Enter policy number" : "Enter TP policy number"}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Policy Excess (£)</label>
              <Input
                type="text"
                value={insurerFields.policy_excess}
                onChange={(e) => {
                  if (isClientInsurer) onValidationChange('policy_excess', e.target.value);
                  else if (isThirdPartyInsurer) onValidationChange('tp_policy_excess', e.target.value);
                }}
                placeholder="Enter amount or 'Waived'"
              />
            </div>
            {isClientInsurer && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Email Estimate To *</label>
                  <Input
                    type="email"
                    value={insurerFields.send_estimate_email}
                    onChange={(e) => onValidationChange('send_estimate_email', e.target.value)}
                    placeholder="Enter email address"
                    className={isFieldRequired('send_estimate_email') && !insurerFields.send_estimate_email ? 'border-red-300 bg-red-50' : ''}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Audatex Code *</label>
                  <Input
                    value={insurerFields.audatex_code}
                    onChange={(e) => onValidationChange('audatex_code', e.target.value)}
                    placeholder="Enter Audatex code"
                    className={isFieldRequired('audatex_code') && !insurerFields.audatex_code ? 'border-red-300 bg-red-50' : ''}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Policy Excess for Uninsured */}
      {isUninsured && (
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-bold text-lg mb-3">Policy Excess</h3>
          <div className="max-w-xs">
            <label className="block text-xs text-muted-foreground mb-1">Policy Excess (£)</label>
            <Input
              type="text"
              value={insurerFields.policy_excess}
              onChange={(e) => onValidationChange('policy_excess', e.target.value)}
              placeholder="Enter amount or 'Waived'"
            />
          </div>
        </div>
      )}

      {/* Missing Required Fields — inline editable */}
      {missingFields.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Pre-Allocation Checklist</h4>
              <p className="text-sm text-amber-700 mt-1">
                The following fields must be completed before allocating to a repairer:
              </p>
            </div>
          </div>
          <div className="space-y-3 ml-8">
            {missingFields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-amber-800 mb-1">{field.label} *</label>
                {field.type === 'select' ? (
                  <select
                    value={validationData[field.key] || ''}
                    onChange={(e) => onValidationChange(field.key, e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-amber-300 bg-white text-sm"
                  >
                    <option value="">Select {field.label}...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <Input
                    type={field.type === 'email' ? 'email' : 'text'}
                    value={validationData[field.key] || ''}
                    onChange={(e) => onValidationChange(field.key, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="border-amber-300 bg-white"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {missingFields.length === 0 && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">All required fields are complete. You can proceed to select a repairer.</p>
        </div>
      )}
    </div>
  );
}