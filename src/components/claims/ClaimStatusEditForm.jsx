import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CustomSelect from '../shared/CustomSelect';

export default function ClaimStatusEditForm({ claim: editClaim, onSave, onCancel }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Job Status (Read-only)</label>
          <div className="px-3 py-2 glass-inset text-sm">{editClaim.job_status || 'Not set'}</div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Claim Type</label>
          <CustomSelect
            value={editClaim.claim_type || ''}
            onChange={(v) => onSave({ claim_type: v })}
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
            value={editClaim.loss_date || ''}
            onChange={(e) => onSave({ loss_date: e.target.value })}
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Time of Loss</label>
          <input
            type="text"
            value={editClaim.loss_time || ''}
            onChange={(e) => onSave({ loss_time: e.target.value })}
            placeholder="HH:MM"
            className="glass-inset w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Use of Vehicle</label>
          <CustomSelect
            value={editClaim.vehicle_use || ''}
            onChange={(v) => onSave({ vehicle_use: v })}
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
            value={editClaim.courtesy_car_required ? 'true' : 'false'}
            onChange={(v) => onSave({ courtesy_car_required: v === 'true' })}
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
          value={editClaim.incident_location || ''}
          onChange={(e) => onSave({ incident_location: e.target.value })}
          className="glass-inset w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">Circumstances</label>
        <Textarea
          value={editClaim.circumstances || ''}
          onChange={(e) => onSave({ circumstances: e.target.value })}
          rows={4}
          className="glass-inset w-full px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="outline" size="sm">Done</Button>
      </div>
    </div>
  );
}