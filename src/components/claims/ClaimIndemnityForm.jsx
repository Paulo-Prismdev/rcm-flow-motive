import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ClaimIndemnityForm({ claim, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    requires_indemnity: claim.requires_indemnity || false,
    indemnity_driver_dob: claim.indemnity_driver_dob || '',
    indemnity_registered_owner: claim.indemnity_registered_owner || '',
    indemnity_pending_prosecutions: claim.indemnity_pending_prosecutions || '',
    indemnity_dvla_medical_restrictions: claim.indemnity_dvla_medical_restrictions || '',
    indemnity_full_license_12_months: claim.indemnity_full_license_12_months || '',
    indemnity_convictions_last_5_years: claim.indemnity_convictions_last_5_years || '',
    indemnity_vehicle_use_at_incident: claim.indemnity_vehicle_use_at_incident || '',
    indemnity_vehicle_modifications: claim.indemnity_vehicle_modifications || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-3 neomorph-inset rounded-lg">
        <input
          type="checkbox"
          id="requires_indemnity"
          checked={formData.requires_indemnity}
          onChange={(e) => setFormData({ ...formData, requires_indemnity: e.target.checked })}
          className="w-5 h-5"
        />
        <label htmlFor="requires_indemnity" className="text-sm font-medium">
          This claim requires indemnity details
        </label>
      </div>

      {formData.requires_indemnity && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Driver's Date of Birth</label>
            <Input
              type="date"
              value={formData.indemnity_driver_dob}
              onChange={(e) => setFormData({ ...formData, indemnity_driver_dob: e.target.value })}
              className="neomorph-inset"
            />
          </div>

      <div>
        <label className="block text-sm font-medium mb-2">Who is the registered owner and keeper of the vehicle?</label>
        <Input
          value={formData.indemnity_registered_owner}
          onChange={(e) => setFormData({ ...formData, indemnity_registered_owner: e.target.value })}
          placeholder="Enter registered owner and keeper details..."
          className="neomorph-inset"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Does the driver have any pending prosecutions?</label>
        <Textarea
          value={formData.indemnity_pending_prosecutions}
          onChange={(e) => setFormData({ ...formData, indemnity_pending_prosecutions: e.target.value })}
          placeholder="Enter details of any pending prosecutions (or 'No' if none)..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Has the driver been told not to drive by DVLA or any medical source?</label>
        <Textarea
          value={formData.indemnity_dvla_medical_restrictions}
          onChange={(e) => setFormData({ ...formData, indemnity_dvla_medical_restrictions: e.target.value })}
          placeholder="Enter details (or 'No' if none)..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Has the driver held a full UK/EU license for at least 12 months and driven regularly in the UK at that time?</label>
        <Textarea
          value={formData.indemnity_full_license_12_months}
          onChange={(e) => setFormData({ ...formData, indemnity_full_license_12_months: e.target.value })}
          placeholder="Enter details..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Has the driver had any motoring convictions or fixed penalty points within the last 5 years?</label>
        <Textarea
          value={formData.indemnity_convictions_last_5_years}
          onChange={(e) => setFormData({ ...formData, indemnity_convictions_last_5_years: e.target.value })}
          placeholder="Enter details of convictions/points (or 'No' if none)..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">What was the vehicle being used for at the time of the incident?</label>
        <select
          value={formData.indemnity_vehicle_use_at_incident}
          onChange={(e) => setFormData({ ...formData, indemnity_vehicle_use_at_incident: e.target.value })}
          className="neomorph-inset w-full px-3 py-2 rounded-lg border-0 text-sm"
        >
          <option value="">Select...</option>
          <option value="Business">Business</option>
          <option value="Social">Social</option>
          <option value="Commuting">Commuting</option>
        </select>
      </div>

          <div>
            <label className="block text-sm font-medium mb-2">Are there any modifications to the policyholder's vehicle?</label>
            <Textarea
              value={formData.indemnity_vehicle_modifications}
              onChange={(e) => setFormData({ ...formData, indemnity_vehicle_modifications: e.target.value })}
              placeholder="Enter details of modifications (or 'No' if none)..."
              className="neomorph-inset"
              rows={2}
            />
          </div>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat flex-1">
          Cancel
        </Button>
        <Button type="submit" className="neomorph-flat bg-accent/10 text-accent flex-1">
          Save Changes
        </Button>
      </div>
    </form>
  );
}