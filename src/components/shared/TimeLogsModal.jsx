import React from 'react';
import TimeLogSection from './TimeLogSection';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function TimeLogsModal({ parentId, parentType, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] bg-card rounded-xl shadow-2xl p-8 border border-border">
        <h2 className="text-[18px] font-semibold text-foreground mb-6">Time Logs</h2>

        <div className="overflow-y-auto max-h-[60vh] pb-4">
          <TimeLogSection parentId={parentId} parentType={parentType} />
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