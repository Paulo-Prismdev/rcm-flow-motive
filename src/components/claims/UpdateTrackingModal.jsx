import React from 'react';
import { Clock, AlertCircle, CheckCircle, Pause, Calendar, User, MessageSquare, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isPast, formatDistanceToNow } from 'date-fns';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import { isUpdateTrackingClosed, computeUpdateStatusFlag, computeClientCommStatusFlag } from '../shared/claimStatusUpdate';

function TrackerSection({ title, icon: Icon, lastUpdated, nextDue, status, hasOverride, overrideReason, overrideExpiry, overrideByEmail, onSetOverride, canEdit }) {
  const isOverdue = nextDue && isPast(nextDue);

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
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <UpdateStatusBadge status={status} small />
      </div>

      {/* Override notice */}
      {hasOverride && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 border-l-4 border-l-blue-500">
          <div className="flex items-start gap-2">
            <Pause className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm mb-0.5 text-foreground">Tracking Paused</p>
              <p className="text-xs text-muted-foreground mb-1">
                {overrideReason || 'No reason provided'}
              </p>
              {overrideExpiry && (
                <p className="text-xs text-muted-foreground">
                  Resumes: {format(overrideExpiry, 'dd/MM/yyyy HH:mm')}
                </p>
              )}
              {overrideByEmail && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3" />
                  Set by: {overrideByEmail}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Last Update</span>
          <div className="text-right">
            <span className="text-sm font-medium text-foreground block">
              {format(lastUpdated, 'dd/MM/yyyy HH:mm')}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!hasOverride && nextDue && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Time Until Next</span>
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

      {/* Next due */}
      {nextDue && !hasOverride && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Next Due</span>
          <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
            {format(nextDue, 'dd/MM/yyyy HH:mm')}
          </span>
        </div>
      )}

      {/* Snooze button */}
      {canEdit && (
        <div className="flex justify-end pt-1 border-t border-border">
          <Button
            onClick={onSetOverride}
            variant="outline"
            size="sm"
            className="px-3 py-1.5 text-xs"
          >
            {hasOverride ? 'Modify Snooze' : 'Snooze Tracking'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function UpdateTrackingModal({ claim, isOpen, onClose, onSetOverride, onSetClientCommOverride, canEdit }) {
  if (!claim) return null;

  // Don't show tracking for closed claims (invoiced or cancelled only)
  if (isUpdateTrackingClosed(claim)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-primary" />
              Tracking
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center text-muted-foreground">
            <p>Tracking is not available for closed claims.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-primary" />
            Tracking
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            48-hour update & client communication tracking
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* General update tracker */}
          <TrackerSection
            title="General Updates"
            icon={FileText}
            lastUpdated={claim.last_updated_at ? new Date(claim.last_updated_at) : null}
            nextDue={claim.next_update_due_at ? new Date(claim.next_update_due_at) : null}
            status={computeUpdateStatusFlag(claim)}
            hasOverride={claim.override_active}
            overrideReason={claim.override_reason}
            overrideExpiry={claim.override_expiry_at ? new Date(claim.override_expiry_at) : null}
            overrideByEmail={claim.override_by_user_email}
            onSetOverride={onSetOverride}
            canEdit={canEdit}
          />

          {/* Client communication tracker */}
          <TrackerSection
            title="Client Communication"
            icon={MessageSquare}
            lastUpdated={claim.last_client_comm_at ? new Date(claim.last_client_comm_at) : null}
            nextDue={claim.next_client_comm_due_at ? new Date(claim.next_client_comm_due_at) : null}
            status={computeClientCommStatusFlag(claim)}
            hasOverride={claim.client_comm_override_active}
            overrideReason={claim.client_comm_override_reason}
            overrideExpiry={claim.client_comm_override_expiry_at ? new Date(claim.client_comm_override_expiry_at) : null}
            overrideByEmail={claim.client_comm_override_by_user_email}
            onSetOverride={onSetClientCommOverride}
            canEdit={canEdit}
          />

          {/* Info Box */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="mb-2">
                  <strong>General Updates</strong> — reset by any status change or update logged on this claim.
                </p>
                <p className="mb-2">
                  <strong>Client Communication</strong> — only reset when a "Client Communication" update type is logged. This ensures the client is kept informed at least every 48 hours.
                </p>
                <p>
                  Each tracker can be snoozed independently if tracking needs to be paused temporarily.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}