import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertCircle, User, Car, Pencil } from 'lucide-react';
import CustomSelect from '@/components/shared/CustomSelect';
import { REQUIRED_FIELDS } from './WizardConstants';

export default function WizardValidateStep({
  claim, validationData, missingFields, contactType, customContact,
  onValidationChange, onContactTypeChange, onCustomContactChange
}) {
  const contactOptions = [
    {
      value: 'client', label: 'Client', icon: User, description: 'Use client details',
      details: (validationData.client_name || claim.client_name)
        ? `${validationData.client_name || claim.client_name}${(validationData.client_phone || claim.client_phone) ? ' — ' + (validationData.client_phone || claim.client_phone) : ''}`
        : 'No client details'
    },
    {
      value: 'driver', label: 'Driver / Repair Contact', icon: Car, description: 'Use driver details',
      disabled: !claim.driver_contact_name,
      details: claim.driver_contact_name
        ? `${claim.driver_contact_name}${claim.driver_contact_phone ? ' — ' + claim.driver_contact_phone : ''}`
        : 'No driver details on file'
    },
    { value: 'custom', label: 'Custom', icon: Pencil, description: 'Enter custom details', details: null },
  ];

  return (
    <div className="space-y-4">
      {/* Instruction Contact */}
      <div>
        <h3 className="font-bold text-lg mb-2">Instruction Contact</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Who should the repairer contact for drop-off, updates and collection?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${contactType === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 mt-3 rounded-lg bg-muted">
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

      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Pre-Allocation Checklist</h4>
            <p className="text-sm text-amber-700 mt-1">
              Please ensure all required fields are completed before allocating to a repairer.
              {missingFields.length > 0 && <span className="font-medium"> {missingFields.length} field(s) need attention.</span>}
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
                {isMissing ? <AlertCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                {field.label}
                {isMissing && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'select' && (
                <CustomSelect value={value || ''} onChange={(v) => onValidationChange(field.key, v)} options={field.options.map(opt => ({ value: opt, label: opt }))} className="bg-white" />
              )}
              {field.type === 'text' && (
                <Input value={value || ''} onChange={(e) => onValidationChange(field.key, e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} className="bg-white" />
              )}
              {field.type === 'email' && (
                <Input type="email" value={value || ''} onChange={(e) => onValidationChange(field.key, e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} className="bg-white" />
              )}
              {field.type === 'number' && (
                <Input type="number" value={value || ''} onChange={(e) => onValidationChange(field.key, e.target.value ? parseFloat(e.target.value) : '')} placeholder={`Enter ${field.label.toLowerCase()}`} className="bg-white" />
              )}
              {field.type === 'textarea' && (
                <Textarea value={value || ''} onChange={(e) => onValidationChange(field.key, e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} className="bg-white min-h-[80px]" />
              )}
              {field.type === 'boolean' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={value || false} onChange={(e) => onValidationChange(field.key, e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
                  <span className="text-sm text-muted-foreground">Yes</span>
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
  );
}