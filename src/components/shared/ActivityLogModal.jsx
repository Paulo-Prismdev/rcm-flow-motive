import React from 'react';
import { X } from "lucide-react";
import ActivityLogSection from './ActivityLogSection';

import useEscapeToClose from '@/hooks/useEscapeToClose';
export default function ActivityLogModal({ parentId, parentType, isOpen, onClose }) {
  useEscapeToClose(onClose, isOpen);
  if (!isOpen) return null;

  return (
    <div data-overlay-dismiss className="fixed inset-0 z-window fm-scrim flex items-center justify-center" onClick={onClose}>
      <div 
        className="fm-glass-window rounded-2xl text-foreground w-full max-w-[600px] mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[18px] font-semibold text-foreground">Activity Log</h2>
          </div>
          <button aria-label="Close"
            onClick={onClose}
            className="w-6 h-6 text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <ActivityLogSection parentId={parentId} parentType={parentType} />
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors h-9"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}