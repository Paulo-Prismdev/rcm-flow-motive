import React from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ActivityLogSection from './ActivityLogSection';

export default function ActivityLogModal({ parentId, parentType, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="neomorph p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Activity Log</h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ActivityLogSection parentId={parentId} parentType={parentType} />
        </div>
      </div>
    </div>
  );
}