import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CustomSelect from '../shared/CustomSelect';

export default function ClaimStatusEditForm({ claim: editClaim, onSave, onCancel }) {
  const [form, setForm] = useState({
    reg: editClaim.reg || '',
    claim_type: editClaim.claim_type || '',
    loss_date: editClaim.loss_date || '',
    loss_time: editClaim.loss_time || '',
    vehicle_use: editClaim.vehicle_use || '',
    courtesy_car_required: editClaim.courtesy_car_required ? 'true' : 'false',
    incident_location: editClaim.incident_location || '',
    circumstances: editClaim.circumstances || '',
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    onSave({
      reg: form.reg,
      claim_type: form.claim_type,
      loss_date: form.loss_date,
      loss_time: form.loss_time,
      vehicle_use: form.vehicle_use,
      courtesy_car_required: form.courtesy_car_required === 'true',
      incident_location: form.incident_location,
      circumstances: form.circumstances,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Registration</label>
          <input
            type="text"
            value={form.reg}
            onChange={(e) => set('reg', e.target.value.toUpperCase())}
            placeholder="e.g. AB12 CDE"
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Job Status (Read-only)</label>
          <div className="px-3 py-2 glass-inset text-sm">{editClaim.job_status || 'Not set'}</div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Claim Type</label>
          <CustomSelect
            value={form.claim_type}
            onChange={(v) => set('claim_type', v)}
            options={[
              { value: 'Credit Repair', label: 'Credit Repair' },
              { value: 'Fault Claim', label: 'Fault Claim' },
              { value: 'Non-Fault Claim', label: 'Non-Fault Claim' },
              { value: 'Total Loss', label: 'Total Loss' },
              { value: 'Glass Claim', label: 'Glass Claim' },
            ]}
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Date of Loss</label>
          <input
            type="date"
            value={form.loss_date}
            onChange={(e) => set('loss_date', e.target.value)}
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Time of Loss</label>
          <input
            type="text"
            value={form.loss_time}
            onChange={(e) => set('loss_time', e.target.value)}
            placeholder="HH:MM"
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Use of Vehicle</label>
          <CustomSelect
            value={form.vehicle_use}
            onChange={(v) => set('vehicle_use', v)}
            options={[
              { value: 'Business', label: 'Business' },
              { value: 'Social', label: 'Social' },
              { value: 'Commuting', label: 'Commuting' },
            ]}
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Courtesy Car Required</label>
          <CustomSelect
            value={form.courtesy_car_required}
            onChange={(v) => set('courtesy_car_required', v)}
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: 'Yes' },
            ]}
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">Incident Location</label>
        <input
          type="text"
          value={form.incident_location}
          onChange={(e) => set('incident_location', e.target.value)}
          className="glass-inset w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">Circumstances</label>
        <Textarea
          value={form.circumstances}
          onChange={(e) => set('circumstances', e.target.value)}
          rows={4}
          className="glass-inset w-full px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="outline" size="sm">Cancel</Button>
        <Button onClick={handleSave} size="sm">Save Changes</Button>
      </div>
    </div>
  );
}