import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChangeStatusModal({ isOpen, onClose, claim, onSave }) {
  const [newStatus, setNewStatus] = useState(claim?.job_status || "");
  const [newSecondaryStatus, setNewSecondaryStatus] = useState(claim?.secondary_status || "");
  const [statusNotes, setStatusNotes] = useState("");

  const { data: statusConfigs = [] } = useQuery({
    queryKey: ['claimStatusConfigs'],
    queryFn: () => base44.entities.ClaimStatusConfig.list(),
    enabled: isOpen,
  });

  const activeStatuses = statusConfigs
    .filter(s => s.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleSave = () => {
    if (!newStatus) return;
    
    onSave({
      job_status: newStatus,
      secondary_status: newSecondaryStatus || null,
      status_change_notes: statusNotes
    });
    setNewStatus("");
    setNewSecondaryStatus("");
    setStatusNotes("");
    onClose();
  };

  const handleOpenChange = (open) => {
    if (!open) {
      setNewStatus("");
      setStatusNotes("");
    }
    onClose(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Claim Status</DialogTitle>
          <DialogDescription>
            Update the status for claim {claim?.job_number || claim?.reg}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Status</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {activeStatuses.map((status) => (
                  <SelectItem key={status.status_name} value={status.status_name}>
                    {status.status_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Secondary Status (Optional)</label>
            <Select value={newSecondaryStatus} onValueChange={setNewSecondaryStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select secondary status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No secondary status</SelectItem>
                {activeStatuses.map((status) => (
                  <SelectItem key={status.status_name} value={status.status_name}>
                    {status.status_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Add any notes about this status change..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!newStatus}>
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}