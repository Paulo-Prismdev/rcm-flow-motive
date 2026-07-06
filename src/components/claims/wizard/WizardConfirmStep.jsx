import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader } from 'lucide-react';

export default function WizardConfirmStep({
  claim, selectedBodyshop, isAllocating, onAllocate
}) {
  return (
    <div className="space-y-3">
      <div className="text-center py-3">
        <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-bold text-lg mb-1">Ready to Allocate</h3>
        <p className="text-sm text-muted-foreground">Confirm the allocation to complete the process</p>
      </div>

      <div className="p-3 rounded-lg border bg-muted/30">
        <h4 className="font-bold text-sm mb-2">Allocation Summary</h4>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Job Reference:</span>
            <span className="font-medium">{claim.job_number || claim.reg}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client:</span>
            <span className="font-medium">{claim.client_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehicle:</span>
            <span className="font-medium">{claim.make_model || claim.reg}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Allocated To:</span>
            <span className="font-bold text-primary">{selectedBodyshop?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contact:</span>
            <span className="font-medium">{selectedBodyshop?.contact_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{selectedBodyshop?.email}</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>What happens next:</strong>
          <br />• The claim will be updated with the selected bodyshop
          <br />• A notification will be sent to the repairer's portal
          <br />• The instruction date will be set to today
        </p>
      </div>

      <Button onClick={onAllocate} disabled={isAllocating} className="w-full h-11">
        {isAllocating ? (
          <><Loader className="w-4 h-4 mr-2 animate-spin" /> Allocating...</>
        ) : (
          <><CheckCircle className="w-4 h-4 mr-2" /> Confirm Allocation</>
        )}
      </Button>
    </div>
  );
}