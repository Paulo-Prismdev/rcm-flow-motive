import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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

export default function NewJobsBanner({ bodyshopId }) {
  const [expanded, setExpanded] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showSuccessStep, setShowSuccessStep] = useState(false);
  const [acceptedClaim, setAcceptedClaim] = useState(null);
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

  // Fetch claims that are allocated but not yet accepted
  const { data: pendingJobs = [] } = useQuery({
    queryKey: ['pendingJobs', bodyshopId],
    queryFn: async () => {
      const allClaims = await base44.entities.Claim.list('-created_date', 5000);
      return allClaims.filter(c => 
        c.bodyshop_id === bodyshopId && 
        c.repairer_accepted !== true &&
        !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status)
      );
    },
    enabled: !!bodyshopId,
    refetchInterval: 30000,
  });

  const acceptJobMutation = useMutation({
    mutationFn: async ({ claimId, claim }) => {
      await base44.entities.Claim.update(claimId, {
        repairer_accepted: true,
        repairer_accepted_date: new Date().toISOString().split('T')[0],
      });
      
      // Log the acceptance in ActivityLog
      await base44.entities.ActivityLog.create({
        parent_id: claimId,
        parent_type: 'Claim',
        action: 'Job Accepted by Repairer',
        field_name: 'repairer_accepted',
        old_value: 'false',
        new_value: 'true',
        description: `Job accepted by ${bodyshop?.name || 'Repairer'}`,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
      });
      
      return claim;
    },
  });

  const handleAccept = async (claim) => {
    setIsAccepting(true);
    try {
      await acceptJobMutation.mutateAsync({ claimId: claim.id, claim });
      // Set success state BEFORE invalidating queries
      setSelectedClaim(null);
      setAcceptedClaim(claim);
      setShowSuccessStep(true);
      // Invalidate queries after showing success modal
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['repairerClaims'] });
    } finally {
      setIsAccepting(false);
    }
  };

  const rejectJobMutation = useMutation({
    mutationFn: async ({ claimId, claim, reason }) => {
      // Remove bodyshop from claim and store rejection reason
      await base44.entities.Claim.update(claimId, {
        bodyshop_id: null,
        bodyshop: null,
        bodyshop_email: null,
        bs_instructed: null,
        latest_update: `Job rejected by ${bodyshop?.name || 'Repairer'}. Reason: ${reason}`,
      });
      
      // Log the rejection in ActivityLog
      await base44.entities.ActivityLog.create({
        parent_id: claimId,
        parent_type: 'Claim',
        action: 'Job Rejected by Repairer',
        field_name: 'bodyshop_id',
        old_value: bodyshop?.name || 'Repairer',
        new_value: 'Unassigned',
        description: `Job rejected by ${bodyshop?.name || 'Repairer'}. Reason: ${reason}`,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['repairerClaims'] });
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
      <div className="neomorph border-2 border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 overflow-hidden animate-pulse-subtle">
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center animate-bounce">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200">
                  {pendingJobs.length} New Job{pendingJobs.length !== 1 ? 's' : ''} Awaiting Acceptance
                </h3>
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  Please review and accept to confirm you can handle these repairs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-600 bg-white/50 px-3 py-1 rounded-full">
                {pendingJobs.length}
              </span>
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-amber-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-amber-600" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Job List */}
        {expanded && (
          <div className="border-t border-amber-300 dark:border-amber-700 p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {pendingJobs.map(job => (
              <div 
                key={job.id} 
                className="neomorph-flat p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:shadow-lg transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg">{formatUKRegistration(job.reg)}</span>
                    {job.job_number && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/20 text-accent">
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
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept Job
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <style>{`
          @keyframes pulse-subtle {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
          }
          .animate-pulse-subtle {
            animation: pulse-subtle 2s infinite;
          }
        `}</style>
      </div>

      {/* Accept/Reject Job Modal */}
      <Dialog open={!!selectedClaim} onOpenChange={() => { setSelectedClaim(null); setShowRejectForm(false); setRejectReason(''); }}>
        <DialogContent className="neomorph max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showRejectForm ? (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject Job
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 text-accent" />
                  Review Job
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedClaim && (
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

              {!showRejectForm ? (
                <>
                  {/* Terms of Repair */}
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
                    <h5 className="font-bold text-sm mb-2 text-amber-800 dark:text-amber-200">Terms of Repair</h5>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      By accepting this repair, you agree to the following:
                    </p>
                    <ul className="text-sm space-y-2 text-amber-700 dark:text-amber-300">
                      <li className="flex items-start gap-2">
                        <span className="font-bold">•</span>
                        <span>
                          <strong>Bottom Line Discount:</strong>{' '}
                          <strong>{selectedClaim.referral_fee_repairer ? `${selectedClaim.referral_fee_repairer}%` : 'The agreed percentage'}</strong>{' '}
                          of the repair total will be taken as ARTURA's fee.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">•</span>
                        <span>
                          <strong>Invoice Submission:</strong> The final invoice must be submitted directly to ARTURA. 
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
                      className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
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
                      className="w-full text-red-600 border-red-300 hover:bg-red-50 gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Job
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Reject Form */}
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
                    <h5 className="font-bold text-sm mb-2 text-red-800 dark:text-red-200">Rejection Reason</h5>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      Please provide a reason for rejecting this job. This will be sent to ARTURA.
                    </p>
                    <Textarea
                      placeholder="Enter reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Reject Action Buttons */}
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
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
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
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal with Download Instructions */}
      <Dialog open={showSuccessStep} onOpenChange={() => { setShowSuccessStep(false); setAcceptedClaim(null); }}>
        <DialogContent className="neomorph max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Job Accepted!
            </DialogTitle>
          </DialogHeader>

          {acceptedClaim && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h4 className="font-bold text-lg mb-1">{formatUKRegistration(acceptedClaim.reg)}</h4>
                <p className="text-sm text-foreground-muted">
                  You have successfully accepted this job.
                </p>
              </div>

              {/* Instruction PDF Download */}
              {acceptedClaim.instruction_pdf_url ? (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent">
                  <h5 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />
                    Download Repair Instructions
                  </h5>
                  <p className="text-sm text-foreground-muted mb-3">
                    Please download and review the repair instructions for this job.
                  </p>
                  <Button
                    onClick={() => window.open(acceptedClaim.instruction_pdf_url, '_blank')}
                    className="w-full bg-accent hover:bg-accent-hover text-accent-foreground gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Instructions (PDF)
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    No instruction document is available for this job yet. Please contact ARTURA if you need further details.
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => { setShowSuccessStep(false); setAcceptedClaim(null); }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}