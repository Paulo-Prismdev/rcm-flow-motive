import React from 'react';
import TimeLogSection from './TimeLogSection';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function TimeLogsModal({ parentId, parentType, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
        <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-6">Time Logs</h2>

        <div className="overflow-y-auto max-h-[60vh] pb-4">
          <TimeLogSection parentId={parentId} parentType={parentType} />
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