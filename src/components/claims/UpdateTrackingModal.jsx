import React from 'react';
import { Clock, AlertCircle, CheckCircle, Pause, Calendar, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isPast, formatDistanceToNow } from 'date-fns';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import { isUpdateTrackingClosed } from '../shared/claimStatusUpdate';

export default function UpdateTrackingModal({ claim, isOpen, onClose, onSetOverride, canEdit }) {
  if (!claim) return null;

  // Don't show tracking for closed claims (invoiced or cancelled only)
  if (isUpdateTrackingClosed(claim)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-primary" />
              Update Tracking
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center text-muted-foreground">
            <p>Update tracking is not available for closed claims.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const lastUpdated = claim.last_updated_at ? new Date(claim.last_updated_at) : null;
  const nextDue = claim.next_update_due_at ? new Date(claim.next_update_due_at) : null;
  const isOverdue = nextDue && isPast(nextDue);
  const hasOverride = claim.override_active;
  const overrideExpiry = claim.override_expiry_at ? new Date(claim.override_expiry_at) : null;

  const getTimeRemaining = () => {
    if (!nextDue) return 'Not set';
    if (isOverdue) return 'Overdue';
    return `Due ${formatDistanceToNow(nextDue, { addSuffix: true })}`;
  };

  const getProgressPercentage = () => {
    if (!lastUpdated || !nextDue) return 0;
    const now = new Date();
    const total = nextDue.getTime() - lastUpdated.getTime();
    const elapsed = now.getTime() - lastUpdated.getTime();
    const percentage = (elapsed / total) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const progress = getProgressPercentage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-primary" />
            Update Tracking
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            48-hour update tracking for this claim
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-muted">Current Status:</span>
            <UpdateStatusBadge status={claim.update_status_flag} />
          </div>

          {/* Override Notice */}
          {hasOverride && (
            <div className="bg-muted/30 border border-border rounded-lg p-4 border-l-4 border-l-blue-500">
              <div className="flex items-start gap-3">
                <Pause className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1 text-foreground">Update Tracking Paused</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {claim.override_reason || 'No reason provided'}
                  </p>
                  {overrideExpiry && (
                    <p className="text-xs text-muted-foreground">
                      Resumes: {format(overrideExpiry, 'dd/MM/yyyy HH:mm')}
                    </p>
                  )}
                  {claim.override_by_user_email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="w-3 h-3" />
                      Set by: {claim.override_by_user_email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Last Updated</span>
                <span className="text-sm font-medium text-foreground">
                  {format(lastUpdated, 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {!hasOverride && nextDue && (
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Time Until Next Update</span>
                <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                  {getTimeRemaining()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    isOverdue ? 'bg-red-500' : 
                    progress > 75 ? 'bg-orange-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Next Due */}
          {nextDue && !hasOverride && (
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Next Update Due</span>
                <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                  {format(nextDue, 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="mb-2">
                  Claims should receive a <strong>Client Communication</strong> update every 48 hours to keep stakeholders informed.
                </p>
                <p>
                  Only <strong>Client Communication</strong> updates reset the timer. Other update types are logged for audit purposes only.
                  If you need to pause tracking temporarily, use the snooze option below.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                onClick={onSetOverride}
                variant="outline"
                className="px-4 py-2 text-sm"
              >
                {hasOverride ? 'Modify Snooze' : 'Snooze Tracking'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}