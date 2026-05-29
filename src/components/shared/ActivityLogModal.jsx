import React from 'react';
import { X } from "lucide-react";
import ActivityLogSection from './ActivityLogSection';

export default function ActivityLogModal({ parentId, parentType, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-[600px] mx-4 max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Activity Log</h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <ActivityLogSection parentId={parentId} parentType={parentType} />
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors h-9"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}