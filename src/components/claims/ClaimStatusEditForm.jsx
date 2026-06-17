import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
          <select
            value={editClaim.claim_type || ''}
            onChange={(e) => onSave({ claim_type: e.target.value })}
            className="glass-inset w-full px-3 py-2 text-sm"
          >
            <option value="">Select type...</option>
            <option value="Credit Repair">Credit Repair</option>
            <option value="Fault Claim">Fault Claim</option>
            <option value="Non-Fault Claim">Non-Fault Claim</option>
            <option value="Total Loss">Total Loss</option>
            <option value="Glass Claim">Glass Claim</option>
          </select>
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
          <select
            value={editClaim.vehicle_use || ''}
            onChange={(e) => onSave({ vehicle_use: e.target.value })}
            className="glass-inset w-full px-3 py-2 text-sm"
          >
            <option value="">Select use...</option>
            <option value="Business">Business</option>
            <option value="Social">Social</option>
            <option value="Commuting">Commuting</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Courtesy Car Required</label>
          <select
            value={editClaim.courtesy_car_required ? 'true' : 'false'}
            onChange={(e) => onSave({ courtesy_car_required: e.target.value === 'true' })}
            className="glass-inset w-full px-3 py-2 text-sm"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
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