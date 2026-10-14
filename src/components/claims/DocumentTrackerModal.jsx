import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import DocumentTracker from '@/components/claims/DocumentTracker';

export default function DocumentTrackerModal({ isOpen, onClose, claim, currentUser, onUpdate }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Documents</span>
            {claim?.job_number && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gold/20 text-gold font-semibold">
                {claim.job_number}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Track required documents and upload general files for this claim.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto -mx-2 px-2" style={{ maxHeight: '70vh' }}>
          {claim?.id && (
            <DocumentTracker claim={claim} currentUser={currentUser} onUpdate={onUpdate} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}