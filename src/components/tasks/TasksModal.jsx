import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListTodo } from "lucide-react";
import ClaimTasksSection from './ClaimTasksSection';

export default function TasksModal({ claimId, claimJobNumber, claimReg, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-accent" />
            Tasks for {claimJobNumber || claimReg || 'Claim'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <ClaimTasksSection
            claimId={claimId}
            claimJobNumber={claimJobNumber}
            claimReg={claimReg}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}