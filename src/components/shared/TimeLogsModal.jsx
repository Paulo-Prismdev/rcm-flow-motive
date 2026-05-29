import React from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import TimeLogSection from './TimeLogSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TimeLogsModal({ parentId, parentType, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Time Logs</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[60vh] py-4">
          <TimeLogSection parentId={parentId} parentType={parentType} />
        </div>
      </DialogContent>
    </Dialog>
  );
}