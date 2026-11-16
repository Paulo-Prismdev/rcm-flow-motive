import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePortalClaims } from '@/components/shared/usePortalClaims';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ChevronDown, 
  ChevronUp,
  Car,
  User,
  Calendar,
  MapPin,
  Download,
  FileText,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { formatUKRegistration } from '@/components/shared/formatRegistration';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { warn } from '@/lib/dialogs';
import { activateOnKey } from '@/lib/a11y';

export default function NewJobsBanner({ bodyshopId }) {
  const [expanded, setExpanded] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [wizardStep, setWizardStep] = useState(1); // 1 = review/accept, 2 = download instructions, 3 = confirmed
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  
  const { data: bodyshop } = useQuery({
    queryKey: ['bodyshop', bodyshopId],
    queryFn: () => base44.entities.Bodyshop.get(bodyshopId),
    enabled: !!bodyshopId,
  });

  // Jobs sent to this bodyshop and not yet accepted (closed ones are left out on the server)
  const { data: pendingJobs = [] } = usePortalClaims({ view: 'pending', enabled: !!bodyshopId, refetchInterval: 30000 });

  const acceptJobMutation = useMutation({
    mutationFn: async ({ claimId, claim }) => {
      // Accepted on the server, which returns the claim as it now stands (with its instruction PDF)
      const res = await base44.functions.invoke('portalClaimAction', { claim_id: claimId, action: 'accept_job' });
      return res.data?.claim;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalClaims'] });
    },
  });

  const handleAccept = async (claim) => {
    setIsAccepting(true);
    try {
      const latestClaim = await acceptJobMutation.mutateAsync({ claimId: claim.id, claim });
      // Update selectedClaim with latest data (including instruction_pdf_url)
      setSelectedClaim(latestClaim);
      // Move to step 2 (download instructions) - stay in same modal
      setWizardStep(2);
    } catch (error) {
      console.error('Error accepting job:', error);
      warn('Failed to accept job: ' + (error.message || 'Please try again.'));
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDownloadAndConfirm = () => {
    if (selectedClaim?.instruction_pdf_url) {
      window.open(selectedClaim.instruction_pdf_url, '_blank');
    }
    // Move to confirmation step
    setWizardStep(3);
  };

  const handleFinalClose = () => {
    setSelectedClaim(null);
    setShowRejectForm(false);
    setRejectReason('');
    setWizardStep(1);
    // Invalidate queries after modal is fully closed
    queryClient.invalidateQueries({ queryKey: ['portalClaims'] });
  };

  const rejectJobMutation = useMutation({
    mutationFn: async ({ claimId, claim, reason }) => {
      // The job goes back to the team, with the reason, on the server
      await base44.functions.invoke('portalClaimAction', { claim_id: claimId, action: 'reject_job', reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalClaims'] });
      setSelectedClaim(null);
      setShowRejectForm(false);
      setRejectReason('');
    },
  });

  const handleReject = async (claim) => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      await rejectJobMutation.mutateAsync({ claimId: claim.id, claim, reason: rejectReason });
    } finally {
      setIsRejecting(false);
    }
  };

  if (pendingJobs.length === 0) return null;

  return (
    <>
      {/* Prominent Banner */}
      <div className="neomorph border-2 border-warning bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 overflow-hidden" style={{ animation: 'pulse-border 2s infinite' }}>
        <div role="button" tabIndex={0} onKeyDown={activateOnKey} 
          className="p-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-warning flex items-center justify-center animate-bounce">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-warning-fg">
                  {pendingJobs.length} New Job{pendingJobs.length !== 1 ? 's' : ''} Awaiting Acceptance
                </h3>
                <p className="text-sm text-warning-fg">
                  Please review and accept to confirm you can handle these repairs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-warning-fg bg-white/50 px-3 py-1 rounded-full">
                {pendingJobs.length}
              </span>
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-warning-fg" />
              ) : (
                <ChevronDown className="w-5 h-5 text-warning-fg" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Job List */}
        {expanded && (
          <div className="border-t border-warning/30 p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {pendingJobs.map(job => (
              <div 
                key={job.id} 
                className="neomorph-flat p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:shadow-lg transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg">{formatUKRegistration(job.reg)}</span>
                    {job.job_number && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">
                        {job.job_number}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-foreground-muted" />
                      <span>{job.client_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="w-3 h-3 text-foreground-muted" />
                      <span>{job.make_model || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-foreground-muted" />
                      <span>{job.bs_instructed ? format(new Date(job.bs_instructed), 'dd/MM/yy') : 'Today'}</span>
                    </div>
                    {job.client_postcode && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-foreground-muted" />
                        <span>{job.client_postcode}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedClaim(job)}
                    className="bg-success hover:bg-success text-on-solid font-bold px-6 py-2 gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept Job
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Job Acceptance Wizard Modal */}
      <Dialog 
        open={!!selectedClaim} 
        onOpenChange={(open) => { 
          // Only allow closing via the Close button on step 3
          // Prevent accidental closing on step 2 (download instructions) 
          if (!open) {
            if (wizardStep === 3) {
              // User clicked close button on final step - allow close
              handleFinalClose();
            } else if (wizardStep === 1 && !showRejectForm) {
              // Allow closing on step 1 (review) only if not in reject form
              handleFinalClose();
            }
            // Otherwise prevent closing (step 2 or reject form)
          } 
        }}
      >
        <DialogContent className="neomorph max-w-md max-h-[90vh] overflow-y-auto">
          {selectedClaim && (
            <>
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      wizardStep === step 
                        ? 'bg-primary text-primary-foreground' 
                        : wizardStep > step 
                          ? 'bg-success text-primary-foreground'
                          : 'bg-accent text-muted-foreground'
                    }`}>
                      {wizardStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                    </div>
                    {step < 3 && (
                      <div className={`w-8 h-1 ${wizardStep > step ? 'bg-success' : 'bg-accent'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Review & Accept */}
              {wizardStep === 1 && !showRejectForm && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Step 1: Review Job
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Job Details */}
                    <div className="p-4 rounded-lg bg-surface border border-border">
                      <h4 className="font-bold text-lg mb-2">{formatUKRegistration(selectedClaim.reg)}</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-foreground-muted">Client:</span> {selectedClaim.client_name || 'N/A'}</p>
                        <p><span className="text-foreground-muted">Vehicle:</span> {selectedClaim.make_model || 'N/A'}</p>
                        {selectedClaim.job_number && (
                          <p><span className="text-foreground-muted">Job #:</span> {selectedClaim.job_number}</p>
                        )}
                      </div>
                    </div>

                    {/* Terms of Repair */}
                    <div className="p-4 rounded-lg bg-warning-bg border border-warning/30">
                      <h5 className="font-bold text-sm mb-2 text-warning-fg">Terms of Repair</h5>
                      <p className="text-sm text-warning-fg mb-3">
                        By accepting this repair, you agree to the following:
                      </p>
                      <ul className="text-sm space-y-2 text-warning-fg">
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span>
                            <strong>Bottom Line Discount:</strong>{' '}
                            <strong>{selectedClaim.referral_fee_repairer ? `${selectedClaim.referral_fee_repairer}%` : 'The agreed percentage'}</strong>{' '}
                            of the repair total will be taken as RCM's fee.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span>
                            <strong>Invoice Submission:</strong> The Final Insurer Invoice must be submitted directly to RCM Automotive. 
                            Failure to do so will result in further charges as per SLA.
                          </span>
                        </li>
                      </ul>
                    </div>

                    <p className="text-xs text-foreground-muted">
                      By clicking "Accept Job", you acknowledge that you have read and agree to the terms above.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleAccept(selectedClaim)}
                        disabled={isAccepting}
                        className="w-full bg-success hover:bg-success text-on-solid gap-2"
                      >
                        {isAccepting ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Accept Job
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectForm(true)}
                        className="w-full text-danger-fg border-danger/30 hover:bg-danger-bg gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Job
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 1: Reject Form */}
              {wizardStep === 1 && showRejectForm && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-danger-fg" />
                      Reject Job
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-surface border border-border">
                      <h4 className="font-bold text-lg mb-2">{formatUKRegistration(selectedClaim.reg)}</h4>
                    </div>

                    <div className="p-4 rounded-lg bg-danger-bg border border-danger/30">
                      <h5 className="font-bold text-sm mb-2 text-danger-fg">Rejection Reason</h5>
                      <p className="text-sm text-danger-fg mb-3">
                        Please provide a reason for rejecting this job. This will be sent to RCM Automotive.
                      </p>
                      <Textarea
                        placeholder="Enter reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => handleReject(selectedClaim)}
                        disabled={isRejecting || !rejectReason.trim()}
                        className="flex-1 bg-danger hover:bg-danger text-on-solid gap-2"
                      >
                        {isRejecting ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Confirm Rejection
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Download Instructions */}
              {wizardStep === 2 && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      Step 2: Download Instructions
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-success-bg border border-success/30 text-center">
                      <CheckCircle className="w-10 h-10 text-success-fg mx-auto mb-2" />
                      <p className="font-medium text-success-fg">Job Accepted!</p>
                      <p className="text-sm text-success-fg">{formatUKRegistration(selectedClaim.reg)}</p>
                    </div>

                    {selectedClaim.instruction_pdf_url ? (
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary">
                        <h5 className="font-bold text-sm mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Repair Instructions
                        </h5>
                        <p className="text-sm text-foreground-muted mb-3">
                          Please download and review the repair instructions before proceeding.
                        </p>
                        <Button
                          onClick={handleDownloadAndConfirm}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download & Continue
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-warning-bg border border-warning/30">
                        <p className="text-sm text-warning-fg mb-3">
                          No instruction document is available for this job yet. You can proceed without downloading.
                        </p>
                        <Button
                          onClick={() => setWizardStep(3)}
                          className="w-full"
                        >
                          Continue
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Step 3: Confirmation */}
              {wizardStep === 3 && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success-fg" />
                      Step 3: Complete
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="p-6 rounded-lg bg-success-bg border border-success/30 text-center">
                      <CheckCircle className="w-16 h-16 text-success-fg mx-auto mb-3" />
                      <h4 className="font-bold text-xl mb-2 text-success-fg">All Done!</h4>
                      <p className="text-sm text-success-fg">
                        You have successfully accepted <strong>{formatUKRegistration(selectedClaim.reg)}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-surface border border-border">
                      <h5 className="font-bold text-sm mb-2">Next Steps:</h5>
                      <ul className="text-sm space-y-2 text-foreground-muted">
                        <li className="flex items-start gap-2">
                          <span>1.</span>
                          <span>Review the instruction document (if downloaded)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>2.</span>
                          <span>Contact the client to arrange booking in</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>3.</span>
                          <span>Submit your invoice to RCM Automotive after completion</span>
                        </li>
                      </ul>
                    </div>

                    <Button
                      onClick={handleFinalClose}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Close
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}