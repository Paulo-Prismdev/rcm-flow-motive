import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

// Fields that should NOT be copied to the duplicate — they are either
// built-in, status-specific, allocation-specific, or date/progress tracking.
const EXCLUDED_FIELDS = new Set([
  // Built-ins
  'id', 'created_date', 'updated_date', 'created_by_id',
  // Identity & status
  'job_number', 'job_status', 'secondary_status', 'journey_status',
  'tertiary_status', 'job_statuses', 'archived', 'draft',
  // Bodyshop allocation (should be re-allocated fresh)
  'bodyshop', 'bodyshop_id', 'bodyshop_email', 'repairer_accepted',
  'repairer_accepted_date', 'instruction_pdf_url',
  // Linked child entities
  'linked_estimate_id', 'linked_engineering_id', 'linked_parts_id',
  'linked_third_party_claim_id', 'linked_original_claim_id',
  // Progress / milestone dates (keep loss_date only)
  'date_received', 'estimate_completed', 'authority_received',
  'bs_instructed', 'booking_in_date', 'on_site_date', 'hand_over_date',
  'all_parts_on_site', 'ecd', 'completion_date',
  'invoice_received_repairer', 'invoice_sent_referrer', 'total_loss_date',
  'cancellation_date', 'cancellation_reason', 'date_sent_factor',
  'factored', 'date_payment_in',
  // Update tracking timers
  'last_file_update', 'last_client_update', 'latest_update',
  'last_updated_at', 'next_update_due_at', 'update_status_flag',
  'last_client_comm_at', 'next_client_comm_due_at', 'client_comm_status_flag',
  'override_active', 'override_reason', 'override_expiry_at',
  'override_by_user_email', 'override_notes',
  'client_comm_override_active', 'client_comm_override_reason',
  'client_comm_override_expiry_at', 'client_comm_override_by_user_email',
  'client_comm_override_notes',
  // Invoice tracking
  'invoice_status', 'ready_invoice_date', 'invoice_notes', 'invoice_amount',
  'external_invoice_ref', 'invoice_sent_date', 'invoice_due_date',
  'invoice_payment_received',
  // Survey
  'survey_status',
  // Files & images (start clean)
  'file_urls', 'image_urls',
  // External tokens / signed forms
  'indemnity_token', 'indemnity_link_sent_at', 'indemnity_completed_at',
  'repair_preference_token', 'repair_preference_link_sent_at',
  'repair_preference_signed', 'repair_preference_signed_at',
  'repair_preference_pdf_url', 'repair_preference_client_name',
  // Notification flag
  'unread_bodyshop_update',
  // Third party capture status (reset for new claim)
  'tp_capture_rejected_reason',
]);

export default function DuplicateClaimModal({ claim, isOpen, onClose, onDuplicated }) {
  const [regOverride, setRegOverride] = useState(claim?.reg || '');
  const [createdClaim, setCreatedClaim] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    setRegOverride(claim?.reg || '');
    setCreatedClaim(null);
  }, [claim, isOpen]);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      // 1. Generate a new job number
      const jobRes = await base44.functions.invoke('generateJobNumber', { entityType: 'Claim' });
      const jobNumber = jobRes.data?.job_number || jobRes.job_number;
      if (!jobNumber) throw new Error('Failed to generate job number');

      // 2. Build the new claim payload from the source claim
      const newClaim = {};
      for (const [key, value] of Object.entries(claim)) {
        if (EXCLUDED_FIELDS.has(key)) continue;
        if (value === undefined) continue;
        newClaim[key] = value;
      }

      // 3. Override with fresh values
      newClaim.job_number = jobNumber;
      newClaim.job_status = 'New';
      newClaim.secondary_status = 'New';
      newClaim.journey_status = 'New';
      newClaim.date_received = new Date().toISOString().split('T')[0];
      newClaim.archived = false;
      newClaim.draft = false;
      if (regOverride.trim()) newClaim.reg = regOverride.trim();

      // 4. Create the duplicate
      return base44.entities.Claim.create(newClaim);
    },
    onSuccess: (newClaim) => {
      setCreatedClaim(newClaim);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast({
        title: 'Claim duplicated',
        description: `New job ${newClaim.job_number} created from ${claim.job_number}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to duplicate claim',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    if (createdClaim) {
      onDuplicated?.(createdClaim);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Duplicate Claim
          </DialogTitle>
          <DialogDescription>
            {createdClaim
              ? 'The claim has been duplicated successfully.'
              : `Create a new claim by copying all details from ${claim?.job_number || 'this claim'}. A new job number will be generated automatically.`}
          </DialogDescription>
        </DialogHeader>

        {createdClaim ? (
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                  New claim created: {createdClaim.job_number}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                  All details copied from {claim?.job_number}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dup-reg">Registration (optional override)</Label>
              <Input
                id="dup-reg"
                value={regOverride}
                onChange={(e) => setRegOverride(e.target.value)}
                placeholder="Leave as-is or enter new reg"
              />
              <p className="text-xs text-muted-foreground">
                Defaults to the source claim's registration. Change it here if the new claim is for a different vehicle.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What gets copied</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• Client, driver & contact details</li>
                <li>• Vehicle information & damage description</li>
                <li>• Insurance, broker & policy details</li>
                <li>• Referrer & financial defaults</li>
                <li>• Estimate settings & instruction defaults</li>
                <li>• Indemnity requirements</li>
              </ul>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 pt-2 border-t border-border">What resets</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• New job number & status set to "New"</li>
                <li>• Bodyshop allocation cleared</li>
                <li>• All milestone dates & update timers reset</li>
                <li>• Files, images & invoices not copied</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdClaim ? (
            <>
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={handleClose}>View New Claim</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={duplicateMutation.isLoading}>
                Cancel
              </Button>
              <Button
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isLoading}
              >
                {duplicateMutation.isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Duplicating...</>
                ) : (
                  <><Copy className="w-4 h-4" /> Create Duplicate</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}