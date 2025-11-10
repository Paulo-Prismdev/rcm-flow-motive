import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Pause, Edit3 } from 'lucide-react';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import { formatDistanceToNow, isPast } from 'date-fns';

export default function UpdateTrackingSection({ claim, onSetOverride, canEdit }) {
  if (!claim) return null;

  // Don't show for completed/cancelled claims
  const isClosedStatus = ['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status);
  if (isClosedStatus) return null;

  const now = new Date();
  const nextDue = claim.next_update_due_at ? new Date(claim.next_update_due_at) : null;
  const lastUpdate = claim.last_updated_at ? new Date(claim.last_updated_at) : claim.created_date ? new Date(claim.created_date) : now;
  const overrideExpiry = claim.override_expiry_at ? new Date(claim.override_expiry_at) : null;

  const isOverdue = nextDue && isPast(nextDue);
  const hoursRemaining = nextDue ? Math.max(0, (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60)) : 48;

  return (
    <div className="glass-elevated p-4 border-l-4 border-accent">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          <h3 className="font-bold">48-Hour Update Tracking</h3>
        </div>
        <UpdateStatusBadge status={claim.update_status_flag} />
      </div>

      {claim.override_active && overrideExpiry ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 glass-inset p-3 rounded-lg">
            <Pause className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Update tracking paused</p>
              <p className="text-xs text-foreground-muted mt-1">
                <strong>Reason:</strong> {claim.override_reason}
              </p>
              <p className="text-xs text-foreground-muted mt-1">
                <strong>Resumes in:</strong> {formatDistanceToNow(overrideExpiry, { addSuffix: true })}
              </p>
              {claim.override_notes && (
                <p className="text-xs text-foreground-muted mt-1">
                  <strong>Notes:</strong> {claim.override_notes}
                </p>
              )}
            </div>
          </div>
          {canEdit && (
            <Button 
              onClick={onSetOverride}
              className="glass-button px-3 py-1.5 text-xs w-full"
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Modify Override
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground-muted">Last Update:</span>
            <span className="font-medium">{formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
          </div>

          {nextDue && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Next Update Due:</span>
              <span className={`font-medium ${isOverdue ? 'text-red-600' : hoursRemaining < 12 ? 'text-orange-600' : 'text-green-600'}`}>
                {isOverdue ? 'Overdue' : formatDistanceToNow(nextDue, { addSuffix: true })}
              </span>
            </div>
          )}

          {isOverdue && (
            <div className="flex items-start gap-2 glass-inset p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-800 dark:text-red-200">
                This claim requires an update. Please add a note or change the status to update the tracking.
              </p>
            </div>
          )}

          {canEdit && (
            <Button 
              onClick={onSetOverride}
              className="glass-button px-3 py-1.5 text-xs w-full"
            >
              <Pause className="w-3 h-3 mr-2" />
              Pause Tracking (Set Override)
            </Button>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[10px] text-foreground-subtle">
          💡 Tip: Add notes, change status, or update any field to reset the 48-hour timer
        </p>
      </div>
    </div>
  );
}