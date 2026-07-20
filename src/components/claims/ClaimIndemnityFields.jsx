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
          <label className="block text-sm text-gray-600 mb-2">Driver's Age</label>
          <Input type="number" min="0" value={formData.indemnity_driver_age} onChange={(e) => handleChange('indemnity_driver_age', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Driver's Date of Birth</label>
          <Input type="date" value={formData.indemnity_driver_dob} onChange={(e) => handleChange('indemnity_driver_dob', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Registered Owner (Full Name)</label>
          <Input value={formData.indemnity_registered_owner} onChange={(e) => handleChange('indemnity_registered_owner', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Vehicle Use at Time of Incident</label>
          <Input value={formData.indemnity_vehicle_use_at_incident} onChange={(e) => handleChange('indemnity_vehicle_use_at_incident', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" placeholder="e.g., Personal, Commuting, Business" />
        </div>
      </div>

      {[
        ['indemnity_pending_prosecutions', 'Does the driver have any pending prosecutions?'],
        ['indemnity_dvla_medical_restrictions', 'Has the driver been told not to drive by the DVLA or any medical source?'],
        ['indemnity_convictions_last_5_years', 'Has the driver had any motoring convictions or fixed penalty points within the last 5 years?'],
        ['indemnity_incidents_last_5_years', 'Has the driver been involved in any incidents, losses, or thefts in the last 5 years, regardless of whether a claim has been made?'],
        ['indemnity_full_license_12_months', 'Has the driver held a full UK/EU licence for at least 12 months and driven regularly in the UK at that time?'],
        ['indemnity_vehicle_modifications', 'Does the vehicle have any modifications?'],
        ['indemnity_pre_existing_damage', 'Did any vehicle involved have any pre-existing damages?'],
        ['indemnity_cctv_dashcam', 'Is there any CCTV or dashcam footage available?'],
        ['indemnity_property_damaged', 'As a result of the incident was there any property damaged?'],
        ['indemnity_more_photos', 'Can you provide more photos of the damages to the vehicles involved?'],
      ].map(([field, label]) => (
        <div key={field}>
          <label className="block text-sm text-gray-600 mb-2">{label}</label>
          <select value={formData[field] || ''} onChange={(e) => handleChange(field, e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 w-full">
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      ))}

      {formData.indemnity_vehicle_modifications === 'Yes' && (
        <div>
          <label className="block text-sm text-gray-600 mb-2">If so, what modifications?</label>
          <Textarea value={formData.indemnity_modification_details} onChange={(e) => handleChange('indemnity_modification_details', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Please describe the modifications..." />
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-600 mb-2">Any other information that you believe to be relevant and that will aid the claim?</label>
        <Textarea value={formData.indemnity_other_info} onChange={(e) => handleChange('indemnity_other_info', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" placeholder="Enter any other relevant information..." />
      </div>
    </div>
  );
}