import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ClaimIndemnityFields({ formData, handleChange }) {
  return (
    <div className="neomorph-flat p-6 space-y-4">
      <h3 className="font-bold text-gray-700 mb-4">Indemnity Details</h3>
      <p className="text-sm text-gray-500 mb-4">Please provide the following details for indemnity purposes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Driver's Date of Birth</label>
          <Input type="date" value={formData.indemnity_driver_dob} onChange={(e) => handleChange('indemnity_driver_dob', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Registered Owner (Full Name)</label>
          <Input value={formData.indemnity_registered_owner} onChange={(e) => handleChange('indemnity_registered_owner', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2">Any pending prosecutions?</label>
        <Textarea value={formData.indemnity_pending_prosecutions} onChange={(e) => handleChange('indemnity_pending_prosecutions', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Enter details (or 'None' if none)..." />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2">DVLA/medical restrictions?</label>
        <Textarea value={formData.indemnity_dvla_medical_restrictions} onChange={(e) => handleChange('indemnity_dvla_medical_restrictions', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Enter details (or 'None' if none)..." />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2">Held full UK/EU license for 12+ months?</label>
        <Textarea value={formData.indemnity_full_license_12_months} onChange={(e) => handleChange('indemnity_full_license_12_months', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Enter details..." />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2">Motoring convictions/points in last 5 years?</label>
        <Textarea value={formData.indemnity_convictions_last_5_years} onChange={(e) => handleChange('indemnity_convictions_last_5_years', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Enter details (or 'None' if none)..." />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2">Vehicle Use at Time of Incident</label>
        <Input value={formData.indemnity_vehicle_use_at_incident} onChange={(e) => handleChange('indemnity_vehicle_use_at_incident', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" placeholder="e.g., Personal, Commuting, Business" />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2">Vehicle Modifications</label>
        <Textarea value={formData.indemnity_vehicle_modifications} onChange={(e) => handleChange('indemnity_vehicle_modifications', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Enter details (or 'None' if none)..." />
      </div>
    </div>
  );
}