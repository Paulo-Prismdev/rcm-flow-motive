import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import ClaimTasksSection from './ClaimTasksSection';

export default function TasksModal({ claimId, claimJobNumber, claimReg, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
        <div className="mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Manage Tasks</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
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
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors h-9"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}