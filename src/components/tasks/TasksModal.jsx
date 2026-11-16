import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import ClaimTasksSection from './ClaimTasksSection';

export default function TasksModal({ claimId, claimJobNumber, claimReg, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] bg-card rounded-xl shadow-2xl p-8 border border-border">
        <div className="mb-6">
          <h2 className="text-[18px] font-semibold text-foreground">Manage Tasks</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {claimJobNumber || claimReg || 'Claim'}
          </p>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh] pb-4">
          <ClaimTasksSection
            claimId={claimId}
            claimJobNumber={claimJobNumber}
            claimReg={claimReg}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors h-9"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}