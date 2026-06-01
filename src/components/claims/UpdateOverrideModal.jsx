import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Clock, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRESET_REASONS = [
  { label: 'Awaiting Parts', days: 7, reason: 'Awaiting parts delivery' },
  { label: 'Customer Unavailable', days: 3, reason: 'Customer unavailable for contact' },
  { label: 'Insurance Pending', days: 7, reason: 'Awaiting insurance approval' },
  { label: 'Bodyshop Delay', days: 5, reason: 'Bodyshop capacity issues' },
  { label: 'Third Party Response', days: 5, reason: 'Awaiting third party response' },
  { label: 'Documentation Required', days: 3, reason: 'Waiting for additional documentation' },
  { label: 'Engineer Assessment', days: 7, reason: 'Engineering assessment in progress' },
  { label: 'Legal Review', days: 14, reason: 'Under legal review' },
];

export default function UpdateOverrideModal({ isOpen, onClose, claim, onSave }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset);
    setReason(preset.reason);
    setCustomDays('');
  };

  const handleSave = () => {
    const days = selectedPreset ? selectedPreset.days : parseInt(customDays);
    if (!days || days < 1) {
      alert('Please select a duration');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    onSave({
      override_active: true,
      override_reason: reason,
      override_expiry_at: expiryDate.toISOString(),
      override_notes: notes,
      update_status_flag: 'Blue'
    });

    onClose();
  };

  const handleRemoveOverride = () => {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    onSave({
      override_active: false,
      override_reason: null,
      override_expiry_at: null,
      override_notes: null,
      next_update_due_at: fortyEightHoursFromNow.toISOString(),
      update_status_flag: 'Green'
    });

    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      setSelectedPreset(null);
      setCustomDays('');
      setReason(claim?.override_reason || '');
      setNotes(claim?.override_notes || '');
    }
  }, [isOpen, claim]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Update Tracking Override
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {claim?.override_active && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 border-l-4 border-l-blue-500 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">Current Override Active</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Reason:</strong> {claim.override_reason}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Expires:</strong> {new Date(claim.override_expiry_at).toLocaleString()}
                  </p>
                  {claim.override_notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <strong>Notes:</strong> {claim.override_notes}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleRemoveOverride}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 px-3 py-1 text-xs"
                >
                  Remove Override
                </Button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Preset Durations
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={`p-3 text-left border rounded-lg transition-all ${
                    selectedPreset?.label === preset.label
                      ? 'ring-2 ring-primary bg-primary text-white border-primary'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary bg-white dark:bg-gray-800'
                  }`}
                >
                  <p className={`font-medium text-sm ${selectedPreset?.label === preset.label ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{preset.label}</p>
                  <p className={`text-xs mt-1 ${selectedPreset?.label === preset.label ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{preset.days} days</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Custom Duration</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Number of Days</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(e.target.value);
                    setSelectedPreset(null);
                  }}
                  placeholder="Enter days..."
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Custom Reason</label>
                <Input
                  value={!selectedPreset ? reason : ''}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason..."
                  disabled={!!selectedPreset}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Reason *</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for override..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Additional Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              className="h-20"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> The 48-hour update tracking will resume automatically after the override expires. 
            You can update the claim at any time, even during an override.
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Set Override
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}